import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CognitoIdentity {
  sub: string;
  email?: string | null;
  username?: string | null;
}

export interface AuthenticatedUser {
  userId: string;
  cognitoSub: string;
  email: string;
  username: string | null;
}

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async syncUser(identity: CognitoIdentity): Promise<AuthenticatedUser> {
    const normalizedEmail = identity.email?.toLowerCase() ?? `${identity.username ?? identity.sub}@cognito.local`;

    const existingBySub = await this.prisma.user.findUnique({ where: { cognitoSub: identity.sub } });
    if (existingBySub) {
      const user = existingBySub.email === normalizedEmail
        ? existingBySub
        : await this.prisma.user.update({
            where: { id: existingBySub.id },
            data: { email: normalizedEmail },
          });
      return this.toAuthenticatedUser(user, identity);
    }

    const existingByEmail = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingByEmail) {
      const user = await this.prisma.user.update({
        where: { id: existingByEmail.id },
        data: { cognitoSub: identity.sub },
      });
      return this.toAuthenticatedUser(user, identity);
    }

    const user = await this.prisma.user.create({
      data: {
        cognitoSub: identity.sub,
        email: normalizedEmail,
      },
    });

    return this.toAuthenticatedUser(user, identity);
  }

  getCurrentUser(user: AuthenticatedUser) {
    return user;
  }

  private toAuthenticatedUser(user: User, identity: CognitoIdentity): AuthenticatedUser {
    return {
      userId: user.id,
      cognitoSub: identity.sub,
      email: user.email,
      username: identity.username ?? null,
    };
  }
}
