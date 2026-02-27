import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { HealthController } from './health.controller';
import { DynamoModule } from './dynamo/dynamo.module';
import { AuthModule } from './auth/auth.module';
import { ClaudeModule } from './claude/claude.module';
import { ConversationModule } from './conversation/conversation.module';
import { MessageModule } from './message/message.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    DynamoModule,
    AuthModule,
    ClaudeModule,
    ConversationModule,
    MessageModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
