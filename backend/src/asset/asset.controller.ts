import { Controller, Post, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AssetService } from './asset.service';
import { CreateAssetDto } from './asset.dto';

@Controller('api/assets')
@UseGuards(JwtAuthGuard)
export class AssetController {
  constructor(private assetService: AssetService) {}

  @Post()
  generate(@Body() dto: CreateAssetDto) {
    return this.assetService.generate(dto.strategyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetService.findOne(id);
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.assetService.approve(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: { title?: string; bulletPoints?: string[]; description?: string }) {
    return this.assetService.update(id, data);
  }
}
