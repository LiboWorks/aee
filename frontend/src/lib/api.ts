const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, '');
export const API_URL = configuredApiUrl || (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : '');

class ApiClient {
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = this.toHeaderRecord(options.headers);

    if (options.body !== undefined && !this.hasContentTypeHeader(headers)) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (res.type === 'opaqueredirect' || (res.status >= 300 && res.status < 400)) {
      throw new Error('Missing authentication session');
    }

    if (!res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `API error: ${res.status}`);
      }

      throw new Error(`API error: ${res.status}`);
    }

    if (res.status === 204) {
      return undefined as T;
    }

    return res.json();
  }

  private toHeaderRecord(headers?: HeadersInit): Record<string, string> {
    if (!headers) {
      return {};
    }

    if (headers instanceof Headers) {
      return Object.fromEntries(headers.entries());
    }

    if (Array.isArray(headers)) {
      return Object.fromEntries(headers);
    }

    return { ...headers };
  }

  private hasContentTypeHeader(headers: Record<string, string>): boolean {
    return Object.keys(headers).some((name) => name.toLowerCase() === 'content-type');
  }

  // Auth
  getCurrentUser() {
    return this.request<import('./types').User>('/api/auth/me', { redirect: 'manual' });
  }

  // Products
  createProduct(data: { url: string; budget: number; riskLevel: string; currency?: string }) {
    return this.request<import('./types').Product>('/api/products', { method: 'POST', body: JSON.stringify(data) });
  }

  getProducts() {
    return this.request<import('./types').Product[]>('/api/products');
  }

  getProduct(id: string) {
    return this.request<import('./types').Product>(`/api/products/${id}`);
  }

  // Strategies
  generateStrategy(productId: string) {
    return this.request<import('./types').Strategy>('/api/strategies', { method: 'POST', body: JSON.stringify({ productId }) });
  }

  getStrategy(id: string) {
    return this.request<import('./types').Strategy>(`/api/strategies/${id}`);
  }

  // Assets
  generateAssets(strategyId: string) {
    return this.request<import('./types').ListingAsset>('/api/assets', { method: 'POST', body: JSON.stringify({ strategyId }) });
  }

  getAsset(id: string) {
    return this.request<import('./types').ListingAsset>(`/api/assets/${id}`);
  }

  approveAsset(id: string) {
    return this.request<import('./types').ListingAsset>(`/api/assets/${id}/approve`, { method: 'PATCH' });
  }

  updateAsset(id: string, data: { title?: string; bulletPoints?: string[]; description?: string }) {
    return this.request<import('./types').ListingAsset>(`/api/assets/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  // Executions
  createExecution(data: { listingAssetId: string; phase: string }) {
    return this.request<import('./types').Execution>('/api/executions', { method: 'POST', body: JSON.stringify(data) });
  }

  confirmExecution(id: string) {
    return this.request<{ execution: import('./types').Execution; result: unknown }>(`/api/executions/${id}/confirm`, { method: 'POST' });
  }

  rollbackExecution(id: string) {
    return this.request<{ message: string }>(`/api/executions/${id}/rollback`, { method: 'PATCH' });
  }

  getExecution(id: string) {
    return this.request<import('./types').Execution>(`/api/executions/${id}`);
  }

  // Experiments
  createExperiment(data: { executionId: string; durationDays: number; budgetAllocation: number; kpiTargets: Record<string, number> }) {
    return this.request<import('./types').Experiment>('/api/experiments', { method: 'POST', body: JSON.stringify(data) });
  }

  getExperiment(id: string) {
    return this.request<import('./types').Experiment>(`/api/experiments/${id}`);
  }

  getExperimentResults(id: string) {
    return this.request<import('./types').ExperimentResult[]>(`/api/experiments/${id}/results`);
  }

  evaluateExperiment(id: string) {
    return this.request<Record<string, unknown>>(`/api/experiments/${id}/evaluate`, { method: 'POST' });
  }

  // Analytics
  getHistory(page = 1, limit = 20) {
    return this.request<import('./types').HistoryResponse>(`/api/analytics/history?page=${page}&limit=${limit}`);
  }

  getProductTimeline(productId: string) {
    return this.request<{ product: import('./types').Product; actionLogs: unknown[] }>(`/api/analytics/product/${productId}/timeline`);
  }

  // Intelligence Platform
  getCommandCenter() {
    return this.request<import('./types').CommandCenterSnapshot>('/api/intelligence/command-center');
  }

  startInvestigation(data: {
    query: string;
    category?: string;
    budgetLevel?: 'lean' | 'balanced' | 'aggressive';
    smallTeamMode?: boolean;
    riskTolerance?: 'conservative' | 'balanced' | 'aggressive';
    marketType?: 'amazon-us' | 'amazon-eu' | 'amazon-jp';
  }) {
    return this.request<import('./types').InvestigationSession>('/api/intelligence/investigations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getInvestigation(id: string) {
    return this.request<import('./types').InvestigationSession>(`/api/intelligence/investigations/${id}`);
  }

  getProductIntelligenceReport(investigationId: string) {
    return this.request<import('./types').ProductIntelligenceReport>(`/api/intelligence/reports/${investigationId}`);
  }

  getCompetitionSurvival() {
    return this.request<import('./types').CompetitionSurvivalSnapshot>('/api/intelligence/competition-survival');
  }

  getSmallTeamOpportunities() {
    return this.request<import('./types').SmallTeamOpportunitySnapshot>('/api/intelligence/small-team-opportunities');
  }

  getTrendIntelligence() {
    return this.request<import('./types').TrendIntelligenceSnapshot>('/api/intelligence/trend-intelligence');
  }

  getLiveMonitoring() {
    return this.request<import('./types').LiveMonitoringSnapshot>('/api/intelligence/live-monitoring');
  }

  getCompetitorIntelligence() {
    return this.request<import('./types').CompetitorIntelligenceSnapshot>('/api/intelligence/competitor-intelligence');
  }

  askResearchWorkspace(data: { question: string; context?: string }) {
    return this.request<import('./types').ResearchWorkspaceResponse>('/api/intelligence/research-workspace', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getEvidenceExplorer() {
    return this.request<import('./types').EvidenceExplorerSnapshot>('/api/intelligence/evidence-explorer');
  }

  getWorkspaceSettings() {
    return this.request<import('./types').WorkspaceSettingsSnapshot>('/api/intelligence/workspace-settings');
  }
}

export const api = new ApiClient();
