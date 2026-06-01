import { IsNumber, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class CreateTrackedDto {
  @IsString()
  marketplace!: string;

  @IsString()
  title!: string;

  @IsUrl()
  productUrl!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  targetPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentPrice?: number;
}
