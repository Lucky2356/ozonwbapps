import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { AuthModule } from './auth/auth.module';
import { SearchModule } from './search/search.module';
import { FavoritesModule } from './favorites/favorites.module';
import { TrackedModule } from './tracked/tracked.module';
import { MarketplacesModule } from './marketplaces/marketplaces.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    QueueModule,
    AuthModule,
    SearchModule,
    FavoritesModule,
    TrackedModule,
    MarketplacesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
