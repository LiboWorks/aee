import { Injectable, NotFoundException, BadGatewayException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from '../llm/llm.service';
import { ActionLogService } from '../common/action-log.service';
import {
  productViabilityPrompt,
  differentiationStrategyPrompt,
  pricingStrategyPrompt,
  executionPlanPrompt,
} from '../llm/prompts';

@Injectable()
export class StrategyService {
  constructor(
    private prisma: PrismaService,
    private llm: LlmService,
    private actionLog: ActionLogService,
  ) {}

  async generate(productId: string, userId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, userId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const rawData = ((product.rawData as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
    const currency = typeof rawData.currency === 'string' ? rawData.currency : 'USD';
    const marketSignals = {
      brand: typeof rawData.brand === 'string' ? rawData.brand : null,
      rating: typeof rawData.rating === 'number' ? rawData.rating : null,
      reviewCount: typeof rawData.reviewCount === 'number' ? rawData.reviewCount : null,
      bulletPoints: Array.isArray(rawData.bulletPoints)
        ? rawData.bulletPoints.filter((item): item is string => typeof item === 'string').slice(0, 8)
        : [],
      description: typeof rawData.description === 'string' ? rawData.description : null,
      attributes:
        rawData.attributes && typeof rawData.attributes === 'object' && !Array.isArray(rawData.attributes)
          ? rawData.attributes
          : {},
      reviews: Array.isArray(rawData.reviews) ? rawData.reviews.slice(0, 5) : [],
    };

    // Step 1: Viability analysis
    let viability: { viabilityScore: number; marginEstimate: number; competitionLevel: string; [key: string]: unknown };
    let differentiation: Record<string, unknown>;
    let pricing: Record<string, unknown>;
    let execution: Record<string, unknown>;

    try {
      viability = await this.llm.generateJson<{
        viabilityScore: number;
        marginEstimate: number;
        competitionLevel: string;
        [key: string]: unknown;
      }>(
        productViabilityPrompt({
          title: product.title ?? '',
          price: product.price,
          currency,
          category: product.category,
          budget: product.budget,
          riskLevel: product.riskLevel,
          marketSignals,
        }),
      );

      // Step 2: Differentiation
      differentiation = await this.llm.generateJson(
        differentiationStrategyPrompt({
          title: product.title ?? '',
          category: product.category,
          viabilityScore: viability.viabilityScore,
          competitionLevel: viability.competitionLevel,
          budget: product.budget,
          currency,
          riskLevel: product.riskLevel,
          marketSignals,
        }),
      );

      // Step 3: Pricing
      pricing = await this.llm.generateJson(
        pricingStrategyPrompt({
          title: product.title ?? '',
          price: product.price,
          currency,
          category: product.category,
          budget: product.budget,
          riskLevel: product.riskLevel,
          marginEstimate: viability.marginEstimate,
          marketSignals,
        }),
      );

      // Step 4: Execution plan
      execution = await this.llm.generateJson(
        executionPlanPrompt({
          title: product.title ?? '',
          category: product.category,
          budget: product.budget,
          currency,
          riskLevel: product.riskLevel,
          differentiationPlan: differentiation,
          pricingStrategy: pricing,
          marketSignals,
        }),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new BadGatewayException(`LLM service error: ${msg}`);
    }

    const strategy = await this.prisma.strategy.create({
      data: {
        productId,
        viabilityScore: viability.viabilityScore,
        marginEstimate: viability.marginEstimate,
        competitionLevel: viability.competitionLevel,
        differentiationPlan: differentiation as unknown as Prisma.InputJsonValue,
        pricingStrategy: pricing as unknown as Prisma.InputJsonValue,
        executionPlan: execution as unknown as Prisma.InputJsonValue,
        rawLlmResponse: { viability, differentiation, pricing, execution } as unknown as Prisma.InputJsonValue,
      },
    });

    await this.actionLog.log('Strategy', strategy.id, 'generated', {
      productId,
      viabilityScore: viability.viabilityScore,
    });

    return strategy;
  }

  async findOne(id: string) {
    return this.prisma.strategy.findUnique({
      where: { id },
      include: { product: true, listingAssets: true },
    });
  }
}
