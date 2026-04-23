import { IsString, IsNumber, IsObject, Min } from 'class-validator';

export class CreateExperimentDto {
  @IsString()
  executionId!: string;

  @IsNumber()
  @Min(1)
  durationDays!: number;

  @IsNumber()
  @Min(0)
  budgetAllocation!: number;

  @IsObject()
  kpiTargets!: Record<string, number>;
}
