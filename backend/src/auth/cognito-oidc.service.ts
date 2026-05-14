import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, generators, Issuer } from 'openid-client';

export interface CognitoAuthConfig {
  clientId: string;
  clientSecret?: string;
  scope: string;
  redirectUri: string;
  hostedUiDomain: string;
  logoutUri: string;
}

@Injectable()
export class CognitoOidcService {
  private clientPromise?: Promise<Client>;
  private readonly logger = new Logger(CognitoOidcService.name);

  constructor(private readonly config: ConfigService) {}

  async getClient(): Promise<Client> {
    if (!this.clientPromise) {
      this.clientPromise = this.createClient();
    }
    return this.clientPromise;
  }

  getConfig(): CognitoAuthConfig {
    const clientId = this.mustGet('COGNITO_APP_CLIENT_ID');
    const hostedUiDomain = this.mustGet('COGNITO_HOSTED_UI_DOMAIN');
    const frontendBaseUrl = this.getFrontendBaseUrl();
    const redirectUri = this.resolveRedirectUri(frontendBaseUrl);
    const logoutUri = this.resolveLogoutUri(frontendBaseUrl);

    return {
      clientId,
      clientSecret: this.config.get<string>('COGNITO_APP_CLIENT_SECRET') || undefined,
      scope: this.config.get<string>('COGNITO_SCOPE') || 'openid email profile',
      redirectUri,
      hostedUiDomain,
      logoutUri,
    };
  }

  createNonce(): string {
    return generators.nonce();
  }

  createState(): string {
    return generators.state();
  }

  createCodeVerifier(): string {
    return generators.codeVerifier();
  }

  createCodeChallenge(codeVerifier: string): string {
    return generators.codeChallenge(codeVerifier);
  }

  createLogoutUrl(): string {
    const cfg = this.getConfig();
    const params = new URLSearchParams({
      client_id: cfg.clientId,
      logout_uri: cfg.logoutUri,
    });
    return `${this.normalizeDomain(cfg.hostedUiDomain)}/logout?${params.toString()}`;
  }

  private async createClient(): Promise<Client> {
    const cfg = this.getConfig();
    const issuerUrl = this.resolveIssuerUrl();
    const issuer = await Issuer.discover(issuerUrl);

    return new issuer.Client({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uris: [cfg.redirectUri],
      response_types: ['code'],
    });
  }

  private resolveIssuerUrl(): string {
    const explicitIssuer = this.config.get<string>('COGNITO_ISSUER_URL');
    if (explicitIssuer) {
      return explicitIssuer;
    }

    const userPoolId = this.mustGet('COGNITO_USER_POOL_ID');
    const region = userPoolId.split('_')[0];
    if (!region) {
      throw new Error('Invalid COGNITO_USER_POOL_ID format');
    }

    return `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
  }

  private resolveRedirectUri(frontendBaseUrl: string): string {
    const configuredRedirectUri = this.config.get<string>('COGNITO_REDIRECT_URI')?.trim();
    const fallbackRedirectUri = `${frontendBaseUrl}/api/auth/callback`;

    if (!configuredRedirectUri) {
      return fallbackRedirectUri;
    }

    if (this.isAlbCallbackUri(configuredRedirectUri)) {
      this.logger.warn(
        `COGNITO_REDIRECT_URI points to a legacy ALB callback (${configuredRedirectUri}). Falling back to ${fallbackRedirectUri}.`,
      );
      return fallbackRedirectUri;
    }

    return configuredRedirectUri;
  }

  private resolveLogoutUri(frontendBaseUrl: string): string {
    const configuredLogoutUri = this.config.get<string>('COGNITO_LOGOUT_URI')?.trim();
    const fallbackLogoutUri = `${frontendBaseUrl}/login`;

    if (!configuredLogoutUri) {
      return fallbackLogoutUri;
    }

    if (this.isAlbCallbackUri(configuredLogoutUri)) {
      this.logger.warn(
        `COGNITO_LOGOUT_URI points to a legacy ALB callback (${configuredLogoutUri}). Falling back to ${fallbackLogoutUri}.`,
      );
      return fallbackLogoutUri;
    }

    return configuredLogoutUri;
  }

  private getFrontendBaseUrl(): string {
    const frontendUrl = (this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000').trim();
    return frontendUrl.endsWith('/') ? frontendUrl.slice(0, -1) : frontendUrl;
  }

  private isAlbCallbackUri(uri: string): boolean {
    try {
      return new URL(uri).pathname === '/oauth2/idpresponse';
    } catch {
      return uri.includes('/oauth2/idpresponse');
    }
  }

  private normalizeDomain(domain: string): string {
    return domain.endsWith('/') ? domain.slice(0, -1) : domain;
  }

  private mustGet(name: string): string {
    const value = this.config.get<string>(name);
    if (!value) {
      throw new Error(`${name} must be configured`);
    }
    return value;
  }
}
