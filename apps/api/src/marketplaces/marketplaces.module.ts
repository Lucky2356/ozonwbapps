import { Module } from '@nestjs/common';
import { MarketplacesController } from './marketplaces.controller';

@Module({
  controllers: [MarketplacesController],
})
export class MarketplacesModule {}
