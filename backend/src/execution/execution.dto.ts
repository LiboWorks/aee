import { IsString, IsEnum } from 'class-validator';
import { ExecutionPhase } from '@prisma/client';

export class CreateExecutionDto {
  @IsString()
  listingAssetId!: string;

  @IsEnum(ExecutionPhase)
  phase!: ExecutionPhase;
}

export class ConfirmExecutionDto {
  @IsString()
  executionId!: string;
}
