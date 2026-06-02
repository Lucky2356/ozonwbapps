import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  /** Chat ID Telegram (число строкой) или пустая строка/null, чтобы отключить. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  telegramChatId?: string | null;
}
