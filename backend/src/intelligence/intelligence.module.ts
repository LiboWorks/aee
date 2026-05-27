import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IntelligenceController } from './intelligence.controller';
import { IntelligenceService } from './intelligence.service';
import { IntelligenceRealtimeService } from './intelligence-realtime.service';
import { AgentCoreAdapter } from './agentcore/agentcore.adapter';

@Module({
  imports: [AuthModule],
  controllers: [IntelligenceController],
  providers: [IntelligenceService, IntelligenceRealtimeService, AgentCoreAdapter],
  exports: [IntelligenceRealtimeService],
})
export class IntelligenceModule {}
