import { IsString } from 'class-validator';

export class CreateAssetDto {
  @IsString()
  strategyId!: string;
}
