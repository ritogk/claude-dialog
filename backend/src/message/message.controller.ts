import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiHeader,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { MessageService } from './message.service';
import { SendMessageDto, MessageResponseDto } from './dto';

@ApiTags('Messages')
@ApiHeader({ name: 'X-API-Key', required: false, description: 'API key for authentication' })
@UseGuards(ApiKeyGuard)
@Controller('api/conversations/:conversationId/messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get()
  @ApiOperation({ summary: 'List messages in a conversation' })
  @ApiResponse({
    status: 200,
    description: 'List of messages',
    type: [MessageResponseDto],
  })
  async listByConversation(
    @Param('conversationId') conversationId: string,
  ): Promise<MessageResponseDto[]> {
    return this.messageService.listByConversation(conversationId);
  }

  @Post('stream')
  @ApiOperation({ summary: 'Send a message and stream the response via SSE' })
  @ApiResponse({
    status: 200,
    description: 'SSE stream of assistant response',
  })
  async streamMessage(
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ): Promise<void> {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      for await (const event of this.messageService.sendAndStream(
        conversationId,
        dto.content,
      )) {
        const data = JSON.stringify(event);
        res.write(`data: ${data}\n\n`);
      }
    } catch (error: any) {
      const errorEvent = JSON.stringify({
        type: 'error',
        error: error.message || 'An unexpected error occurred',
      });
      res.write(`data: ${errorEvent}\n\n`);
    }

    res.end();
  }
}
