import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'The message content to send to Claude' })
  content!: string;
}

export class MessageResponseDto {
  @ApiProperty({ description: 'Message ID' })
  id!: string;

  @ApiProperty({ description: 'Conversation ID' })
  conversationId!: string;

  @ApiProperty({ description: 'Role: user or assistant' })
  role!: string;

  @ApiProperty({ description: 'Message content' })
  content!: string;

  @ApiProperty({ description: 'Creation timestamp (ISO 8601)' })
  createdAt!: string;
}
