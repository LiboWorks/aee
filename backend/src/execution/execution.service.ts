import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActionLogService } from '../common/action-log.service';
import { FeatureFlagService } from '../feature-flag/feature-flag.service';
import { SellerCentralAutomation } from '../automation/seller-central.automation';
import { AmazonSpApiMock } from '../integrations/amazon-sp-api.mock';
import { CreateExecutionDto } from './execution.dto';
import { ExecutionPhase } from '@prisma/client';

@Injectable()
export class ExecutionService {
  constructor(
    private prisma: PrismaService,
    private actionLog: ActionLogService,
    private featureFlags: FeatureFlagService,
    private automation: SellerCentralAutomation,
    private spApi: AmazonSpApiMock,
  ) {}

  async create(dto: CreateExecutionDto) {
    const asset = await this.prisma.listingAsset.findUnique({ where: { id: dto.listingAssetId } });
    if (!asset) throw new NotFoundException('Listing asset not found');
    if (asset.status !== 'approved' && dto.phase !== ExecutionPhase.manual) {
      throw new BadRequestException('Asset must be approved before automated execution');
    }

    // Check feature flags for non-manual phases
    if (dto.phase === ExecutionPhase.automation) {
      const enabled = await this.featureFlags.isEnabled('automation.enabled');
      if (!enabled) throw new BadRequestException('Automation is disabled via feature flag');
    }
    if (dto.phase === ExecutionPhase.api) {
      const enabled = await this.featureFlags.isEnabled('sp-api.enabled');
      if (!enabled) throw new BadRequestException('SP-API integration is disabled via feature flag');
    }

    const execution = await this.prisma.execution.create({
      data: {
        listingAssetId: dto.listingAssetId,
        phase: dto.phase,
        status: 'pending',
      },
    });

    await this.actionLog.log('Execution', execution.id, 'created', { phase: dto.phase });

    return execution;
  }

  async confirm(executionId: string) {
    const execution = await this.prisma.execution.findUnique({
      where: { id: executionId },
      include: { listingAsset: true },
    });
    if (!execution) throw new NotFoundException('Execution not found');
    if (execution.status !== 'pending') {
      throw new BadRequestException('Execution must be in pending status to confirm');
    }

    await this.prisma.execution.update({
      where: { id: executionId },
      data: { status: 'confirmed' },
    });

    await this.actionLog.log('Execution', executionId, 'confirmed', {});

    // Execute based on phase
    return this.execute(execution.id);
  }

  private async execute(executionId: string) {
    const execution = await this.prisma.execution.findUnique({
      where: { id: executionId },
      include: { listingAsset: true },
    });
    if (!execution) throw new NotFoundException('Execution not found');

    await this.prisma.execution.update({
      where: { id: executionId },
      data: { status: 'executing' },
    });

    try {
      let result: Prisma.InputJsonValue;

      switch (execution.phase) {
        case ExecutionPhase.manual:
          result = {
            type: 'manual',
            listing: {
              title: execution.listingAsset.title,
              bulletPoints: execution.listingAsset.bulletPoints as Prisma.InputJsonValue,
              description: execution.listingAsset.description,
              imagePrompts: execution.listingAsset.imagePrompts as Prisma.InputJsonValue,
            },
            instructions: 'Copy the listing data above and manually enter it into Amazon Seller Central.',
          };
          break;

        case ExecutionPhase.automation:
          const automationResult = await this.automation.fillListingForm({
            title: execution.listingAsset.title,
            bulletPoints: execution.listingAsset.bulletPoints as string[],
            description: execution.listingAsset.description,
          });
          result = automationResult as unknown as Prisma.InputJsonValue;
          break;

        case ExecutionPhase.api:
          const apiResult = await this.spApi.submitListing({
            title: execution.listingAsset.title,
            bulletPoints: execution.listingAsset.bulletPoints as string[],
            description: execution.listingAsset.description,
          });
          result = apiResult as unknown as Prisma.InputJsonValue;
          break;

        default:
          result = { error: 'Unknown phase' };
      }

      await this.prisma.execution.update({
        where: { id: executionId },
        data: { status: 'completed', actionLog: result },
      });

      await this.actionLog.log('Execution', executionId, 'completed', result as unknown as Record<string, unknown>);

      return { execution: { ...execution, status: 'completed' }, result };
    } catch (err) {
      const retryCount = execution.retryCount + 1;
      const maxRetries = 3;

      if (retryCount < maxRetries) {
        await this.prisma.execution.update({
          where: { id: executionId },
          data: { retryCount, status: 'pending' },
        });
        await this.actionLog.log('Execution', executionId, 'retry', { retryCount, error: String(err) });
        return { execution: { ...execution, status: 'pending', retryCount }, message: 'Retryable error — execution reset to pending' };
      }

      await this.prisma.execution.update({
        where: { id: executionId },
        data: { status: 'failed', retryCount },
      });
      await this.actionLog.log('Execution', executionId, 'failed', { error: String(err) });
      throw err;
    }
  }

  async rollback(executionId: string) {
    await this.prisma.execution.update({
      where: { id: executionId },
      data: { status: 'rolledback' },
    });
    await this.actionLog.log('Execution', executionId, 'rolledback', {});
    return { message: 'Execution rolled back' };
  }

  async findOne(id: string) {
    return this.prisma.execution.findUnique({
      where: { id },
      include: { listingAsset: true, experiments: true },
    });
  }
}
