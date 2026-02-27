import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiPropertyOptional({ description: 'Title for the conversation' })
  title?: string;
}

export class ConversationResponseDto {
  @ApiProperty({ description: 'Conversation ID' })
  id!: string;

  @ApiProperty({ description: 'Conversation title' })
  title!: string;

  @ApiProperty({ description: 'Creation timestamp (ISO 8601)' })
  createdAt!: string;

  @ApiProperty({ description: 'Last updated timestamp (ISO 8601)' })
  updatedAt!: string;
}
