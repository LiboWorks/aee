import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeatureFlagService {
  constructor(private prisma: PrismaService) {}

  async isEnabled(name: string): Promise<boolean> {
    const flag = await this.prisma.featureFlag.findUnique({ where: { name } });
    return flag?.enabled ?? false;
  }

  async getAll() {
    return this.prisma.featureFlag.findMany({ orderBy: { name: 'asc' } });
  }

  async toggle(name: string, enabled: boolean) {
    return this.prisma.featureFlag.update({
      where: { name },
      data: { enabled },
    });
  }
}
