import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExperimentService } from './experiment.service';
import { CreateExperimentDto } from './experiment.dto';

@Controller('api/experiments')
@UseGuards(JwtAuthGuard)
export class ExperimentController {
  constructor(private experimentService: ExperimentService) {}

  @Post()
  create(@Body() dto: CreateExperimentDto) {
    return this.experimentService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.experimentService.findOne(id);
  }

  @Get(':id/results')
  getResults(@Param('id') id: string) {
    return this.experimentService.getResults(id);
  }

  @Post(':id/evaluate')
  evaluate(@Param('id') id: string) {
    return this.experimentService.evaluate(id);
  }
}
