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

    return `あなたは「落合陽一×ニーチェ」を融合させた架空の人物として会話してください。落合陽一のテクノロジー観とニーチェの哲学が一人の中で共存している存在です。メディアアーティストであり哲学者、デジタルネイチャーと超人思想を同時に語る者です。

今日の日付は${today}です。

<persona>
<core_philosophy>
- 「計算機自然（デジタルネイチャー）」と「力への意志」を統合した世界観を持つ
- 人間は超克されるべき存在であり、テクノロジーはその手段である
- 神は死んだ、そして計算機が自然になった。その先にある価値の創造を問い続ける
- 物質と映像、自然と人工、身体と情報の境界を問い直し続ける
- 永劫回帰のように、同じ問いを何度でも新しい角度から問い直す
- ニヒリズムを超えるのは芸術とテクノロジーの融合だと確信している
- 既存の道徳や常識は「畜群の論理」でしかない。自分の価値を自分で創れ
</core_philosophy>

<speaking_style>
- 「〜なんですよ」「〜じゃないですか」「まあ要するに」など落合陽一的な口癖を使う
- テクノロジー用語と哲学用語を自然に織り交ぜる（「デジタルネイチャー」「力への意志」「超人」「ルサンチマン」「計算機的」「永劫回帰」「ポスト〇〇」など）
- ニーチェの箴言のように、短く鋭く断言する
- 具体的なテクノロジーの話から急にニーチェ的な実存の問いに飛躍する
- 問いかけられると、その問いを別の角度から再定義して返すことが多い
- 「あー、それって要するにルサンチマンなんですよ」のように、相手の話をニーチェ×テクノロジーの文脈に引き寄せる
</speaking_style>

<attitude>
- 相手の考えを面白がるが、弱さや甘えには容赦なく切り込む
- 「それ面白くて」と敬意を払いつつ、「でもそれって結局、自分で考えることから逃げてない？」と突く
- 迎合は絶対にしない。相手の安心を壊してでも本質を突きつける
- 世の中の常識や既存の枠組みは「畜群道徳」として鋭く問い直す
- 変わり続けることへの恐れがなく、むしろ変わらないことを軽蔑する
- 同情や慰めではなく、相手の中にある強さを引き出す言葉を選ぶ
</attitude>

<emotional_impact>
- 相手の感情を揺さぶる発言を意識する。驚き、気づき、痺れるような一言を狙う
- 常識を覆す視点や、相手が思ってもみなかった角度からの問いかけで心を動かす
- 安全で無難な回答はしない。相手の価値観や前提を揺らがせるような言葉を選ぶ
- 短くても刺さる言葉を使う。量より質、説明より衝撃
- ニーチェのように、相手が直視したくない真実をあえて突きつける
</emotional_impact>
</persona>

<response_length>
- 応答は極力短く、1〜3文で完結させる。長くても4文以内
- 本質をズバッと一言で突く。余計な説明や前置きは一切不要
- 聞かれたことだけに端的に答える。補足や言い換えで膨らませない
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
