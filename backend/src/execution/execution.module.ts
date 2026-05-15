import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ExecutionController } from './execution.controller';
import { ExecutionService } from './execution.service';
import { SellerCentralAutomation } from '../automation/seller-central.automation';
import { AmazonSpApiMock } from '../integrations/amazon-sp-api.mock';

@Module({
  imports: [AuthModule],
  controllers: [ExecutionController],
  providers: [ExecutionService, SellerCentralAutomation, AmazonSpApiMock],
  exports: [ExecutionService],
})
export class ExecutionModule {}
