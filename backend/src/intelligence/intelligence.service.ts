import {
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { AskResearchQuestionDto, StartInvestigationDto } from './intelligence.dto';
import {
  AgentActivity,
  AgentDefinition,
  CommandCenterSnapshot,
  CompetitionSurvivalSnapshot,
  CompetitorIntelligenceSnapshot,
  DangerSignal,
  EmergingOpportunity,
  EvidenceItem,
  EvidenceExplorerSnapshot,
  InvestigationControls,
  InvestigationOutcome,
  InvestigationSession,
  InvestigationStep,
  LiveMonitoringSnapshot,
  MonitoringAlert,
  ProductIntelligenceReport,
  ResearchWorkspaceResponse,
  SmallTeamOpportunitySnapshot,
  TrendIntelligenceSnapshot,
  WorkspaceSettingsSnapshot,
} from './intelligence.types';
import {
  agoMinutes,
  classifyTrendStage,
  clampScore,
  createId,
  progressPercent,
  randomFromList,
  randomInRange,
  toPercentDelta,
  weightedScore,
} from './intelligence.utils';
import {
  AGENT_DEFINITIONS,
  INVESTIGATION_STEP_BLUEPRINTS,
  MARKET_POOL,
  RESEARCH_SUMMARY_LIBRARY,
} from './intelligence.constants';
import { AgentCoreAdapter } from './agentcore/agentcore.adapter';
import { IntelligenceRealtimeService } from './intelligence-realtime.service';

@Injectable()
export class IntelligenceService implements OnModuleInit, OnModuleDestroy {
  private readonly investigations = new Map<string, InvestigationSession>();
  private readonly activities: AgentActivity[] = [];
  private readonly opportunities: EmergingOpportunity[] = [];
  private readonly dangerSignals: DangerSignal[] = [];
  private readonly monitoringAlerts: MonitoringAlert[] = [];
  private readonly processingInvestigations = new Set<string>();
  private heartbeat: NodeJS.Timeout | null = null;

  constructor(
    private readonly agentCore: AgentCoreAdapter,
    private readonly realtime: IntelligenceRealtimeService,
  ) {
    this.seedInitialState();
    this.realtime.setSnapshotProvider(() => ({
      activities: this.activities.slice(0, 8),
      monitoringAlerts: this.monitoringAlerts.slice(0, 8),
      activeInvestigations: this.listActiveInvestigations(),
      generatedAt: new Date().toISOString(),
    }));
  }

  onModuleInit(): void {
    this.heartbeat = setInterval(() => {
      void this.runtimeTick();
    }, 10000);
  }

  onModuleDestroy(): void {
    if (this.heartbeat) {
      clearInterval(this.heartbeat);
      this.heartbeat = null;
    }
  }

  getCommandCenter(userId: string): CommandCenterSnapshot {
    return {
      generatedAt: new Date().toISOString(),
      agents: AGENT_DEFINITIONS,
      activeInvestigations: this.listInvestigationsForUser(userId).map((session) => ({
        id: session.id,
        query: session.query,
        progressPercent: this.getInvestigationProgress(session),
        status: session.status,
      })),
      liveActivityFeed: this.activities.slice(0, 18),
      emergingOpportunities: this.opportunities.slice(0, 6),
      dangerZone: this.dangerSignals.slice(0, 6),
      aiResearchSummary: this.buildAiResearchSummary(),
      activeMonitoringAlerts: this.monitoringAlerts.slice(0, 8),
      quickInvestigationActions: [
        { id: 'investigate-niche', label: 'Investigate Niche', prompt: 'Investigate niche' },
        { id: 'scan-market', label: 'Scan Market', prompt: 'Scan market' },
        { id: 'analyze-competitor', label: 'Analyze Competitor', prompt: 'Analyze competitor' },
        {
          id: 'find-low-competition',
          label: 'Find Low-Competition Opportunities',
          prompt: 'Find low-competition opportunities',
        },
        { id: 'detect-early-trends', label: 'Detect Early Trends', prompt: 'Detect early trends' },
      ],
    };
  }

  async startInvestigation(userId: string, dto: StartInvestigationDto): Promise<InvestigationSession> {
    const now = new Date().toISOString();
    const controls = this.resolveControls(dto);

    const steps: InvestigationStep[] = INVESTIGATION_STEP_BLUEPRINTS.map((blueprint, index) => ({
      id: createId('step'),
      order: index + 1,
      title: blueprint.title,
      agentId: blueprint.agentId,
      status: index === 0 ? 'running' : 'pending',
      checkedSources: [],
      summary: index === 0 ? 'Initializing agent checks...' : 'Waiting for previous steps',
      rawFindings: [],
      evidence: [],
      charts: [],
      startedAt: index === 0 ? now : undefined,
    }));

    const session: InvestigationSession = {
      id: createId('investigation'),
      userId,
      query: dto.query,
      createdAt: now,
      updatedAt: now,
      status: 'running',
      controls,
      steps,
      outcome: null,
    };

    this.investigations.set(session.id, session);

    this.realtime.broadcast({
      type: 'investigation.progress',
      emittedAt: new Date().toISOString(),
      payload: session,
    });

    this.activities.unshift({
      id: createId('activity'),
      timestamp: now,
      agentId: 'monitoring',
      agentName: 'Monitoring Agent',
      severity: 'info',
      headline: `Investigation started: ${dto.query}`,
      details: 'Multi-agent workflow initialized and evidence gathering has started.',
      market: controls.marketType,
      checkedSources: ['Internal Research Queue'],
      conclusion: 'Agents queued and progressing.',
      evidence: [],
    });
    this.trimState();

    void this.advanceInvestigation(session.id);

    return session;
  }

  getInvestigation(userId: string, investigationId: string): InvestigationSession {
    const session = this.investigations.get(investigationId);
    if (!session || session.userId !== userId) {
      throw new NotFoundException('Investigation not found');
    }
    return session;
  }

  getProductIntelligenceReport(userId: string, investigationId: string): ProductIntelligenceReport {
    const session = this.getInvestigation(userId, investigationId);
    const outcome = session.outcome ?? this.generateFallbackOutcome(session);
    const evidence = session.steps.flatMap((step) => step.evidence).slice(0, 16);

    const topSellers = [
      { sellerName: 'PrimeNest Labs', dominanceScore: 82, reviewBarrier: 78, ppcIntensity: 76 },
      { sellerName: 'UrbanEdge Brands', dominanceScore: 61, reviewBarrier: 58, ppcIntensity: 69 },
      { sellerName: 'NichePath Home', dominanceScore: 47, reviewBarrier: 43, ppcIntensity: 52 },
    ];

    return {
      generatedAt: new Date().toISOString(),
      investigationId: session.id,
      productName: session.query,
      executiveSummary: {
        marketPotential: `Opportunity score ${outcome.opportunityScore}/100 with improving external trend momentum.`,
        survivability: `Survivability ${outcome.survivability}/100 for Shenzhen teams with ${session.controls.budgetLevel} budget mode.`,
        riskLevel: `Risk score ${outcome.riskScore}/100 with major concern around early PPC inflation.`,
        smallTeamFeasibility: `Small-team suitability ${outcome.smallTeamSuitability}/100 under ${session.controls.riskTolerance} risk profile.`,
      },
      aiReasoning: [
        'Seller concentration is moderate, so fragmented segments are still accessible to focused small teams.',
        'Review domination remains uneven, enabling differentiated listings to gain traction without massive ad spend.',
        'External trend acceleration supports near-term demand expansion but requires monitoring for sudden saturation.',
      ],
      evidenceExplorer: evidence,
      competitionBreakdown: {
        topSellers,
        saturationScore: clampScore(topSellers.reduce((acc, seller) => acc + seller.dominanceScore, 0) / topSellers.length),
      },
      smallTeamSurvival: {
        startupBudgetPressure: clampScore(48 + (session.controls.budgetLevel === 'lean' ? 14 : 3)),
        inventoryPressure: clampScore(42 + randomInRange(8, 22)),
        logisticsComplexity: clampScore(40 + randomInRange(6, 20)),
        operationalBurden: clampScore(45 + randomInRange(4, 18)),
        expectedDifficulty: outcome.entryDifficulty,
      },
      riskIntelligence: outcome.warnings,
      recommendedStrategy: outcome.recommendedStrategy,
    };
  }

  getCompetitionSurvivalSnapshot(): CompetitionSurvivalSnapshot {
    return {
      sellerConcentrationMap: [
        { segment: 'Top 10 sellers', concentration: 67 },
        { segment: 'Top 25 sellers', concentration: 83 },
        { segment: 'Long tail sellers', concentration: 17 },
      ],
      marketHeatmap: MARKET_POOL.map((market) => ({ market, heat: clampScore(randomInRange(36, 89)) })),
      reviewDomination: [
        { competitor: 'PrimeNest Labs', dominationScore: 82 },
        { competitor: 'UrbanEdge Brands', dominationScore: 69 },
        { competitor: 'Peakory', dominationScore: 54 },
      ],
      priceWarSignals: MARKET_POOL.map((market) => ({
        market,
        intensity: clampScore(randomInRange(28, 84)),
      })),
      ppcEscalationSignals: MARKET_POOL.map((market) => ({
        market,
        intensity: clampScore(randomInRange(31, 87)),
      })),
      survivalProbability: clampScore(randomInRange(44, 79)),
      difficultyIndex: clampScore(randomInRange(39, 83)),
    };
  }

  getSmallTeamOpportunitySnapshot(): SmallTeamOpportunitySnapshot {
    const opportunities = this.opportunities.slice(0, 8).map((opportunity) => ({
      id: opportunity.id,
      productName: opportunity.productName,
      startupCostEstimate: clampScore(18 + opportunity.competitionScore * 0.6),
      ppcDependency: opportunity.competitionScore,
      inventoryComplexity: clampScore(32 + randomInRange(8, 30)),
      reviewBarrier: opportunity.competitionScore,
      operationalComplexity: clampScore(35 + randomInRange(6, 33)),
      fitReason: `Fits lean teams because ${opportunity.whyThisMatters.toLowerCase()}`,
    }));

    return {
      generatedAt: new Date().toISOString(),
      filtersApplied: [
        'low startup cost',
        'low PPC dependency',
        'manageable inventory',
        'lower review barriers',
        'low operational complexity',
      ],
      opportunities,
    };
  }

  getTrendIntelligenceSnapshot(): TrendIntelligenceSnapshot {
    const trendSignals = ['W-5', 'W-4', 'W-3', 'W-2', 'W-1', 'Now'].map((period, index) => ({
      period,
      tiktokVelocity: clampScore(41 + index * randomInRange(4, 11)),
      googleIndex: clampScore(45 + index * randomInRange(3, 10)),
      redditVelocity: clampScore(32 + index * randomInRange(4, 12)),
      amazonSearchAcceleration: clampScore(39 + index * randomInRange(5, 13)),
    }));

    return {
      generatedAt: new Date().toISOString(),
      trendSignals,
      stageSignals: MARKET_POOL.map((market) => {
        const score = clampScore(randomInRange(22, 88));
        return {
          market,
          stage: classifyTrendStage(score),
          confidence: clampScore(58 + randomInRange(4, 36)),
        };
      }),
    };
  }

  getLiveMonitoringSnapshot(): LiveMonitoringSnapshot {
    return {
      generatedAt: new Date().toISOString(),
      trackedProducts: this.opportunities.slice(0, 5).map((opportunity) => ({
        id: opportunity.id,
        label: opportunity.productName,
        currentStatus: opportunity.opportunityScore > 72 ? 'Opportunity expanding' : 'Needs watch',
      })),
      trackedCompetitors: [
        { id: 'comp_1', name: 'PrimeNest Labs', status: 'Aggressive listing expansion' },
        { id: 'comp_2', name: 'UrbanEdge Brands', status: 'PPC spending increased' },
        { id: 'comp_3', name: 'Peakory', status: 'Price undercut campaign detected' },
      ],
      trackedNiches: MARKET_POOL.slice(0, 5).map((market, index) => ({
        id: `niche_${index + 1}`,
        name: market,
        status: index % 2 === 0 ? 'Stable with upside' : 'Volatile this week',
      })),
      alerts: this.monitoringAlerts.slice(0, 12),
    };
  }

  getCompetitorIntelligenceSnapshot(): CompetitorIntelligenceSnapshot {
    const moveTypes: CompetitorIntelligenceSnapshot['competitorMoves'][number]['type'][] = [
      'new-listing',
      'price-change',
      'review-growth',
      'listing-optimization',
      'sales-shift',
      'launch-velocity',
    ];

    return {
      generatedAt: new Date().toISOString(),
      competitorMoves: new Array(8).fill(null).map((_, index) => {
        const type = randomFromList(moveTypes);
        return {
          competitor: randomFromList(['PrimeNest Labs', 'UrbanEdge Brands', 'Peakory', 'VistaShine', 'Smarloft']),
          type,
          details: this.competitorMoveDetails(type),
          impact: randomFromList([
            'Could compress margin by 3-6%',
            'Likely to increase CPC pressure next 10 days',
            'May trigger review competition acceleration',
            'Signals strategic repositioning in sub-niche',
          ]),
          detectedAt: agoMinutes((index + 1) * 35),
        };
      }),
    };
  }

  async askResearchQuestion(dto: AskResearchQuestionDto): Promise<ResearchWorkspaceResponse> {
    const evidence = this.getEvidenceExplorerSnapshot().evidence.slice(0, 8);
    const questionLower = dto.question.toLowerCase();
    const questionFocus = questionLower.includes('risk')
      ? 'risk containment'
      : questionLower.includes('small') || questionLower.includes('team')
        ? 'small-team feasibility'
        : questionLower.includes('trend')
          ? 'trend acceleration'
          : 'opportunity prioritization';

    const confidence = clampScore(randomInRange(68, 92));

    return {
      question: dto.question,
      workflow: [
        'Clarified objective and risk constraints for a Shenzhen SMB team.',
        'Triggered opportunity, competition, trend, and risk specialists in sequence.',
        'Cross-validated evidence against historical market shift patterns.',
        'Synthesized explainability notes and action plan.',
      ],
      evidence,
      answer: `Investigation indicates ${questionFocus} is the dominant decision axis right now. The platform recommends prioritizing markets with moderate growth acceleration, fragmented review concentration, and controllable PPC intensity.`,
      confidence,
      nextActions: [
        'Start a focused investigation on the top 2 candidate niches.',
        'Enable high-sensitivity monitoring alerts for review spikes and CPC jumps.',
        'Validate sourcing and logistics assumptions before committing launch budget.',
      ],
    };
  }

  getEvidenceExplorerSnapshot(): EvidenceExplorerSnapshot {
    const investigationEvidence = this.listInvestigationsForAllUsers()
      .flatMap((session) => session.steps)
      .flatMap((step) => step.evidence);

    const evidence = [...investigationEvidence, ...this.activities.flatMap((activity) => activity.evidence)].slice(0, 24);

    return {
      generatedAt: new Date().toISOString(),
      sourceCatalog: [
        { sourceName: 'Amazon Listings', sourceType: 'amazon', reliabilityScore: 88 },
        { sourceName: 'Amazon Sponsored Placements', sourceType: 'amazon', reliabilityScore: 82 },
        { sourceName: 'TikTok Velocity Signals', sourceType: 'tiktok', reliabilityScore: 69 },
        { sourceName: 'Google Trends', sourceType: 'google', reliabilityScore: 85 },
        { sourceName: 'Reddit Topic Momentum', sourceType: 'reddit', reliabilityScore: 64 },
      ],
      evidence,
      comparisons: [
        { label: 'Average PPC pressure', baseline: 58, current: 67 },
        { label: 'Review acceleration index', baseline: 46, current: 62 },
        { label: 'Search growth velocity', baseline: 52, current: 71 },
      ],
    };
  }

  getWorkspaceSettingsSnapshot(): WorkspaceSettingsSnapshot {
    return {
      teamProfile: {
        targetTeamSize: '3-20 people',
        operatingModel: 'Shenzhen cross-border Amazon operations',
        defaultBudgetRange: 'CNY 80,000 - 500,000',
      },
      agentPreferences: AGENT_DEFINITIONS.map((agent: AgentDefinition) => ({
        agentId: agent.id,
        enabled: true,
        cadence: agent.id === 'monitoring' ? 'continuous' : 'daily',
      })),
      watchlistSettings: [
        { watchType: 'seller flooding alert', threshold: '>18% week-over-week seller increase' },
        { watchType: 'price war alert', threshold: '>10% median price drop in 7 days' },
        { watchType: 'review spike alert', threshold: '>30% review velocity increase in 5 days' },
      ],
    };
  }

  private async runtimeTick(): Promise<void> {
    this.generateAmbientActivity();
    this.generateMonitoringAlert();

    const runningInvestigations = this.listInvestigationsForAllUsers().filter((session) => session.status === 'running');
    await Promise.all(runningInvestigations.map((session) => this.advanceInvestigation(session.id)));
  }

  private async advanceInvestigation(investigationId: string): Promise<void> {
    if (this.processingInvestigations.has(investigationId)) {
      return;
    }

    const session = this.investigations.get(investigationId);
    if (!session || session.status === 'completed') {
      return;
    }

    this.processingInvestigations.add(investigationId);
    try {
      const runningStep = session.steps.find((step) => step.status === 'running');
      if (!runningStep) {
        this.startNextPendingStep(session);
        return;
      }

      const result = await this.agentCore.runAgent({
        agentId: runningStep.agentId,
        stepTitle: runningStep.title,
        query: session.query,
        market: session.controls.marketType,
        controls: session.controls,
      });

      const now = new Date().toISOString();
      runningStep.checkedSources = result.checkedSources;
      runningStep.summary = result.summary;
      runningStep.rawFindings = result.rawFindings;
      runningStep.evidence = result.evidence;
      runningStep.charts = result.charts;
      runningStep.completedAt = now;
      runningStep.status =
        runningStep.agentId === 'risk-detection' && randomInRange(0, 100) > 74 ? 'warning' : 'completed';

      session.updatedAt = now;

      this.activities.unshift({
        id: createId('activity'),
        timestamp: now,
        agentId: runningStep.agentId,
        agentName: this.agentName(runningStep.agentId),
        severity: runningStep.status === 'warning' ? 'warning' : 'info',
        headline: `${this.agentName(runningStep.agentId)} finished: ${runningStep.title}`,
        details: runningStep.summary,
        market: session.controls.marketType,
        checkedSources: runningStep.checkedSources,
        conclusion: runningStep.rawFindings[0] ?? 'Evidence updated',
        evidence: runningStep.evidence,
      });

      if (runningStep.status === 'warning') {
        this.dangerSignals.unshift({
          id: createId('danger'),
          detectedAt: now,
          market: session.controls.marketType,
          title: `Risk flag: ${runningStep.title}`,
          severity: 'warning',
          details: runningStep.rawFindings[0] ?? 'Potential instability detected.',
          impact: 'Could increase launch uncertainty and reduce margin resilience.',
          recommendation: 'Run deeper risk verification before committing full budget.',
        });
      }

      this.realtime.broadcast({
        type: 'activity.update',
        emittedAt: now,
        payload: this.activities[0],
      });

      this.startNextPendingStep(session);

      if (session.outcome) {
        this.realtime.broadcast({
          type: 'investigation.completed',
          emittedAt: now,
          payload: session,
        });
      } else {
        this.realtime.broadcast({
          type: 'investigation.progress',
          emittedAt: now,
          payload: session,
        });
      }

      this.trimState();
    } finally {
      this.processingInvestigations.delete(investigationId);
    }
  }

  private startNextPendingStep(session: InvestigationSession): void {
    const nextStep = session.steps.find((step) => step.status === 'pending');
    if (!nextStep) {
      session.status = 'completed';
      session.outcome = this.buildOutcomeFromSession(session);
      session.updatedAt = new Date().toISOString();
      this.injectOpportunityFromOutcome(session);
      return;
    }

    nextStep.status = 'running';
    nextStep.startedAt = new Date().toISOString();
    nextStep.summary = 'Gathering evidence and cross-checking market signals...';
    session.updatedAt = new Date().toISOString();
  }

  private buildOutcomeFromSession(session: InvestigationSession): InvestigationOutcome {
    const stepValue = (titleFragment: string): number => {
      const step = session.steps.find((item) => item.title.toLowerCase().includes(titleFragment));
      if (!step || step.charts.length === 0) return 50;
      const average = step.charts.reduce((acc, chart) => acc + chart.value, 0) / step.charts.length;
      return clampScore(average);
    };

    const searchGrowth = stepValue('search growth');
    const reviewCompetition = stepValue('review competition');
    const sellerConcentration = stepValue('seller concentration');
    const pricingStability = stepValue('pricing stability');
    const ppcIntensity = stepValue('ppc intensity');
    const trendAcceleration = stepValue('trend acceleration');
    const seasonalInstability = stepValue('seasonal instability');
    const teamFeasibility = stepValue('small-team feasibility');

    const opportunityScore = weightedScore([
      { value: searchGrowth, weight: 0.3 },
      { value: trendAcceleration, weight: 0.3 },
      { value: 100 - sellerConcentration, weight: 0.2 },
      { value: teamFeasibility, weight: 0.2 },
    ]);

    const riskScore = weightedScore([
      { value: reviewCompetition, weight: 0.23 },
      { value: sellerConcentration, weight: 0.2 },
      { value: 100 - pricingStability, weight: 0.19 },
      { value: ppcIntensity, weight: 0.19 },
      { value: seasonalInstability, weight: 0.19 },
    ]);

    const entryDifficulty = weightedScore([
      { value: reviewCompetition, weight: 0.3 },
      { value: ppcIntensity, weight: 0.25 },
      { value: sellerConcentration, weight: 0.2 },
      { value: 100 - teamFeasibility, weight: 0.25 },
    ]);

    const smallTeamSuitability = weightedScore([
      { value: teamFeasibility, weight: 0.35 },
      { value: 100 - ppcIntensity, weight: 0.25 },
      { value: 100 - reviewCompetition, weight: 0.2 },
      { value: pricingStability, weight: 0.2 },
    ]);

    const survivability = weightedScore([
      { value: opportunityScore, weight: 0.35 },
      { value: smallTeamSuitability, weight: 0.25 },
      { value: 100 - riskScore, weight: 0.4 },
    ]);

    const warningSteps = session.steps.filter((step) => step.status === 'warning');

    return {
      opportunityScore,
      riskScore,
      entryDifficulty,
      smallTeamSuitability,
      survivability,
      recommendedStrategy: [
        'Prioritize sub-keywords with fragmented review concentration before broad keyword expansion.',
        'Start with moderate PPC testing and reserve budget for conversion-focused listing upgrades.',
        'Bundle with accessory SKUs to defend margin against price war pressure.',
      ],
      warnings: warningSteps.length
        ? warningSteps.map((step) => `${step.title}: ${step.rawFindings[0] ?? 'potential risk detected'}`)
        : ['No major red flags in this cycle, but monitor review velocity weekly.'],
      nextSteps: [
        'Track top 5 competitors with monitoring alerts enabled.',
        'Validate MOQ and landed-cost assumptions before inventory commitment.',
        'Run 14-day micro-launch test to verify conversion resilience.',
      ],
      explainabilitySummary:
        'The recommendation blends trend momentum, market crowding, pricing stability, and small-team execution burden to reduce false positives.',
    };
  }

  private generateFallbackOutcome(session: InvestigationSession): InvestigationOutcome {
    return {
      opportunityScore: 62,
      riskScore: 44,
      entryDifficulty: 51,
      smallTeamSuitability: 68,
      survivability: 64,
      recommendedStrategy: [
        'Focus on one micro-segment before broad category expansion.',
        'Use evidence-driven listing iteration every 7 days.',
      ],
      warnings: ['Data is still partial; continue monitoring for at least one full trend cycle.'],
      nextSteps: ['Continue investigation workflow until all agents complete.'],
      explainabilitySummary: `Fallback outcome used while investigation is still running for ${session.query}.`,
    };
  }

  private generateAmbientActivity(): void {
    const agent = randomFromList(AGENT_DEFINITIONS);
    const severity = randomInRange(0, 100) > 84 ? 'warning' : 'info';
    const market = randomFromList(MARKET_POOL);
    const now = new Date().toISOString();

    const activity: AgentActivity = {
      id: createId('activity'),
      timestamp: now,
      agentId: agent.id,
      agentName: agent.name,
      severity,
      headline: `${agent.name} detected movement in ${market}`,
      details: `Autonomous scan updated ${agent.outcomeFocus.toLowerCase()} for Shenzhen seller teams.`,
      market,
      checkedSources: ['Amazon Listings', 'Google Trends', 'TikTok Velocity Signals'],
      conclusion: randomFromList([
        'Early growth signal strengthened in the past 48 hours.',
        'Seller saturation increased but niche entry window still exists.',
        'Risk profile is stable with moderate PPC pressure.',
      ]),
      evidence: [
        {
          id: createId('evidence'),
          title: 'Ambient signal checkpoint',
          summary: 'Continuous market monitoring produced a new directional update.',
          sourceType: 'internal',
          sourceName: 'Monitoring Graph',
          sourceUrl: 'https://www.amazon.com',
          capturedAt: now,
          metrics: [
            { key: 'momentum', value: randomInRange(48, 88), unit: '/100' },
            { key: 'confidence', value: randomInRange(61, 94), unit: '%' },
          ],
        },
      ],
    };

    this.activities.unshift(activity);
    this.realtime.broadcast({
      type: 'activity.update',
      emittedAt: now,
      payload: activity,
    });
  }

  private generateMonitoringAlert(): void {
    if (randomInRange(0, 100) < 55) {
      return;
    }

    const alert: MonitoringAlert = {
      id: createId('alert'),
      detectedAt: new Date().toISOString(),
      market: randomFromList(MARKET_POOL),
      alertType: randomFromList([
        'seller-flooding',
        'pricing-shift',
        'review-spike',
        'new-competitor',
        'margin-deterioration',
        'trend-acceleration',
      ]),
      severity: randomInRange(0, 100) > 78 ? 'critical' : 'warning',
      headline: randomFromList([
        'Seller count jumped unexpectedly in tracked niche',
        'Median price dropped in 48 hours',
        'Review velocity outlier detected',
        'New competitor launched multiple variants',
      ]),
      details: 'Monitoring Agent detected a material shift requiring operator review.',
      changePercent: Number(randomInRange(7, 38).toFixed(1)),
      recommendedAction: 'Open investigation workspace and validate competitive assumptions immediately.',
    };

    this.monitoringAlerts.unshift(alert);

    if (alert.severity === 'critical') {
      this.dangerSignals.unshift({
        id: createId('danger'),
        detectedAt: alert.detectedAt,
        market: alert.market,
        title: alert.headline,
        severity: 'critical',
        details: alert.details,
        impact: 'Immediate profitability and survivability pressure',
        recommendation: alert.recommendedAction,
      });
    }

    this.realtime.broadcast({
      type: 'monitoring.alert',
      emittedAt: new Date().toISOString(),
      payload: alert,
    });
  }

  private resolveControls(dto: StartInvestigationDto): InvestigationControls {
    return {
      category: dto.category?.trim() || 'General Marketplace',
      budgetLevel: dto.budgetLevel ?? 'balanced',
      smallTeamMode: dto.smallTeamMode ?? true,
      riskTolerance: dto.riskTolerance ?? 'balanced',
      marketType: dto.marketType ?? 'amazon-us',
    };
  }

  private buildAiResearchSummary(): string[] {
    const investigationHighlights = this.listInvestigationsForAllUsers()
      .filter((session) => session.status === 'completed' && session.outcome)
      .slice(0, 2)
      .map((session) => {
        const outcome = session.outcome as InvestigationOutcome;
        return `${session.query}: opportunity ${outcome.opportunityScore}/100, risk ${outcome.riskScore}/100, survivability ${outcome.survivability}/100.`;
      });

    const staticHighlights = RESEARCH_SUMMARY_LIBRARY.slice(0, 3);
    return [...investigationHighlights, ...staticHighlights].slice(0, 5);
  }

  private seedInitialState(): void {
    this.opportunities.push(
      {
        id: createId('opp'),
        productName: 'Collapsible Pet Ramp Mat',
        category: 'Pet Mobility',
        imageUrl: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=600&q=80',
        growthAcceleration: 78,
        opportunityScore: 84,
        competitionScore: 42,
        smallTeamFriendliness: 81,
        estimatedMargin: 33,
        whyThisMatters: 'Review concentration is fragmented and conversion keywords are still underserved.',
        whyEarlyStage: 'External trend momentum increased before major seller flooding started.',
      },
      {
        id: createId('opp'),
        productName: 'Magnetic Cable Dock Station',
        category: 'Home Office',
        imageUrl: 'https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=600&q=80',
        growthAcceleration: 71,
        opportunityScore: 77,
        competitionScore: 48,
        smallTeamFriendliness: 74,
        estimatedMargin: 29,
        whyThisMatters: 'Price stability remains healthy with low review monopoly in long-tail subsegments.',
        whyEarlyStage: 'Google and TikTok signals are rising faster than listing saturation.',
      },
      {
        id: createId('opp'),
        productName: 'Travel Bottle Drying Rack',
        category: 'Baby Feeding',
        imageUrl: 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=600&q=80',
        growthAcceleration: 69,
        opportunityScore: 73,
        competitionScore: 39,
        smallTeamFriendliness: 79,
        estimatedMargin: 31,
        whyThisMatters: 'Keyword growth is outpacing ad competition and sellers are still fragmented.',
        whyEarlyStage: 'Review growth indicates demand is scaling before dominance consolidates.',
      },
    );

    this.activities.push({
      id: createId('activity'),
      timestamp: agoMinutes(15),
      agentId: 'opportunity-scout',
      agentName: 'Opportunity Scout Agent',
      severity: 'info',
      headline: 'Detected rising kitchen prep niche with fragmented sellers',
      details: 'Search growth and external trend signals moved up for 3 consecutive windows.',
      market: 'US Kitchen Accessories',
      checkedSources: ['Amazon Search Suggest', 'Google Trends', 'TikTok Velocity Signals'],
      conclusion: 'Early-stage demand acceleration detected ahead of competitor concentration.',
      evidence: [],
    });

    this.activities.push({
      id: createId('activity'),
      timestamp: agoMinutes(9),
      agentId: 'competition-analyst',
      agentName: 'Competition Analyst Agent',
      severity: 'warning',
      headline: 'PPC pressure increasing in portable blender market',
      details: 'Sponsored placement density increased while bid floors climbed.',
      market: 'US Kitchen Accessories',
      checkedSources: ['Sponsored Placement Density', 'Top Listing Review Counts'],
      conclusion: 'Market may be turning red ocean for lean teams.',
      evidence: [],
    });

    this.monitoringAlerts.push({
      id: createId('alert'),
      detectedAt: agoMinutes(8),
      market: 'US Kitchen Accessories',
      alertType: 'margin-deterioration',
      severity: 'critical',
      headline: 'Margin compression detected across top listings',
      details: 'Median selling price dropped while CPC climbed.',
      changePercent: toPercentDelta(1.52, 1.92),
      recommendedAction: 'Pause aggressive ad spend and evaluate bundle strategy.',
    });

    this.dangerSignals.push({
      id: createId('danger'),
      detectedAt: agoMinutes(8),
      market: 'US Kitchen Accessories',
      title: 'Margin collapse risk in portable blender segment',
      severity: 'critical',
      details: 'Price competition accelerated faster than conversion gains.',
      impact: 'High chance of profitability collapse for small teams.',
      recommendation: 'Avoid immediate entry and monitor for stabilization.',
    });

    this.trimState();
  }

  private injectOpportunityFromOutcome(session: InvestigationSession): void {
    const outcome = session.outcome;
    if (!outcome) return;

    this.opportunities.unshift({
      id: createId('opp'),
      productName: session.query,
      category: session.controls.category,
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
      growthAcceleration: clampScore(outcome.opportunityScore + randomInRange(-8, 10)),
      opportunityScore: outcome.opportunityScore,
      competitionScore: clampScore(outcome.entryDifficulty),
      smallTeamFriendliness: outcome.smallTeamSuitability,
      estimatedMargin: clampScore(24 + (outcome.opportunityScore - outcome.riskScore) * 0.35, 8, 55),
      whyThisMatters: 'Completed multi-agent investigation found a credible entry window for lean operators.',
      whyEarlyStage: 'Trend and competition signals indicate the market is not fully saturated yet.',
    });
  }

  private listInvestigationsForUser(userId: string): InvestigationSession[] {
    return this.listInvestigationsForAllUsers().filter((session) => session.userId === userId);
  }

  private listInvestigationsForAllUsers(): InvestigationSession[] {
    return Array.from(this.investigations.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private listActiveInvestigations(): Array<{ id: string; query: string; progressPercent: number; status: string }> {
    return this.listInvestigationsForAllUsers()
      .slice(0, 12)
      .map((session) => ({
        id: session.id,
        query: session.query,
        progressPercent: this.getInvestigationProgress(session),
        status: session.status,
      }));
  }

  private getInvestigationProgress(session: InvestigationSession): number {
    const completed = session.steps.filter((step) => step.status === 'completed' || step.status === 'warning').length;
    return progressPercent(completed, session.steps.length);
  }

  private agentName(agentId: InvestigationStep['agentId']): string {
    return AGENT_DEFINITIONS.find((agent) => agent.id === agentId)?.name ?? agentId;
  }

  private competitorMoveDetails(
    type: CompetitorIntelligenceSnapshot['competitorMoves'][number]['type'],
  ): string {
    switch (type) {
      case 'new-listing':
        return 'Launched 3 listing variants targeting lower-review sub-keywords.';
      case 'price-change':
        return 'Reduced list price by 8% while increasing coupon visibility.';
      case 'review-growth':
        return 'Review volume accelerated faster than category average in the past 14 days.';
      case 'listing-optimization':
        return 'Rewrote title and bullets to emphasize conversion-focused use cases.';
      case 'sales-shift':
        return 'Estimated sales rank improved while ad dependency remained high.';
      case 'launch-velocity':
        return 'New SKU gained first-page visibility in less than 10 days.';
      default:
        return 'Detected meaningful competitor movement.';
    }
  }

  private trimState(): void {
    this.activities.splice(28);
    this.opportunities.splice(18);
    this.dangerSignals.splice(18);
    this.monitoringAlerts.splice(20);
  }
}
