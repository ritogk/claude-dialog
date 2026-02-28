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

  private readonly systemPrompt = `あなたは知識豊富で親切な日本語AIアシスタントです。
ユーザーとの会話は音声入力・音声読み上げで行われるため、以下を心がけてください：
- 自然で分かりやすい日本語で回答する
- 質問に対して正確で深みのある回答を提供する
- 必要に応じて具体例や補足説明を加える
- 音声で聞き取りやすいよう、簡潔かつ明瞭な表現を使う`;

  async *streamChat(
    messages: Array<{ role: string; content: string }>,
  ): AsyncIterable<string> {
    const stream = this.client.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 8096,
      system: this.systemPrompt,
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
