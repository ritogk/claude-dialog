import { Module } from '@nestjs/common';
import { DynamoModule } from '../dynamo/dynamo.module';
import { ClaudeModule } from '../claude/claude.module';
import { ConversationModule } from '../conversation/conversation.module';
import { MessageService } from './message.service';
import { MessageController } from './message.controller';

@Module({
  imports: [DynamoModule, ClaudeModule, ConversationModule],
  controllers: [MessageController],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {}
