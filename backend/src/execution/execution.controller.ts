import { Controller, Post, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExecutionService } from './execution.service';
import { CreateExecutionDto } from './execution.dto';

@Controller('api/executions')
@UseGuards(JwtAuthGuard)
export class ExecutionController {
  constructor(private executionService: ExecutionService) {}

  @Post()
  create(@Body() dto: CreateExecutionDto) {
    return this.executionService.create(dto);
  }

  @Post(':id/confirm')
  confirm(@Param('id') id: string) {
    return this.executionService.confirm(id);
  }

  @Patch(':id/rollback')
  rollback(@Param('id') id: string) {
    return this.executionService.rollback(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.executionService.findOne(id);
  }
}
