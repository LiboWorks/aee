import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';
import { RegisterDto, LoginDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const activationToken = crypto.randomBytes(32).toString('hex');
    const activationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        isActive: false,
        activationToken,
        activationExpires,
      },
    });

    await this.mailService.sendActivationEmail(dto.email.toLowerCase(), activationToken);

    return { message: 'Registration successful. Please check your email to activate your account.' };
  }

  async activate(token: string) {
    const user = await this.prisma.user.findUnique({ where: { activationToken: token } });
    if (!user) {
      throw new BadRequestException('Invalid activation token');
    }
    if (user.isActive) {
      return { message: 'Account is already active' };
    }
    if (user.activationExpires && user.activationExpires < new Date()) {
      throw new BadRequestException('Activation link has expired. Please register again.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isActive: true, activationToken: null, activationExpires: null },
    });

    return this.buildTokenResponse(user.id, user.email);
  }

  async resendActivation(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      // Don't reveal whether email exists
      return { message: 'If that email is registered, a new activation link has been sent.' };
    }
    if (user.isActive) {
      return { message: 'Account is already active. Please log in.' };
    }

    const activationToken = crypto.randomBytes(32).toString('hex');
    const activationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { activationToken, activationExpires },
    });

    await this.mailService.sendActivationEmail(user.email, activationToken);

    return { message: 'If that email is registered, a new activation link has been sent.' };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account not activated. Please check your email for the activation link.');
    }

    return this.buildTokenResponse(user.id, user.email);
  }

  private buildTokenResponse(userId: string, email: string) {
    const payload = { sub: userId, email };
    return {
      accessToken: this.jwtService.sign(payload),
      userId,
      email,
    };
  }
}
