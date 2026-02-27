import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiHeader,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { ConversationService } from './conversation.service';
import { CreateConversationDto, ConversationResponseDto } from './dto';

@ApiTags('Conversations')
@ApiHeader({ name: 'X-API-Key', required: false, description: 'API key for authentication' })
@UseGuards(ApiKeyGuard)
@Controller('api/conversations')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Get()
  @ApiOperation({ summary: 'List all conversations' })
  @ApiResponse({
    status: 200,
    description: 'List of conversations',
    type: [ConversationResponseDto],
  })
  async list(): Promise<ConversationResponseDto[]> {
    return this.conversationService.list();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiResponse({
    status: 201,
    description: 'Conversation created',
    type: ConversationResponseDto,
  })
  async create(
    @Body() dto: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    return this.conversationService.create(dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a conversation and all its messages' })
  @ApiResponse({ status: 200, description: 'Conversation deleted' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async delete(@Param('id') id: string): Promise<{ deleted: boolean }> {
    await this.conversationService.delete(id);
    return { deleted: true };
  }
}
