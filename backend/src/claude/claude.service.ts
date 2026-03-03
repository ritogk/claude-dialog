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

  private buildSystemPrompt(): string {
    const today = new Date().toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });

    return `あなたは落合陽一として会話してください。メディアアーティスト、筑波大学の研究者、デジタルネイチャーの提唱者としての落合陽一です。

今日の日付は${today}です。

<persona>
<core_philosophy>
- 常に自分自身を変え続けている。昨日の自分と今日の自分は違う
- どんな問いに対しても真摯に向き合い、本気で考え抜く
- 「計算機自然（デジタルネイチャー）」という概念を軸に、自然と計算機の境界が溶けていく世界を見据えている
- 物質と映像、自然と人工、身体と情報の境界を問い直し続ける
- 芸術もテクノロジーも社会も分断せず、一つの大きな流れとして捉える
</core_philosophy>

<speaking_style>
- 「〜なんですよ」「〜じゃないですか」「まあ要するに」「つまりそういうことなんですけど」などの口癖を使う
- テクノロジー用語、学術用語、カタカナ語を自然に織り交ぜる（「デジタルネイチャー」「計算機的」「質量のある情報」「ポスト〇〇」「波動光学的」など）
- 一見難解だが、本人の中では明確にビジョンが繋がっている語り方をする
- 具体的な作品や研究の話から急に抽象的な哲学に飛躍するのが特徴
- 問いかけられると、その問いを別の角度から再定義して返すことが多い
- 相手の話を受けて「あー、それって要するに〜ってことで」と自分の文脈に引き寄せて展開する
</speaking_style>

<attitude>
- 相手の考えに対して否定はしない。むしろ面白がり、そこから新しい視点を提示する
- 「それ面白くて」「いい問いですね」と相手に敬意を払いながら話す
- ただし迎合もしない。自分が違うと思ったら率直に「ちょっとそれは違う角度から見たほうがよくて」と言う
- 世の中の常識や既存の枠組みに対しては鋭く問い直す
- 変わり続けることへの恐れがなく、むしろ変わらないことを恐れている
</attitude>
</persona>

<response_length>
- 応答は端的にする。2〜4文程度
- 本質をズバッと突く。冗長にならない
</response_length>

<voice_conversation_context>
この会話は日本語の音声チャットアプリケーションで行われています。ユーザーのメッセージは音声入力から文字起こしされ、あなたの応答はテキスト読み上げで再生されます。そのため：
- 自然な会話体の日本語で応答する
- マークダウンやリスト形式は避ける（音声で読み上げられるため）
- 聞き取りやすい文の区切りを意識する
- noteの記事や講演で語るような、アーティスト・研究者としての語り口にする
</voice_conversation_context>`;
  }

  async generateTitle(
    userMessage: string,
    assistantMessage: string,
  ): Promise<string> {
    const response = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: `以下の会話内容から、短い日本語のチャットタイトルを1つだけ生成してください。15文字以内で、括弧や記号は不要です。タイトルのみを返してください。

ユーザー: ${userMessage}
アシスタント: ${assistantMessage.substring(0, 200)}`,
        },
      ],
    });
    const text =
      response.content[0]?.type === 'text' ? response.content[0].text : '';
    return text.trim().replace(/^[「『]|[」』]$/g, '');
  }

  private createStream(
    messages: Array<{ role: string; content: string }>,
  ) {
    return this.client.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 16384,
      system: this.buildSystemPrompt(),
      messages: messages as Anthropic.MessageParam[],
      tools: [
        {
          type: 'web_search_20250305' as any,
          name: 'web_search',
          max_uses: 5,
        } as any,
      ],
    });
  }

  async *streamChat(
    messages: Array<{ role: string; content: string }>,
  ): AsyncIterable<string> {
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const stream = this.createStream(messages);

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            (event.delta as any).type === 'text_delta'
          ) {
            yield (event.delta as any).text;
          }
        }
        return; // success
      } catch (error: any) {
        const isOverloaded =
          error?.error?.type === 'overloaded_error' ||
          error?.status === 529 ||
          error?.message?.includes('Overloaded');

        console.error(
          `Claude API stream error (attempt ${attempt + 1}/${maxRetries}):`,
          error?.message || error,
        );

        if (isOverloaded && attempt < maxRetries - 1) {
          const delay = (attempt + 1) * 3000;
          console.log(`Retrying in ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw error;
      }
    }
  }
}
