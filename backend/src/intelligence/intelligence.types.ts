export type AgentCoreAgentId =
  | 'opportunity-scout'
  | 'competition-analyst'
  | 'small-seller-feasibility'
  | 'risk-detection'
  | 'trend-intelligence'
  | 'explainability'
  | 'monitoring';

export type ActivitySeverity = 'info' | 'warning' | 'critical';
export type InvestigationStatus = 'running' | 'completed';
export type InvestigationStepStatus = 'pending' | 'running' | 'completed' | 'warning';

export interface AgentDefinition {
  id: AgentCoreAgentId;
  name: string;
  role: string;
  outcomeFocus: string;
}

export interface EvidenceMetric {
  key: string;
  value: number;
  unit?: string;
}

export interface EvidenceItem {
  id: string;
  title: string;
  summary: string;
  sourceType: 'amazon' | 'tiktok' | 'google' | 'reddit' | 'internal';
  sourceName: string;
  sourceUrl?: string;
  capturedAt: string;
  metrics: EvidenceMetric[];
}

export interface AgentActivity {
  id: string;
  timestamp: string;
  agentId: AgentCoreAgentId;
  agentName: string;
  severity: ActivitySeverity;
  headline: string;
  details: string;
  market: string;
  checkedSources: string[];
  conclusion: string;
  evidence: EvidenceItem[];
}

export interface EmergingOpportunity {
  id: string;
  productName: string;
  category: string;
  imageUrl: string;
  growthAcceleration: number;
  opportunityScore: number;
  competitionScore: number;
  smallTeamFriendliness: number;
  estimatedMargin: number;
  whyThisMatters: string;
  whyEarlyStage: string;
}

export interface DangerSignal {
  id: string;
  detectedAt: string;
  market: string;
  title: string;
  severity: Exclude<ActivitySeverity, 'info'>;
  details: string;
  impact: string;
  recommendation: string;
}

export interface MonitoringAlert {
  id: string;
  detectedAt: string;
  market: string;
  alertType: 'seller-flooding' | 'pricing-shift' | 'review-spike' | 'new-competitor' | 'margin-deterioration' | 'trend-acceleration';
  severity: Exclude<ActivitySeverity, 'info'>;
  headline: string;
  details: string;
  changePercent: number;
  recommendedAction: string;
}

export interface InvestigationControls {
  category: string;
  budgetLevel: 'lean' | 'balanced' | 'aggressive';
  smallTeamMode: boolean;
  riskTolerance: 'conservative' | 'balanced' | 'aggressive';
  marketType: 'amazon-us' | 'amazon-eu' | 'amazon-jp';
}

export interface InvestigationStep {
  id: string;
  order: number;
  title: string;
  agentId: AgentCoreAgentId;
  status: InvestigationStepStatus;
  checkedSources: string[];
  summary: string;
  rawFindings: string[];
  evidence: EvidenceItem[];
  charts: Array<{ label: string; value: number }>;
  startedAt?: string;
  completedAt?: string;
}

export interface InvestigationOutcome {
  opportunityScore: number;
  riskScore: number;
  entryDifficulty: number;
  smallTeamSuitability: number;
  survivability: number;
  recommendedStrategy: string[];
  warnings: string[];
  nextSteps: string[];
  explainabilitySummary: string;
}

export interface InvestigationSession {
  id: string;
  userId: string;
  query: string;
  createdAt: string;
  updatedAt: string;
  status: InvestigationStatus;
  controls: InvestigationControls;
  steps: InvestigationStep[];
  outcome: InvestigationOutcome | null;
}

export interface CommandCenterSnapshot {
  generatedAt: string;
  agents: AgentDefinition[];
  activeInvestigations: Array<{ id: string; query: string; progressPercent: number; status: InvestigationStatus }>;
  liveActivityFeed: AgentActivity[];
  emergingOpportunities: EmergingOpportunity[];
  dangerZone: DangerSignal[];
  aiResearchSummary: string[];
  activeMonitoringAlerts: MonitoringAlert[];
  quickInvestigationActions: Array<{ id: string; label: string; prompt: string }>;
}

