import { IsString, IsNumber, IsEnum, IsUrl, IsOptional, Min } from 'class-validator';
import { RiskLevel } from '@prisma/client';

export class CreateProductDto {
  @IsString()
  @IsUrl()
  url!: string;

  @IsNumber()
  @Min(1)
  budget!: number;

  @IsEnum(RiskLevel)
  riskLevel!: RiskLevel;

  @IsOptional()
  @IsString()
  currency?: string;
}
