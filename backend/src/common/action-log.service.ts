import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ActionLogService {
  constructor(private prisma: PrismaService) {}

  async log(entityType: string, entityId: string, action: string, payload?: Record<string, unknown>) {
    return this.prisma.actionLog.create({
      data: { entityType, entityId, action, payload: (payload ?? Prisma.JsonNull) as Prisma.InputJsonValue },
    });
  }

  async getByEntity(entityType: string, entityId: string) {
    return this.prisma.actionLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
