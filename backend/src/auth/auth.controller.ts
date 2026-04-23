import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './auth.dto';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('activate')
  activate(@Query('token') token: string) {
    return this.authService.activate(token);
  }

  @Post('resend-activation')
  resendActivation(@Body('email') email: string) {
    return this.authService.resendActivation(email);
  }
}
