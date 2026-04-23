import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AnalyticsService } from './analytics.service';

@Controller('api/analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('history')
  getHistory(
    @CurrentUser() user: { userId: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getHistory(
      user.userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('product/:id/timeline')
  getProductTimeline(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.analyticsService.getProductTimeline(id, user.userId);
  }
}
