const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, '');
const API_URL = configuredApiUrl || (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : '');

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      if (typeof window !== 'undefined') localStorage.setItem('aee_token', token);
    } else {
      if (typeof window !== 'undefined') localStorage.removeItem('aee_token');
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('aee_token');
    }
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `API error: ${res.status}`);
    }

    return res.json();
  }

  // Auth
  register(email: string, password: string) {
    return this.request<{ message: string }>('/api/auth/register', {
      method: 'POST', body: JSON.stringify({ email, password }),
    });
  }

  login(email: string, password: string) {
    return this.request<{ accessToken: string; userId: string; email: string }>('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    });
  }

  activateAccount(token: string) {
    return this.request<{ accessToken: string; userId: string; email: string }>(`/api/auth/activate?token=${encodeURIComponent(token)}`);
  }

  resendActivation(email: string) {
    return this.request<{ message: string }>('/api/auth/resend-activation', {
      method: 'POST', body: JSON.stringify({ email }),
    });
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
}

export const api = new ApiClient();
