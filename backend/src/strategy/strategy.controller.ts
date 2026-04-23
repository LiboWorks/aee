import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { StrategyService } from './strategy.service';
import { CreateStrategyDto } from './strategy.dto';

@Controller('api/strategies')
@UseGuards(JwtAuthGuard)
export class StrategyController {
  constructor(private strategyService: StrategyService) {}

  @Post()
  generate(@CurrentUser() user: { userId: string }, @Body() dto: CreateStrategyDto) {
    return this.strategyService.generate(dto.productId, user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.strategyService.findOne(id);
  }
}
