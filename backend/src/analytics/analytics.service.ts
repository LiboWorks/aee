import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          strategies: {
            select: {
              id: true,
              viabilityScore: true,
              listingAssets: {
                select: {
                  id: true,
                  status: true,
                  executions: {
                    select: {
                      id: true,
                      phase: true,
                      status: true,
                      experiments: {
                        select: {
                          id: true,
                          status: true,
                          durationDays: true,
                          budgetAllocation: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.product.count({ where: { userId } }),
    ]);

    return { products, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getProductTimeline(productId: string, userId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, userId },
      include: {
        strategies: {
          include: {
            listingAssets: {
              include: {
                executions: {
                  include: {
                    experiments: {
                      include: {
                        results: { orderBy: { day: 'asc' } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!product) return null;

    const actionLogs = await this.prisma.actionLog.findMany({
      where: { entityType: 'Product', entityId: productId },
      orderBy: { createdAt: 'asc' },
    });

    return { product, actionLogs };
  }
}
