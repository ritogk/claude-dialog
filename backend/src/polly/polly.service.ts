import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PollyClient,
  DescribeVoicesCommand,
  SynthesizeSpeechCommand,
  type LanguageCode,
  type Engine,
  type VoiceId,
} from '@aws-sdk/client-polly';

interface VoiceInfo {
  id: string;
  name: string;
  languageCode: string;
  gender: string;
  supportedEngines: string[];
}

@Injectable()
export class PollyService {
  private readonly client: PollyClient;
  private voiceCache: VoiceInfo[] | null = null;

  constructor(private readonly configService: ConfigService) {
    const region =
      this.configService.get<string>('dynamodb.region') || 'ap-northeast-1';
    this.client = new PollyClient({ region });
  }

  async listVoices(languageCode: string = 'ja-JP'): Promise<VoiceInfo[]> {
    if (this.voiceCache) return this.voiceCache;

    const result = await this.client.send(
      new DescribeVoicesCommand({ LanguageCode: languageCode as LanguageCode }),
    );
    this.voiceCache = (result.Voices || []).map((v) => ({
      id: v.Id || '',
      name: v.Name || '',
      languageCode: v.LanguageCode || '',
      gender: v.Gender || '',
      supportedEngines: v.SupportedEngines || [],
    }));
    return this.voiceCache;
  }

  async synthesize(
    text: string,
    voiceId: string,
    engine: string = 'neural',
    rate: number = 1.0,
  ): Promise<Buffer> {
    const voices = await this.listVoices();
    const voice = voices.find((v) => v.id === voiceId);
    let resolvedEngine = engine;
    if (voice && !voice.supportedEngines.includes(engine)) {
      resolvedEngine = voice.supportedEngines.includes('neural')
        ? 'neural'
        : voice.supportedEngines[0] || 'standard';
    }

    const ratePercent = Math.round(rate * 100);
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const ssml = `<speak><prosody rate="${ratePercent}%">${escaped}</prosody></speak>`;

    const result = await this.client.send(
      new SynthesizeSpeechCommand({
        Text: ssml,
        TextType: 'ssml',
        VoiceId: voiceId as VoiceId,
        Engine: resolvedEngine as Engine,
        OutputFormat: 'mp3',
      }),
    );

    const chunks: Uint8Array[] = [];
    for await (const chunk of result.AudioStream as any) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
}
