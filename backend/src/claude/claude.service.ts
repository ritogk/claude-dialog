import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class ClaudeService {
  private readonly client: Anthropic;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('anthropicApiKey');
    this.client = new Anthropic({ apiKey });
  }

  async *streamChat(
    messages: Array<{ role: string; content: string }>,
  ): AsyncIterable<string> {
    const stream = this.client.messages.stream({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 4096,
      messages: messages as Anthropic.MessageParam[],
      tools: [
        {
          type: 'web_search_20250305' as any,
          name: 'web_search',
          max_uses: 5,
        } as any,
      ],
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        (event.delta as any).type === 'text_delta'
      ) {
        yield (event.delta as any).text;
      }
    }
  }
}
