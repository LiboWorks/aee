import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CognitoOidcService } from './cognito-oidc.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, CognitoOidcService],
  exports: [AuthService, JwtAuthGuard, CognitoOidcService],
})
export class AuthModule {}
