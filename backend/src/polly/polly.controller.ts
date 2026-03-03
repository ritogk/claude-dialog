import { Body, Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiHeader,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { PollyService } from './polly.service';
import { SynthesizeDto, PollyVoiceDto } from './dto';

@ApiTags('Polly')
@ApiHeader({
  name: 'X-API-Key',
  required: false,
  description: 'API key for authentication',
})
@UseGuards(ApiKeyGuard)
@Controller('api/polly')
export class PollyController {
  constructor(private readonly pollyService: PollyService) {}

  @Get('voices')
  @ApiOperation({ summary: 'List available Polly voices' })
  @ApiResponse({
    status: 200,
    description: 'List of voices',
    type: [PollyVoiceDto],
  })
  async listVoices(
    @Query('languageCode') languageCode?: string,
  ): Promise<PollyVoiceDto[]> {
    return this.pollyService.listVoices(languageCode || 'ja-JP');
  }

  @Post('synthesize')
  @ApiOperation({ summary: 'Synthesize speech from text' })
  @ApiResponse({ status: 200, description: 'Audio data (mp3)' })
  async synthesize(
    @Body() dto: SynthesizeDto,
    @Res() res: Response,
  ): Promise<void> {
    const audioBuffer = await this.pollyService.synthesize(
      dto.text,
      dto.voiceId,
      dto.engine || 'neural',
      dto.rate || 1.0,
    );
    res.set({ 'Content-Type': 'audio/mpeg' });
    res.send(audioBuffer);
  }
}
