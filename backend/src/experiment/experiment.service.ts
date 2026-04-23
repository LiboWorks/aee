import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from '../llm/llm.service';
import { ActionLogService } from '../common/action-log.service';
import { experimentEvaluationPrompt } from '../llm/prompts';
import { CreateExperimentDto } from './experiment.dto';

@Injectable()
export class ExperimentService {
  constructor(
    private prisma: PrismaService,
    private llm: LlmService,
    private actionLog: ActionLogService,
  ) {}

  async create(dto: CreateExperimentDto) {
    const execution = await this.prisma.execution.findUnique({ where: { id: dto.executionId } });
    if (!execution) throw new NotFoundException('Execution not found');

    const experiment = await this.prisma.experiment.create({
      data: {
        executionId: dto.executionId,
        durationDays: dto.durationDays,
        budgetAllocation: dto.budgetAllocation,
        kpiTargets: dto.kpiTargets,
        templateName: 'standard-ad-test',
      },
    });

    // Generate simulated daily results
    await this.generateSimulatedResults(experiment.id, dto.durationDays, dto.budgetAllocation, dto.kpiTargets);

    await this.actionLog.log('Experiment', experiment.id, 'created', { durationDays: dto.durationDays });

    return this.findOne(experiment.id);
  }

  private async generateSimulatedResults(
    experimentId: string,
    durationDays: number,
    budget: number,
    kpiTargets: Record<string, number>,
  ) {
    const dailyBudget = budget / durationDays;

    for (let day = 1; day <= durationDays; day++) {
      // Realistic variance simulation
      const impressions = Math.floor(dailyBudget * (8 + Math.random() * 6)); // 8-14 impressions per dollar
      const ctr = (kpiTargets['ctr'] ?? 0.5) * (0.7 + Math.random() * 0.6); // ±30% of target CTR
      const clicks = Math.floor(impressions * (ctr / 100));
      const cvr = (kpiTargets['cvr'] ?? 10) * (0.6 + Math.random() * 0.8); // ±40% of target CVR
      const conversions = Math.floor(clicks * (cvr / 100));
      const spend = dailyBudget * (0.85 + Math.random() * 0.3); // 85-115% of daily budget
      const avgOrderValue = 25 + Math.random() * 20;
      const revenue = conversions * avgOrderValue;

      const metrics = {
        impressions,
        clicks,
        ctr: clicks / Math.max(impressions, 1) * 100,
        conversions,
        cvr: conversions / Math.max(clicks, 1) * 100,
        spend: Math.round(spend * 100) / 100,
        revenue: Math.round(revenue * 100) / 100,
        roi: spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0,
        acos: revenue > 0 ? Math.round((spend / revenue) * 10000) / 100 : 0,
      };

      await this.prisma.experimentResult.create({
        data: {
          experimentId,
          day,
          metrics,
          decision: 'pending',
        },
      });
    }
  }

  async evaluate(experimentId: string) {
    const experiment = await this.prisma.experiment.findUnique({
      where: { id: experimentId },
      include: { results: { orderBy: { day: 'asc' } } },
    });
    if (!experiment) throw new NotFoundException('Experiment not found');

    const results = experiment.results.map((r) => ({
      day: r.day,
      metrics: r.metrics as Record<string, number>,
    }));

    const evaluation = await this.llm.generateJson<{
      overallDecision: string;
      suggestions: string[];
      [key: string]: unknown;
    }>(
      experimentEvaluationPrompt({
        kpiTargets: experiment.kpiTargets as Record<string, number>,
        results,
      }),
    );

    // Update final day result with evaluation
    const lastResult = experiment.results[experiment.results.length - 1];
    if (lastResult) {
      await this.prisma.experimentResult.update({
        where: { id: lastResult.id },
        data: {
          decision: evaluation.overallDecision === 'pass' ? 'pass' : 'fail',
          suggestions: evaluation.suggestions,
        },
      });
    }

    // Mark experiment as completed
    await this.prisma.experiment.update({
      where: { id: experimentId },
      data: { status: 'completed' },
    });

    await this.actionLog.log('Experiment', experimentId, 'evaluated', { decision: evaluation.overallDecision });

    return evaluation;
  }

  async findOne(id: string) {
    return this.prisma.experiment.findUnique({
      where: { id },
      include: { results: { orderBy: { day: 'asc' } }, execution: true },
    });
  }

  async getResults(id: string) {
    return this.prisma.experimentResult.findMany({
      where: { experimentId: id },
      orderBy: { day: 'asc' },
    });
  }
}
