import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActionLogService } from '../common/action-log.service';
import { ScraperService } from './scraper.service';
import { CreateProductDto } from './product.dto';

@Injectable()
export class ProductService {
  constructor(
    private prisma: PrismaService,
    private scraper: ScraperService,
    private actionLog: ActionLogService,
  ) {}

  async create(userId: string, dto: CreateProductDto) {
    const scraped = await this.scraper.scrape(dto.url, dto.currency);

    const product = await this.prisma.product.create({
      data: {
        userId,
        url: dto.url,
        budget: dto.budget,
        riskLevel: dto.riskLevel,
        title: scraped.title,
        price: scraped.price,
        category: scraped.category,
        imageUrls: scraped.imageUrls,
        rawData: scraped.rawData as unknown as Prisma.InputJsonValue,
      },
    });

    await this.actionLog.log('Product', product.id, 'created', { url: dto.url, budget: dto.budget, riskLevel: dto.riskLevel });

    return product;
  }

  async findAllByUser(userId: string) {
    return this.prisma.product.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { strategies: { select: { id: true, viabilityScore: true, createdAt: true } } },
    });
  }

  async findOne(id: string, userId: string) {
    return this.prisma.product.findFirst({
      where: { id, userId },
      include: {
        strategies: {
          include: {
            listingAssets: {
              include: {
                executions: {
                  include: { experiments: true },
                },
              },
            },
          },
        },
      },
    });
  }
}
