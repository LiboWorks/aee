import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FeatureFlagService } from './feature-flag.service';

@Controller('api/feature-flags')
@UseGuards(JwtAuthGuard)
export class FeatureFlagController {
  constructor(private featureFlagService: FeatureFlagService) {}

  @Get()
  getAll() {
    return this.featureFlagService.getAll();
  }

  @Patch(':name')
  toggle(@Param('name') name: string, @Body() body: { enabled: boolean }) {
    return this.featureFlagService.toggle(name, body.enabled);
  }
}
