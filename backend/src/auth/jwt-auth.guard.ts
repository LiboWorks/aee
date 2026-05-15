import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService, AuthenticatedUser } from './auth.service';

type HeaderValue = string | string[] | undefined;
type RequestWithAuthHeaders = {
  headers: Record<string, HeaderValue>;
  user?: AuthenticatedUser;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAuthHeaders>();
    const claims = this.parseOidcClaims(request);
    const sub = this.readHeader(request, 'x-amzn-oidc-identity') || this.readClaim(claims, 'sub');

    if (!sub) {
      throw new UnauthorizedException('Missing ALB identity headers');
    }

    const email = this.readClaim(claims, 'email');
    const username = this.readClaim(claims, 'cognito:username');

    request.user = await this.authService.syncUser({
      sub,
      email,
      username,
    });

    return true;
  }

  private parseOidcClaims(request: RequestWithAuthHeaders): Record<string, unknown> {
    const oidcData = this.readHeader(request, 'x-amzn-oidc-data');
    if (!oidcData) {
      return {};
    }

    const parts = oidcData.split('.');
    if (parts.length < 2) {
      return {};
    }

    try {
      const decodedPayload = this.decodeBase64Url(parts[1]);
      const payload = JSON.parse(decodedPayload);
      return typeof payload === 'object' && payload !== null
        ? (payload as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  private readClaim(claims: Record<string, unknown>, key: string): string | undefined {
    const value = claims[key];
    return typeof value === 'string' ? value : undefined;
  }

  private readHeader(request: RequestWithAuthHeaders, key: string): string | undefined {
    const value = request.headers[key] ?? request.headers[key.toLowerCase()];
    if (typeof value === 'string') {
      return value;
    }
    if (Array.isArray(value)) {
      return value[0];
    }
    return undefined;
  }

  private decodeBase64Url(value: string): string {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return Buffer.from(padded, 'base64').toString('utf8');
  }
}
