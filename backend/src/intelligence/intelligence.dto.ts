import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const BUDGET_LEVELS = ['lean', 'balanced', 'aggressive'] as const;
const RISK_TOLERANCE_LEVELS = ['conservative', 'balanced', 'aggressive'] as const;
const MARKET_TYPES = ['amazon-us', 'amazon-eu', 'amazon-jp'] as const;

export class StartInvestigationDto {
  @IsString()
  @MaxLength(180)
  query!: string;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  category?: string;

  @IsIn(BUDGET_LEVELS)
  @IsOptional()
  budgetLevel?: (typeof BUDGET_LEVELS)[number];

  @IsBoolean()
  @IsOptional()
  smallTeamMode?: boolean;

  @IsIn(RISK_TOLERANCE_LEVELS)
  @IsOptional()
  riskTolerance?: (typeof RISK_TOLERANCE_LEVELS)[number];

  @IsIn(MARKET_TYPES)
  @IsOptional()
  marketType?: (typeof MARKET_TYPES)[number];
}

export class AskResearchQuestionDto {
  @IsString()
  @MaxLength(240)
  question!: string;

  @IsString()
  @IsOptional()
  @MaxLength(160)
  context?: string;
}
