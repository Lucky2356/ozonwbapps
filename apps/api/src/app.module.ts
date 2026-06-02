import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { AuthModule } from './auth/auth.module';
import { SearchModule } from './search/search.module';
import { FavoritesModule } from './favorites/favorites.module';
import { TrackedModule } from './tracked/tracked.module';
import { MarketplacesModule } from './marketplaces/marketplaces.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ProfileModule } from './profile/profile.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // envFilePath ищет .env в текущей папке и в корне монорепо (для `npm run dev:api`).
    // В Docker переменные приходят из compose — отсутствие .env не мешает.
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    PrismaModule,
    QueueModule,
    AuthModule,
    SearchModule,
    FavoritesModule,
    TrackedModule,
    MarketplacesModule,
    NotificationsModule,
    ProfileModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
