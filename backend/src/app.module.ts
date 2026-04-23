import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { LlmModule } from './llm/llm.module';
import { AuthModule } from './auth/auth.module';
import { ProductModule } from './product/product.module';
import { StrategyModule } from './strategy/strategy.module';
import { AssetModule } from './asset/asset.module';
import { ExecutionModule } from './execution/execution.module';
import { ExperimentModule } from './experiment/experiment.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { FeatureFlagModule } from './feature-flag/feature-flag.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env['THROTTLE_TTL'] ?? '60', 10) * 1000,
        limit: parseInt(process.env['THROTTLE_LIMIT'] ?? '100', 10),
      },
    ]),
    PrismaModule,
    CommonModule,
    LlmModule,
    AuthModule,
    ProductModule,
    StrategyModule,
    AssetModule,
    ExecutionModule,
    ExperimentModule,
    AnalyticsModule,
    FeatureFlagModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
