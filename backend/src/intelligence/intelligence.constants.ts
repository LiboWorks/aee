import { AgentDefinition, AgentCoreAgentId } from './intelligence.types';

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    id: 'opportunity-scout',
    name: 'Opportunity Scout Agent',
    role: 'Scans emerging products and underexploited niches',
    outcomeFocus: 'Detect early growth before market crowding',
  },
  {
    id: 'competition-analyst',
    name: 'Competition Analyst Agent',
    role: 'Measures saturation, seller concentration, and PPC pressure',
    outcomeFocus: 'Prevent red-ocean market entry decisions',
  },
  {
    id: 'small-seller-feasibility',
    name: 'Small Seller Feasibility Agent',
    role: 'Evaluates whether 3-20 person teams can execute',
    outcomeFocus: 'Protect lean teams from operational overload',
  },
  {
    id: 'risk-detection',
    name: 'Risk Detection Agent',
    role: 'Flags IP concerns, review manipulation, and instability',
    outcomeFocus: 'Reduce trial-and-error losses',
  },
  {
    id: 'trend-intelligence',
    name: 'Trend Intelligence Agent',
    role: 'Tracks TikTok, Google, Reddit, and search acceleration',
    outcomeFocus: 'Surface opportunities ahead of competitors',
  },
  {
    id: 'explainability',
    name: 'Explainability Agent',
    role: 'Summarizes why conclusions are credible',
    outcomeFocus: 'Build trust through transparent reasoning',
  },
  {
    id: 'monitoring',
    name: 'Monitoring Agent',
    role: 'Continuously watches saved products, markets, and rivals',
    outcomeFocus: 'Alert sellers when risk or opportunity changes',
  },
];

export const INVESTIGATION_STEP_BLUEPRINTS: Array<{ title: string; agentId: AgentCoreAgentId }> = [
  { title: 'Checking search growth', agentId: 'opportunity-scout' },
  { title: 'Analyzing review competition', agentId: 'competition-analyst' },
  { title: 'Detecting seller concentration', agentId: 'competition-analyst' },
  { title: 'Comparing pricing stability', agentId: 'risk-detection' },
  { title: 'Evaluating PPC intensity', agentId: 'competition-analyst' },
  { title: 'Checking trend acceleration', agentId: 'trend-intelligence' },
  { title: 'Detecting seasonal instability', agentId: 'risk-detection' },
  { title: 'Evaluating small-team feasibility', agentId: 'small-seller-feasibility' },
];

export const RESEARCH_SUMMARY_LIBRARY = [
  'Pet travel accessories still show room for Shenzhen small teams because review concentration remains fragmented.',
  'Portable blenders are entering dangerous saturation due to seller flooding and rising PPC inflation.',
  'Camping storage products show strong growth velocity with lower ad pressure than mainstream kitchen categories.',
  'Niche baby feeding accessories continue to grow while listing quality is still uneven, creating a window for differentiated entrants.',
  'Magnetic charging organizers are trending across TikTok and Google, but review acceleration suggests the entry window may close soon.',
];

export const MARKET_POOL = [
  'US Kitchen Accessories',
  'US Pet Mobility',
  'EU Home Storage',
  'US Outdoor Utility',
  'JP Compact Living',
  'US Baby Feeding',
];
