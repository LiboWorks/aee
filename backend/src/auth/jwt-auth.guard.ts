import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthenticatedUser } from './auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const sessionUser = (request.session as { user?: AuthenticatedUser } | undefined)?.user;

    if (!sessionUser) {
      throw new UnauthorizedException('Missing authentication session');
    }

    request.user = sessionUser;
    return true;
  }
}
