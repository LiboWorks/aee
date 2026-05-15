import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthService, AuthenticatedUser } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('login')
  @UseGuards(JwtAuthGuard)
  login(@Res() res: Response, @Query('next') next?: string) {
    return res.redirect(this.resolveNextPath(next, '/dashboard/new'));
  }

  @Get('logout')
  logout(@Res() res: Response, @Query('next') next?: string) {
    this.clearAlbAuthCookies(res);
    return res.redirect(this.resolveNextPath(next, '/login'));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getCurrentUser(user);
  }

  private clearAlbAuthCookies(res: Response): void {
    const cookieNames = ['AWSELBAuthSessionCookie', 'AWSALBAuthNonce'];

    for (const cookieName of cookieNames) {
      res.clearCookie(cookieName, { path: '/' });
      for (let part = 0; part < 10; part += 1) {
        res.clearCookie(`${cookieName}-${part}`, { path: '/' });
      }
    }
  }

  private resolveNextPath(next: string | undefined, fallback: string): string {
    if (!next || !next.startsWith('/') || next.startsWith('//')) {
      return fallback;
    }
    return next;
  }
}
