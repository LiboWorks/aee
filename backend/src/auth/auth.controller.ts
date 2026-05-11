import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { TokenSet } from 'openid-client';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthenticatedUser } from './auth.service';
import { CognitoOidcService } from './cognito-oidc.service';

type AuthSession = {
  state?: string;
  nonce?: string;
  codeVerifier?: string;
  user?: AuthenticatedUser;
};

@Controller('api/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private readonly oidcService: CognitoOidcService,
  ) {}

  @Get('login')
  async login(
    @Req() req: Request,
    @Res() res: Response,
    @Query('mode') mode?: string,
  ) {
    const client = await this.oidcService.getClient();
    const authConfig = this.oidcService.getConfig();

    const state = this.oidcService.createState();
    const nonce = this.oidcService.createNonce();
    const codeVerifier = this.oidcService.createCodeVerifier();
    const codeChallenge = this.oidcService.createCodeChallenge(codeVerifier);

    const session = this.getSession(req);
    session.state = state;
    session.nonce = nonce;
    session.codeVerifier = codeVerifier;

    const prompt = mode === 'signup' ? 'login' : undefined;
    const screenHint = mode === 'signup' ? 'signup' : undefined;

    const authorizationUrl = client.authorizationUrl({
      scope: authConfig.scope,
      response_type: 'code',
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      prompt,
      screen_hint: screenHint,
    });

    return res.redirect(authorizationUrl);
  }

  @Get('callback')
  async callback(@Req() req: Request, @Res() res: Response) {
    const session = this.getSession(req);
    if (!session.state || !session.nonce || !session.codeVerifier) {
      return res.redirect(this.frontendUrl('/login?error=session_expired'));
    }

    const client = await this.oidcService.getClient();
    const redirectUri = this.oidcService.getConfig().redirectUri;

    try {
      const tokenSet = await client.callback(
        redirectUri,
        client.callbackParams(req),
        {
          state: session.state,
          nonce: session.nonce,
          code_verifier: session.codeVerifier,
        },
      );

      const user = await this.resolveAuthenticatedUser(tokenSet);
      session.user = user;

      delete session.state;
      delete session.nonce;
      delete session.codeVerifier;

      return res.redirect(this.frontendUrl('/dashboard/new'));
    } catch {
      return res.redirect(this.frontendUrl('/login?error=auth_callback_failed'));
    }
  }

  @Get('logout')
  logout(@Req() req: Request, @Res() res: Response) {
    const logoutUrl = this.oidcService.createLogoutUrl();

    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.redirect(logoutUrl);
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getCurrentUser(user);
  }

  private async resolveAuthenticatedUser(tokenSet: TokenSet): Promise<AuthenticatedUser> {
    const claims = tokenSet.claims();
    const sub = claims.sub;

    if (!sub) {
      throw new Error('Missing subject claim in Cognito token set');
    }

    const email = typeof claims.email === 'string' ? claims.email : undefined;
    const usernameClaim = claims['cognito:username'];
    const username = typeof usernameClaim === 'string' ? usernameClaim : undefined;

    return this.authService.syncUser({
      sub,
      email,
      username,
    });
  }

  private getSession(req: Request): AuthSession {
    return req.session as unknown as AuthSession;
  }

  private frontendUrl(path: string): string {
    const base = (process.env['FRONTEND_URL'] || 'http://localhost:3000').replace(/\/$/, '');
    return `${base}${path}`;
  }
}
