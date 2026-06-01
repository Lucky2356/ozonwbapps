import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'change_me',
      // expiresIn принимает строку формата ms ('7d', '15m') или число секунд.
      // @nestjs/jwt 11 типизирует это строго, а из env приходит string — приводим тип.
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as `${number}${'d' | 'h' | 'm' | 's'}` },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
