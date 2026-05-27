import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmService } from '../../llm/llm.service';
import { EvidenceItem, InvestigationControls, AgentCoreAgentId } from '../intelligence.types';
import { createId, randomInRange, randomFromList } from '../intelligence.utils';

export interface AgentCoreRunInput {
  agentId: AgentCoreAgentId;
  stepTitle: string;
  query: string;
  market: string;
  controls: InvestigationControls;
}

export interface AgentCoreRunOutput {
  summary: string;
  rawFindings: string[];
  checkedSources: string[];
  charts: Array<{ label: string; value: number }>;
  evidence: EvidenceItem[];
}

interface BedrockStructuredResponse {
  summary: string;
  rawFindings: string[];
  checkedSources: string[];
  chartPoints: Array<{ label: string; value: number }>;
  evidence: Array<{
    title: string;
    summary: string;
    sourceType: 'amazon' | 'tiktok' | 'google' | 'reddit' | 'internal';
    sourceName: string;
    sourceUrl?: string;
    metrics?: Array<{ key: string; value: number; unit?: string }>;
  }>;
}

@Injectable()
export class AgentCoreAdapter {
  private readonly logger = new Logger(AgentCoreAdapter.name);

  constructor(
    private readonly config: ConfigService,
    private readonly llm: LlmService,
  ) {}

