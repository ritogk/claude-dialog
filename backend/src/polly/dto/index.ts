import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SynthesizeDto {
  @ApiProperty({ description: 'Text to synthesize' })
  text!: string;

  @ApiProperty({ description: 'Polly voice ID (e.g. Takumi, Kazuha)' })
  voiceId!: string;

  @ApiPropertyOptional({
    description: 'Polly engine: standard, neural, long-form, generative',
    default: 'neural',
  })
  engine?: string;

  @ApiPropertyOptional({
    description: 'Speech rate multiplier (0.5 to 4.0)',
    default: 1.0,
  })
  rate?: number;
}

export class PollyVoiceDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() languageCode!: string;
  @ApiProperty() gender!: string;
  @ApiProperty({ type: [String] }) supportedEngines!: string[];
}
