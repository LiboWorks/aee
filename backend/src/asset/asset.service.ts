import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from '../llm/llm.service';
import { ActionLogService } from '../common/action-log.service';
import { listingGenerationPrompt } from '../llm/prompts';

@Injectable()
export class AssetService {
  constructor(
    private prisma: PrismaService,
    private llm: LlmService,
    private actionLog: ActionLogService,
  ) {}

  async generate(strategyId: string) {
    const strategy = await this.prisma.strategy.findUnique({
      where: { id: strategyId },
      include: { product: true },
    });
    if (!strategy) throw new NotFoundException('Strategy not found');

    const listing = await this.llm.generateJson<{
      title: string;
      bulletPoints: string[];
      description: string;
      imagePrompts: string[];
    }>(
      listingGenerationPrompt({
        title: strategy.product.title ?? '',
        category: strategy.product.category,
        differentiationPlan: (strategy.differentiationPlan as Record<string, unknown>) ?? {},
        pricingStrategy: (strategy.pricingStrategy as Record<string, unknown>) ?? {},
      }),
    );

    const asset = await this.prisma.listingAsset.create({
      data: {
        strategyId,
        title: listing.title,
        bulletPoints: listing.bulletPoints,
        description: listing.description,
        imagePrompts: listing.imagePrompts,
      },
    });

    await this.actionLog.log('ListingAsset', asset.id, 'generated', { strategyId });

    return asset;
  }

  async findOne(id: string) {
    return this.prisma.listingAsset.findUnique({
      where: { id },
      include: { strategy: { include: { product: true } } },
    });
  }

  async approve(id: string) {
    const asset = await this.prisma.listingAsset.update({
      where: { id },
      data: { status: 'approved' },
    });

    await this.actionLog.log('ListingAsset', id, 'approved', {});

    return asset;
  }

  async update(id: string, data: { title?: string; bulletPoints?: string[]; description?: string }) {
    return this.prisma.listingAsset.update({
      where: { id },
      data,
    });
  }
}
