import { IsString } from 'class-validator';

export class CreateStrategyDto {
  @IsString()
  productId!: string;
}
