import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateProfileDto {
  /** Chat ID Telegram (число строкой) или пустая строка/null, чтобы отключить. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  telegramChatId?: string | null;

  /** Порог снижения цены в % для уведомления (0..90). */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(90)
  priceDropThresholdPercent?: number;

  /** Дайджест снижений в Telegram. */
  @IsOptional()
  @IsIn(['off', 'daily', 'weekly'])
  telegramDigest?: 'off' | 'daily' | 'weekly';
}
