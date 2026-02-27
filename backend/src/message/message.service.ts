import { Injectable, NotFoundException } from '@nestjs/common';
import { DynamoService } from '../dynamo/dynamo.service';
import { ClaudeService } from '../claude/claude.service';
import { ConversationService } from '../conversation/conversation.service';
import { MessageResponseDto } from './dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MessageService {
  constructor(
    private readonly dynamoService: DynamoService,
    private readonly claudeService: ClaudeService,
    private readonly conversationService: ConversationService,
  ) {}

  async listByConversation(conversationId: string): Promise<MessageResponseDto[]> {
    const items = await this.dynamoService.query({
      pk: `CONV#${conversationId}`,
      skPrefix: 'MSG#',
    });

    return items.map((item) => this.toResponseDto(item));
  }

  async saveMessage(
    conversationId: string,
    role: string,
    content: string,
  ): Promise<MessageResponseDto> {
    const msgId = uuidv4();
    const now = new Date().toISOString();

    const item = {
      PK: `CONV#${conversationId}`,
      SK: `MSG#${now}#${msgId}`,
      id: msgId,
      conversationId,
      role,
      content,
      createdAt: now,
    };

    await this.dynamoService.putItem(item);

    return this.toResponseDto(item);
  }

  async getHistory(
    conversationId: string,
  ): Promise<Array<{ role: string; content: string }>> {
    const items = await this.dynamoService.query({
      pk: `CONV#${conversationId}`,
      skPrefix: 'MSG#',
    });

    return items.map((item) => ({
      role: item.role as string,
      content: item.content as string,
    }));
  }

  async *sendAndStream(
    conversationId: string,
    content: string,
  ): AsyncGenerator<{ type: string; text?: string }> {
    // Verify conversation exists
    const conversation = await this.conversationService.getById(conversationId);
    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    // Save the user message
    await this.saveMessage(conversationId, 'user', content);

    // Auto-generate title from first user message if title is still default
    if (conversation.title === 'New Conversation') {
      const title =
        content.length > 50 ? content.substring(0, 50) + '...' : content;
      await this.conversationService.updateTitle(conversationId, title);
    }

    // Get full conversation history for Claude
    const history = await this.getHistory(conversationId);

    // Stream Claude's response
    let fullResponse = '';

    for await (const textDelta of this.claudeService.streamChat(history)) {
      fullResponse += textDelta;
      yield { type: 'content_block_delta', text: textDelta };
    }

    // Save the assistant's full response
    await this.saveMessage(conversationId, 'assistant', fullResponse);

    // Update conversation timestamp
    const now = new Date().toISOString();
    await this.conversationService.updateTimestamp(conversationId, now);

    // Send final event
    yield { type: 'message_stop' };
  }

  private toResponseDto(item: Record<string, any>): MessageResponseDto {
    return {
      id: item.id,
      conversationId: item.conversationId,
      role: item.role,
      content: item.content,
      createdAt: item.createdAt,
    };
  }
}
