// ── Enums ──
export type RiskLevel = 'low' | 'medium' | 'high';
export type AssetStatus = 'draft' | 'approved' | 'published';
export type ExecutionPhase = 'manual' | 'automation' | 'api';
export type ExecutionStatus = 'pending' | 'confirmed' | 'executing' | 'completed' | 'failed' | 'rolledback';
export type ExperimentStatus = 'running' | 'paused' | 'completed';
export type ExperimentDecision = 'pass' | 'fail' | 'pending';

export interface ProductReview {
  title: string;
  body: string;
  rating: number | null;
  author: string | null;
  date: string | null;
  verified: boolean;
}

export interface ProductRawData {
  url: string;
  asin: string | null;
  currency: string;
  brand: string | null;
  rating: number | null;
  reviewCount: number | null;
  bulletPoints: string[];
  description: string | null;
  attributes: Record<string, string>;
  reviews: ProductReview[];
  scrapedAt: string;
  source: string;
}

// ── Models ──
export interface User {
  userId: string;
  email: string;
}

export interface Product {
  id: string;
  userId: string;
  url: string;
  title: string | null;
  price: number | null;
  category: string | null;
  imageUrls: string[] | null;
  rawData: ProductRawData | null;
  budget: number;
  riskLevel: RiskLevel;
  createdAt: string;
  strategies?: Strategy[];
}

export interface Strategy {
  id: string;
  productId: string;
  viabilityScore: number | null;
  marginEstimate: number | null;
  competitionLevel: string | null;
  differentiationPlan: Record<string, unknown> | null;
  pricingStrategy: Record<string, unknown> | null;
  executionPlan: Record<string, unknown> | null;
  rawLlmResponse: Record<string, unknown> | null;
  createdAt: string;
  product?: Product;
  listingAssets?: ListingAsset[];
}

export interface ListingAsset {
  id: string;
  strategyId: string;
  title: string;
  bulletPoints: string[];
  description: string;
  imagePrompts: string[];
  status: AssetStatus;
  createdAt: string;
  strategy?: Strategy;
  executions?: Execution[];
}

export interface Execution {
  id: string;
  listingAssetId: string;
  phase: ExecutionPhase;
  status: ExecutionStatus;
  actionLog: Record<string, unknown> | null;
  retryCount: number;
  createdAt: string;
  listingAsset?: ListingAsset;
  experiments?: Experiment[];
}

export interface Experiment {
  id: string;
  executionId: string;
  templateName: string | null;
  durationDays: number;
  budgetAllocation: number;
  kpiTargets: Record<string, number>;
  status: ExperimentStatus;
  createdAt: string;
  results?: ExperimentResult[];
  execution?: Execution;
}

export interface ExperimentResult {
  id: string;
  experimentId: string;
  day: number;
  metrics: {
    impressions: number;
    clicks: number;
    ctr: number;
    conversions: number;
    cvr: number;
    spend: number;
    revenue: number;
    roi: number;
    acos: number;
  };
  decision: ExperimentDecision;
  suggestions: string[] | null;
  createdAt: string;
}

export interface HistoryResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AuthResponse {
  accessToken: string;
  userId: string;
  email: string;
}
