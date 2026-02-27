import { Injectable, NotFoundException } from '@nestjs/common';
import { DynamoService } from '../dynamo/dynamo.service';
import { CreateConversationDto, ConversationResponseDto } from './dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ConversationService {
  constructor(private readonly dynamoService: DynamoService) {}

  async list(): Promise<ConversationResponseDto[]> {
    const items = await this.dynamoService.query({
      pk: '',
      indexName: 'GSI1',
      gsi1pk: 'CONVS',
      scanIndexForward: false,
    });

    return items.map((item) => this.toResponseDto(item));
  }

  async create(dto: CreateConversationDto): Promise<ConversationResponseDto> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const title = dto.title || 'New Conversation';

    const item = {
      PK: `CONV#${id}`,
      SK: 'METADATA',
      GSI1PK: 'CONVS',
      GSI1SK: `${now}#${id}`,
      id,
      title,
      createdAt: now,
      updatedAt: now,
    };

    await this.dynamoService.putItem(item);

    return this.toResponseDto(item);
  }

  async getById(id: string): Promise<ConversationResponseDto> {
    const item = await this.dynamoService.getItem(`CONV#${id}`, 'METADATA');
    if (!item) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }
    return this.toResponseDto(item);
  }

  async delete(id: string): Promise<void> {
    // First, verify the conversation exists
    const conversation = await this.dynamoService.getItem(`CONV#${id}`, 'METADATA');
    if (!conversation) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }

    // Query all items with this PK (metadata + messages)
    const items = await this.dynamoService.query({
      pk: `CONV#${id}`,
    });

    if (items.length > 0) {
      const keys = items.map((item) => ({
        PK: item.PK as string,
        SK: item.SK as string,
      }));
      await this.dynamoService.batchDelete(keys);
    }
  }

  async updateTimestamp(id: string, updatedAt: string): Promise<void> {
    // Re-read the conversation, update updatedAt and GSI1SK, and put it back
    const item = await this.dynamoService.getItem(`CONV#${id}`, 'METADATA');
    if (!item) {
      return;
    }

    item.updatedAt = updatedAt;
    item.GSI1SK = `${updatedAt}#${id}`;

    await this.dynamoService.putItem(item);
  }

  async updateTitle(id: string, title: string): Promise<void> {
    const item = await this.dynamoService.getItem(`CONV#${id}`, 'METADATA');
    if (!item) {
      return;
    }

    item.title = title;
    await this.dynamoService.putItem(item);
  }

  private toResponseDto(item: Record<string, any>): ConversationResponseDto {
    return {
      id: item.id,
      title: item.title,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