  async runAgent(input: AgentCoreRunInput): Promise<AgentCoreRunOutput> {
    const mode = this.config.get<string>('AGENTCORE_MODE', 'mock').trim().toLowerCase();
    if (mode === 'bedrock') {
      try {
        return await this.runWithBedrockPrompting(input);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Bedrock AgentCore mode failed, fallback to mock runtime: ${message}`);
      }
    }

    return this.runWithMockSignals(input);
  }

  private async runWithBedrockPrompting(input: AgentCoreRunInput): Promise<AgentCoreRunOutput> {
    const prompt = [
      'You are operating as one specialist inside a multi-agent Amazon seller intelligence platform for Shenzhen SMB teams.',
      `Agent: ${input.agentId}`,
      `Step: ${input.stepTitle}`,
      `Research query: ${input.query}`,
      `Market: ${input.market}`,
      `Controls: budget=${input.controls.budgetLevel}, smallTeamMode=${input.controls.smallTeamMode}, riskTolerance=${input.controls.riskTolerance}, marketType=${input.controls.marketType}`,
      'Return ONLY strict JSON with keys:',
      '{',
      '  "summary": string,',
      '  "rawFindings": string[],',
      '  "checkedSources": string[],',
      '  "chartPoints": [{"label": string, "value": number}],',
      '  "evidence": [{',
      '    "title": string,',
      '    "summary": string,',
      '    "sourceType": "amazon"|"tiktok"|"google"|"reddit"|"internal",',
      '    "sourceName": string,',
      '    "sourceUrl": string,',
      '    "metrics": [{"key": string, "value": number, "unit": string}]',
      '  }]',
      '}',
      'Keep findings specific and evidence-backed.',
    ].join('\n');

    const structured = await this.llm.generateJson<BedrockStructuredResponse & Record<string, unknown>>(prompt);
    return {
      summary: structured.summary,
      rawFindings: Array.isArray(structured.rawFindings) ? structured.rawFindings : [],
      checkedSources: Array.isArray(structured.checkedSources) ? structured.checkedSources : [],
      charts: Array.isArray(structured.chartPoints)
        ? structured.chartPoints.map((point) => ({
            label: String(point.label),
            value: Number(point.value),
          }))
        : [],
      evidence: Array.isArray(structured.evidence)
        ? structured.evidence.map((item) => ({
            id: createId('evidence'),
            title: item.title,
            summary: item.summary,
            sourceType: item.sourceType,
            sourceName: item.sourceName,
            sourceUrl: item.sourceUrl,
            capturedAt: new Date().toISOString(),
            metrics: Array.isArray(item.metrics)
              ? item.metrics.map((metric) => ({
                  key: metric.key,
                  value: Number(metric.value),
                  unit: metric.unit,
                }))
              : [],
          }))
        : [],
    };
  }

  private runWithMockSignals(input: AgentCoreRunInput): AgentCoreRunOutput {
    const sourcePool = this.getSourcePool(input.agentId);

    const checkedSources = [
      randomFromList(sourcePool),
      randomFromList(sourcePool),
      randomFromList(sourcePool),
    ];

    const chartLabels = ['Week-3', 'Week-2', 'Week-1', 'Now'];
    const baseline = randomInRange(42, 78);
    const charts = chartLabels.map((label, index) => ({
      label,
      value: Number((baseline + index * randomInRange(-2, 5)).toFixed(1)),
    }));

    const evidence: EvidenceItem[] = [
      {
        id: createId('evidence'),
        title: `${input.stepTitle} signal - ${input.market}`,
        summary: `Agent observed directional movement for ${input.query} in ${input.market}.`,
        sourceType: this.mapSourceType(checkedSources[0] ?? 'Amazon Search Suggest'),
        sourceName: checkedSources[0] ?? 'Amazon Search Suggest',
        sourceUrl: this.toSourceUrl(checkedSources[0] ?? 'amazon'),
        capturedAt: new Date().toISOString(),
        metrics: [
          { key: 'signal_strength', value: randomInRange(51, 89), unit: '/100' },
          { key: 'confidence', value: randomInRange(65, 94), unit: '%' },
        ],
      },
      {
        id: createId('evidence'),
        title: `Competitive baseline check`,
        summary: 'Comparable listings were benchmarked to estimate entry friction for a 3-20 person seller team.',
        sourceType: this.mapSourceType(checkedSources[1] ?? 'Amazon Listings'),
        sourceName: checkedSources[1] ?? 'Amazon Listings',
        sourceUrl: this.toSourceUrl(checkedSources[1] ?? 'amazon-listings'),
        capturedAt: new Date().toISOString(),
        metrics: [
          { key: 'entry_friction', value: randomInRange(28, 72), unit: '/100' },
        ],
      },
    ];

    const rawFindings = [
      `${input.query} has accelerating external attention but listing quality remains fragmented.`,
      `Current signal profile suggests a narrow but actionable entry window for Shenzhen SMEs in ${input.market}.`,
      `${input.agentId} flagged decision factors tied to ${input.controls.riskTolerance} risk tolerance settings.`,
    ];

    return {
      summary: `${input.stepTitle} completed with agent evidence from ${checkedSources.join(', ')}.`,
      rawFindings,
      checkedSources,
      charts,
      evidence,
    };
  }

  private getSourcePool(agentId: AgentCoreAgentId): string[] {
    switch (agentId) {
      case 'opportunity-scout':
        return ['Amazon Search Suggest', 'Amazon Best Sellers', 'Category New Releases', 'Keyword Snapshot'];
      case 'competition-analyst':
        return ['Top Listing Review Counts', 'Sponsored Placement Density', 'Seller Concentration Ledger'];
      case 'small-seller-feasibility':
        return ['Landed Cost Model', 'MOQ Supplier Benchmarks', 'Fulfillment Complexity Matrix'];
      case 'risk-detection':
        return ['IP Similarity Watch', 'Price Volatility Monitor', 'Review Velocity Outlier Scan'];
      case 'trend-intelligence':
        return ['TikTok Velocity Signals', 'Google Trends Correlation', 'Reddit Topic Momentum'];
      case 'explainability':
        return ['Reasoning Trace Ledger', 'Evidence Confidence Audit', 'Decision Transparency Graph'];
      case 'monitoring':
        return ['Realtime Price Watch', 'Competitor Listing Watch', 'Market Saturation Tracker'];
      default:
        return ['Internal Research Graph'];
    }
  }

  private mapSourceType(sourceName: string): 'amazon' | 'tiktok' | 'google' | 'reddit' | 'internal' {
    const lower = sourceName.toLowerCase();
    if (lower.includes('tiktok')) return 'tiktok';
    if (lower.includes('google')) return 'google';
    if (lower.includes('reddit')) return 'reddit';
    if (lower.includes('amazon')) return 'amazon';
    return 'internal';
  }

  private toSourceUrl(sourceName: string): string {
    if (sourceName.toLowerCase().includes('tiktok')) return 'https://www.tiktok.com/trending';
    if (sourceName.toLowerCase().includes('google')) return 'https://trends.google.com';
    if (sourceName.toLowerCase().includes('reddit')) return 'https://www.reddit.com';
    return 'https://www.amazon.com';
  }
}
