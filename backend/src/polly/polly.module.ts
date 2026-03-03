import { Module } from '@nestjs/common';
import { PollyService } from './polly.service';
import { PollyController } from './polly.controller';

@Module({
  controllers: [PollyController],
  providers: [PollyService],
  exports: [PollyService],
})
export class PollyModule {}
