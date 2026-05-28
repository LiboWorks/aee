import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { BrowserContext, chromium, Page } from 'playwright';

export interface ScrapedReview {
  title: string;
  body: string;
  rating: number | null;
  author: string | null;
  date: string | null;
  verified: boolean;
}

export interface ScrapedProductRawData extends Record<string, unknown> {
  url: string;
  asin: string | null;
  currency: string;
  brand: string | null;
  rating: number | null;
  reviewCount: number | null;
  bulletPoints: string[];
  description: string | null;
  attributes: Record<string, string>;
  reviews: ScrapedReview[];
  scrapedAt: string;
  source: string;
}

export interface ScrapedProduct {
  title: string;
  price: number | null;
  currency: string;
  category: string | null;
  imageUrls: string[];
  rawData: ScrapedProductRawData;
}

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  async scrape(url: string, currency = 'USD'): Promise<ScrapedProduct> {
    const browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    try {
      const context = await browser.newContext({
        viewport: { width: 1366, height: 900 },
      });

      // Set Amazon's currency preference cookie so prices come back in the desired currency
      const domain = new URL(url).hostname.replace(/^www\./, '.');
      await context.addCookies([
        {
          name: 'i18n-prefs',
          value: currency,
          domain,
          path: '/',
        },
      ]);

      const page = await context.newPage();

      // Forward browser console.log to Node terminal so we can see price updates
      page.on('console', (msg) => {
        if (msg.type() === 'log') this.logger.log(`[browser] ${msg.text()}`);
      });

      await page.goto(url, { waitUntil: 'domcontentloaded' });

      // Map currency code to symbol for waitForFunction check
      const expectedSymbol = this.currencyToSymbol(currency);
      const PRICE_SEL = '#corePrice_feature_div .a-price .a-offscreen';

      // Wait until the price element is rendered and contains the expected currency symbol
      await page.waitForFunction(
        ({ sel, sym }: { sel: string; sym: string }) => {
          const el = document.querySelector(sel);
          if (!el || !el.textContent) return false;
          const text = el.textContent.trim();
          console.log('Checking price element:', text);
          // If we know the symbol, verify it's present; otherwise just check non-empty
          return sym ? text.includes(sym) : text.length > 0;
        },
        { sel: PRICE_SEL, sym: expectedSymbol },
        { timeout: 15_000 },
      ).catch(() => {
        this.logger.warn('Price element did not appear within 15s, continuing with whatever is on page');
      });

      // Read all price elements for logging, then grab the primary one
      const priceData = await page.evaluate((sel: string) => {
        const allOffscreen = document.querySelectorAll(sel);
        const prices: string[] = [];
        allOffscreen.forEach((el, i) => {
          const t = el.textContent?.trim() ?? '';
          prices.push(t);
          console.log(`Price element [${i}]: "${t}"`);
        });

        const primary = allOffscreen[0]?.textContent?.trim() ?? '';
        console.log('Primary price:', primary);
        return { priceText: primary, allPrices: prices };
      }, PRICE_SEL);

      this.logger.log(`All prices on page: ${JSON.stringify(priceData.allPrices)}`);

      const price = this.parseDecimal(priceData.priceText.replace(/[^\d.]/g, ''));

      // Click "Read more" / "See more" to expand all content before extraction
      await this.expandContent(page);

      // Extract all product data from the live DOM in a single evaluate call
      const domData = await page.evaluate(() => {
        const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
        const text = (sel: string) => norm(document.querySelector(sel)?.textContent);
        const firstText = (sels: string[]) => {
          for (const s of sels) {
            const t = text(s);
            if (t) return t;
          }
          return '';
        };
        const cleanText = (el: Element) => {
          const clone = el.cloneNode(true) as Element;
          clone.querySelectorAll('script, style').forEach((s) => s.remove());
          return norm(clone.textContent);
        };
        const stripTrail = (s: string) => s.replace(/\s*(Read|See) (more|less)\s*$/i, '').trim();

        // CAPTCHA check
        const bodyHtml = document.body.innerHTML;
        const isCaptcha =
          bodyHtml.includes('Enter the characters you see below') ||
          bodyHtml.includes('api-services-support@amazon.com') ||
          bodyHtml.includes('Type the characters you see in this image');

        // LD+JSON product data
        let ldName = '';
        let ldCategory = '';
        let ldDescription = '';
        let ldBrandName = '';
        let ldRatingValue = '';
        let ldReviewCount = '';
        let hasLdProduct = false;
        document.querySelectorAll('script[type="application/ld+json"]').forEach((el) => {
          try {
            const raw = JSON.parse(el.textContent || '');
            let product: any = null;
            if (raw?.['@type'] === 'Product') product = raw;
            else if (Array.isArray(raw)) product = raw.find((e: any) => e?.['@type'] === 'Product');
            if (!product) return;
            hasLdProduct = true;
            ldName = norm(product.name);
            ldCategory = norm(product.category);
            ldDescription = norm(product.description);
            if (product.brand && typeof product.brand === 'object') ldBrandName = norm(product.brand.name);
            if (product.aggregateRating && typeof product.aggregateRating === 'object') {
              ldRatingValue = String(product.aggregateRating.ratingValue ?? '');
              ldReviewCount = String(product.aggregateRating.reviewCount ?? '');
            }
          } catch { /* ignore malformed JSON-LD */ }
        });

        // ASIN from hidden input or inline script
        const asinInput = document.querySelector<HTMLInputElement>('input[name="ASIN"]');
        let asinFromDom = asinInput?.value || null;
        if (!asinFromDom) {
          for (const s of Array.from(document.querySelectorAll('script'))) {
            const m = s.textContent?.match(/"asin"\s*:\s*"([A-Z0-9]{10})"/i);
            if (m) { asinFromDom = m[1]; break; }
          }
        }

        // Title
        const title =
          firstText(['#productTitle', 'span#productTitle', '#title span', 'h1.product-title-word-break', 'h1#title']) ||
          ldName ||
          norm(document.querySelector('h1')?.textContent);

        // Category
        const category =
          firstText(['#wayfinding-breadcrumbs_container a', '.a-breadcrumb a', 'a.nav-a.nav-b span.nav-a-content']) ||
          ldCategory;

        // Attributes (strip scripts/styles and "See more/less")
        const attributes: Record<string, string> = {};
        const addAttr = (key: string, value: string) => {
          const k = norm(key).replace(/:$/, '');
          const v = norm(value).replace(/\s*(Read|See) (more|less)\s*$/i, '').trim();
          if (k && v && !attributes[k]) attributes[k] = v;
        };
        document.querySelectorAll(
          '#productDetails_techSpec_section_1 tr, #productDetails_detailBullets_sections1 tr, #productOverview_feature_div tr, #technicalSpecifications_section_1 tr',
        ).forEach((row) => {
          const cells = row.querySelectorAll('th, td');
          if (cells.length < 2) return;
          addAttr(cleanText(cells[0]), cleanText(cells[cells.length - 1]));
        });
        document.querySelectorAll('#detailBullets_feature_div li, #detailBulletsWrapper_feature_div li').forEach((item) => {
          const boldEl = item.querySelector('span.a-text-bold');
          if (boldEl) {
            const label = norm(boldEl.textContent);
            addAttr(label, (item.textContent ?? '').replace(boldEl.textContent ?? '', ''));
            return;
          }
          const t = norm(item.textContent);
          const sep = t.indexOf(':');
          if (sep !== -1) addAttr(t.slice(0, sep), t.slice(sep + 1));
        });

        // Brand
        const brandRaw =
          firstText(['#bylineInfo', '#bylineInfo_feature_div a']) ||
          attributes['Brand'] || attributes['Manufacturer'] || ldBrandName;

        // Rating & review count
        const ratingText =
          firstText(['[data-hook="rating-out-of-text"]', 'i[data-hook="average-star-rating"] span', '#acrPopover .a-size-base.a-color-base']) ||
          ldRatingValue;
        const reviewCountText =
          firstText(['#acrCustomerReviewText', '[data-hook="total-review-count"]']) ||
          ldReviewCount;

        // Bullet points
        const bulletPoints: string[] = [];
        const seenBullets = new Set<string>();
        for (const sel of ['#feature-bullets ul li span.a-list-item', '#feature-bullets li', '#feature-bullets span.a-list-item']) {
          document.querySelectorAll(sel).forEach((el) => {
            const t = norm(el.textContent).replace(/\s*(Read|See) (more|less)\s*$/i, '').trim();
            if (!t || t.length < 6 || seenBullets.has(t)) return;
            seenBullets.add(t);
            bulletPoints.push(t);
          });
          if (bulletPoints.length >= 12) break;
        }

        // Description
        const description = stripTrail(
          firstText(['#productDescription', '#aplus_feature_div', '#bookDescription_feature_div']) ||
          ldDescription,
        );

        // Images
        const imageUrls: string[] = [];
        const seenImgs = new Set<string>();
        const addImage = (src: string) => {
          const n = src.replace(/\._[A-Z]{2}\d+_\./, '.').replace(/\._S[A-Z]\d+_\./, '.');
          if (!n || seenImgs.has(n) || n.includes('sprite') || n.includes('grey-pixel')) return;
          seenImgs.add(n);
          imageUrls.push(n);
        };
        for (const s of Array.from(document.querySelectorAll('script:not([type])'))) {
          const m = s.textContent?.match(/'colorImages'\s*:\s*\{[^}]*'initial'\s*:\s*(\[[\s\S]*?\])\s*\}/);
          if (m) {
            try {
              const imgs = JSON.parse(m[1].replace(/'/g, '"'));
              for (const img of imgs) {
                const src = img.hiRes || img.large || img.main;
                if (src) addImage(src);
              }
            } catch { /* ignore */ }
            break;
          }
        }
        if (imageUrls.length === 0) {
          document.querySelectorAll('#imgTagWrapperId img, #altImages img, #imageBlock img, .imgTagWrapper img').forEach((el) => {
            const imgEl = el as HTMLImageElement;
            const src = imgEl.getAttribute('data-old-hires') || imgEl.getAttribute('data-a-dynamic-image') || imgEl.src;
            if (!src) return;
            if (src.startsWith('{')) {
              try { Object.keys(JSON.parse(src)).forEach((u) => addImage(u)); } catch { /* ignore */ }
              return;
            }
            addImage(src);
          });
        }

        // Reviews from DOM
        const reviews: Array<{
          title: string; body: string; ratingText: string;
          author: string; date: string; verifiedText: string;
        }> = [];
        document.querySelectorAll('[data-hook="review"]').forEach((reviewEl) => {
          const rTitle = stripTrail(norm(reviewEl.querySelector('[data-hook="review-title"]')?.textContent));
          const rBody = stripTrail(norm(reviewEl.querySelector('[data-hook="review-body"]')?.textContent));
          if (!rTitle && !rBody) return;
          reviews.push({
            title: rTitle,
            body: rBody,
            ratingText: norm(
              (reviewEl.querySelector('[data-hook="review-star-rating"]') ||
                reviewEl.querySelector('[data-hook="cmps-review-star-rating"]'))?.textContent,
            ),
            author: norm(reviewEl.querySelector('.a-profile-name')?.textContent),
            date: norm(reviewEl.querySelector('[data-hook="review-date"]')?.textContent),
            verifiedText: norm(reviewEl.querySelector('[data-hook="avp-badge"]')?.textContent),
          });
        });

        return {
          isCaptcha, hasLdProduct, asin: asinFromDom, title, category,
          attributes, brandRaw, ratingText, reviewCountText,
          bulletPoints: bulletPoints.slice(0, 12), description,
          imageUrls, reviews,
        };
      });

      if (domData.isCaptcha) {
        throw new BadGatewayException('Amazon blocked the scrape with CAPTCHA');
      }

      if (!domData.title) {
        throw new BadGatewayException('No product title found on page');
      }

      const asin = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i)?.[1] || domData.asin;
      const title = domData.title;
      const category = domData.category || null;
      const brand = this.normalizeBrand(domData.brandRaw) || null;
      const rating = this.parseDecimal(domData.ratingText);
      const reviewCount = this.parseInteger(domData.reviewCountText);
      const { bulletPoints, description, attributes } = domData;
      const imageUrls = domData.imageUrls;

      const inlineReviews: ScrapedReview[] = domData.reviews.map((r) => ({
        title: r.title,
        body: r.body,
        rating: this.parseDecimal(r.ratingText),
        author: r.author || null,
        date: r.date || null,
        verified: r.verifiedText.toLowerCase().includes('verified'),
      }));

      const paginatedReviews = inlineReviews.length < 10 ? await this.scrapeReviewPages(context, url, asin ?? null) : [];
      const reviews = this.mergeReviews(inlineReviews, paginatedReviews).slice(0, 20);

      this.logger.log(
        `Scraped: "${title.slice(0, 60)}..." price=${currency} ${price} images=${imageUrls.length} bullets=${bulletPoints.length} reviews=${reviews.length}`,
      );

      return {
        title,
        price,
        currency,
        category,
        imageUrls: imageUrls.slice(0, 10),
        rawData: {
          url,
          asin: asin ?? null,
          currency,
          brand,
          rating,
          reviewCount,
          bulletPoints,
          description: description || null,
          attributes,
          reviews,
          scrapedAt: new Date().toISOString(),
          source: domData.hasLdProduct ? 'ld+json+dom+playwright' : 'dom+playwright',
        },
      };
    } catch (err) {
      if (err instanceof BadGatewayException) {
        throw err;
      }

      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Scrape failed: ${message}`);
      throw new BadGatewayException(`Product scrape failed: ${message}`);
    } finally {
      await browser.close();
    }
  }

  private async expandContent(page: Page): Promise<void> {
    await page.evaluate(() => {
      document.querySelectorAll(
        '.a-expander-prompt, [id*="see-more"], [data-action="a-expander-toggle"]',
      ).forEach((el) => {
        if (el instanceof HTMLElement) el.click();
      });
    });
    await page.waitForTimeout(500);
  }

  private normalizeText(text: string | null | undefined): string {
    return (text ?? '').replace(/\s+/g, ' ').trim();
  }

  private normalizeBrand(text: string | null | undefined): string {
    return this.normalizeText(text)
      .replace(/^Brand:\s*/i, '')
      .replace(/^Visit the\s+/i, '')
      .replace(/\s+Store$/i, '')
      .trim();
  }

  private parseDecimal(text: string | null | undefined): number | null {
    const match = this.normalizeText(text).match(/\d+(?:\.\d+)?/);
    if (!match) return null;
    const value = parseFloat(match[0]);
    return Number.isFinite(value) ? value : null;
  }

  private parseInteger(text: string | null | undefined): number | null {
    const match = this.normalizeText(text).match(/[\d,]+/);
    if (!match) return null;
    const value = parseInt(match[0].replace(/,/g, ''), 10);
    return Number.isFinite(value) ? value : null;
  }

  /** Map a currency ISO code to its display symbol for price detection. */
  private currencyToSymbol(code: string): string {
    const map: Record<string, string> = {
      USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥',
      INR: '₹', CAD: 'CA$', AUD: 'A$', MXN: 'MX$', BRL: 'R$',
    };
    return map[code.toUpperCase()] ?? '';
  }

  private async scrapeReviewPages(context: BrowserContext, productUrl: string, asin: string | null): Promise<ScrapedReview[]> {
    if (!asin) return [];

    let origin = 'https://www.amazon.com';
    try {
      origin = new URL(productUrl).origin;
    } catch {
      // keep default origin
    }

    const reviewPage = await context.newPage();
    const reviews: ScrapedReview[] = [];

    try {
      for (let pageNumber = 1; pageNumber <= 2; pageNumber += 1) {
        const reviewsUrl = `${origin}/product-reviews/${asin}/?reviewerType=all_reviews&sortBy=recent&pageNumber=${pageNumber}`;
        const response = await reviewPage.goto(reviewsUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });

        if (!response || !response.ok()) break;

        await reviewPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);

        const pageResult = await reviewPage.evaluate(() => {
          const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
          const html = document.body.innerHTML;
          const isCaptcha =
            html.includes('Enter the characters you see below') ||
            html.includes('api-services-support@amazon.com') ||
            html.includes('Type the characters you see in this image');

          const items: Array<{
            title: string; body: string; ratingText: string;
            author: string; date: string; verifiedText: string;
          }> = [];

          if (!isCaptcha) {
            document.querySelectorAll('[data-hook="review"]').forEach((reviewEl) => {
              const title = norm(reviewEl.querySelector('[data-hook="review-title"]')?.textContent);
              const body = norm(reviewEl.querySelector('[data-hook="review-body"]')?.textContent);
              if (!title && !body) return;
              items.push({
                title,
                body,
                ratingText: norm(
                  (reviewEl.querySelector('[data-hook="review-star-rating"]') ||
                    reviewEl.querySelector('[data-hook="cmps-review-star-rating"]'))?.textContent,
                ),
                author: norm(reviewEl.querySelector('.a-profile-name')?.textContent),
                date: norm(reviewEl.querySelector('[data-hook="review-date"]')?.textContent),
                verifiedText: norm(reviewEl.querySelector('[data-hook="avp-badge"]')?.textContent),
              });
            });
          }

          return { isCaptcha, items };
        });

        if (pageResult.isCaptcha) {
          this.logger.warn('Amazon blocked review page scrape with CAPTCHA');
          break;
        }

        const beforeCount = reviews.length;
        for (const r of pageResult.items) {
          reviews.push({
            title: r.title,
            body: r.body,
            rating: this.parseDecimal(r.ratingText),
            author: r.author || null,
            date: r.date || null,
            verified: r.verifiedText.toLowerCase().includes('verified'),
          });
        }

        if (reviews.length === beforeCount || reviews.length >= 20) break;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Review scrape failed: ${message}`);
    } finally {
      await reviewPage.close();
    }

    return reviews.slice(0, 20);
  }

  private mergeReviews(primary: ScrapedReview[], secondary: ScrapedReview[]): ScrapedReview[] {
    const merged: ScrapedReview[] = [];
    const seen = new Set<string>();

    for (const review of [...primary, ...secondary]) {
      const key = `${review.title}|${review.author}|${review.body.slice(0, 80)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(review);
    }

    return merged;
  }
}