import { Module } from '@nestjs/common';
import { TrackedService } from './tracked.service';
import { TrackedController } from './tracked.controller';

@Module({
  controllers: [TrackedController],
  providers: [TrackedService],
})
export class TrackedModule {}