export interface ProductIntelligenceReport {
  generatedAt: string;
  investigationId: string;
  productName: string;
  executiveSummary: {
    marketPotential: string;
    survivability: string;
    riskLevel: string;
    smallTeamFeasibility: string;
  };
  aiReasoning: string[];
  evidenceExplorer: EvidenceItem[];
  competitionBreakdown: {
    topSellers: Array<{ sellerName: string; dominanceScore: number; reviewBarrier: number; ppcIntensity: number }>;
    saturationScore: number;
  };
  smallTeamSurvival: {
    startupBudgetPressure: number;
    inventoryPressure: number;
    logisticsComplexity: number;
    operationalBurden: number;
    expectedDifficulty: number;
  };
  riskIntelligence: string[];
  recommendedStrategy: string[];
}

export interface CompetitionSurvivalSnapshot {
  sellerConcentrationMap: Array<{ segment: string; concentration: number }>;
  marketHeatmap: Array<{ market: string; heat: number }>;
  reviewDomination: Array<{ competitor: string; dominationScore: number }>;
  priceWarSignals: Array<{ market: string; intensity: number }>;
  ppcEscalationSignals: Array<{ market: string; intensity: number }>;
  survivalProbability: number;
  difficultyIndex: number;
}

export interface SmallTeamOpportunitySnapshot {
  generatedAt: string;
  filtersApplied: string[];
  opportunities: Array<{
    id: string;
    productName: string;
    startupCostEstimate: number;
    ppcDependency: number;
    inventoryComplexity: number;
    reviewBarrier: number;
    operationalComplexity: number;
    fitReason: string;
  }>;
}

export interface TrendSignalPoint {
  period: string;
  tiktokVelocity: number;
  googleIndex: number;
  redditVelocity: number;
  amazonSearchAcceleration: number;
}

export interface TrendIntelligenceSnapshot {
  generatedAt: string;
  trendSignals: TrendSignalPoint[];
  stageSignals: Array<{ market: string; stage: 'still-early' | 'growth-phase' | 'saturating'; confidence: number }>;
}

export interface LiveMonitoringSnapshot {
  generatedAt: string;
  trackedProducts: Array<{ id: string; label: string; currentStatus: string }>;
  trackedCompetitors: Array<{ id: string; name: string; status: string }>;
  trackedNiches: Array<{ id: string; name: string; status: string }>;
  alerts: MonitoringAlert[];
}

export interface CompetitorIntelligenceSnapshot {
  generatedAt: string;
  competitorMoves: Array<{
    competitor: string;
    type: 'new-listing' | 'price-change' | 'review-growth' | 'listing-optimization' | 'sales-shift' | 'launch-velocity';
    details: string;
    impact: string;
    detectedAt: string;
  }>;
}

export interface ResearchWorkspaceResponse {
  question: string;
  workflow: string[];
  evidence: EvidenceItem[];
  answer: string;
  confidence: number;
  nextActions: string[];
}

export interface EvidenceExplorerSnapshot {
  generatedAt: string;
  sourceCatalog: Array<{ sourceName: string; sourceType: string; reliabilityScore: number }>;
  evidence: EvidenceItem[];
  comparisons: Array<{ label: string; baseline: number; current: number }>;
}

export interface WorkspaceSettingsSnapshot {
  teamProfile: {
    targetTeamSize: string;
    operatingModel: string;
    defaultBudgetRange: string;
  };
  agentPreferences: Array<{ agentId: AgentCoreAgentId; enabled: boolean; cadence: string }>;
  watchlistSettings: Array<{ watchType: string; threshold: string }>;
}

export interface IntelligenceRealtimeEvent {
  type:
    | 'connection.ready'
    | 'activity.update'
    | 'monitoring.alert'
    | 'investigation.progress'
    | 'investigation.completed';
  emittedAt: string;
  payload: unknown;
}
