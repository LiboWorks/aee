import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AskResearchQuestionDto, StartInvestigationDto } from './intelligence.dto';
import { IntelligenceService } from './intelligence.service';

@Controller('api/intelligence')
@UseGuards(JwtAuthGuard)
export class IntelligenceController {
  constructor(private readonly intelligenceService: IntelligenceService) {}

  @Get('command-center')
  getCommandCenter(@CurrentUser() user: { userId: string }) {
    return this.intelligenceService.getCommandCenter(user.userId);
  }

  @Post('investigations')
  startInvestigation(
    @CurrentUser() user: { userId: string },
    @Body() dto: StartInvestigationDto,
  ) {
    return this.intelligenceService.startInvestigation(user.userId, dto);
  }

  @Get('investigations/:id')
  getInvestigation(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.intelligenceService.getInvestigation(user.userId, id);
  }

  @Get('reports/:investigationId')
  getProductIntelligenceReport(
    @CurrentUser() user: { userId: string },
    @Param('investigationId') investigationId: string,
  ) {
    return this.intelligenceService.getProductIntelligenceReport(user.userId, investigationId);
  }

  @Get('competition-survival')
  getCompetitionSurvival() {
    return this.intelligenceService.getCompetitionSurvivalSnapshot();
  }

  @Get('small-team-opportunities')
  getSmallTeamOpportunities() {
    return this.intelligenceService.getSmallTeamOpportunitySnapshot();
  }

  @Get('trend-intelligence')
  getTrendIntelligence() {
    return this.intelligenceService.getTrendIntelligenceSnapshot();
  }

  @Get('live-monitoring')
  getLiveMonitoring() {
    return this.intelligenceService.getLiveMonitoringSnapshot();
  }

  @Get('competitor-intelligence')
  getCompetitorIntelligence() {
    return this.intelligenceService.getCompetitorIntelligenceSnapshot();
  }

  @Post('research-workspace')
  askResearchQuestion(@Body() dto: AskResearchQuestionDto) {
    return this.intelligenceService.askResearchQuestion(dto);
  }

  @Get('evidence-explorer')
  getEvidenceExplorer() {
    return this.intelligenceService.getEvidenceExplorerSnapshot();
  }

  @Get('workspace-settings')
  getWorkspaceSettings() {
    return this.intelligenceService.getWorkspaceSettingsSnapshot();
  }
}
