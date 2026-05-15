import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ExperimentController } from './experiment.controller';
import { ExperimentService } from './experiment.service';

@Module({
  imports: [AuthModule],
  controllers: [ExperimentController],
  providers: [ExperimentService],
  exports: [ExperimentService],
})
export class ExperimentModule {}
