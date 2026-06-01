import { IsNumber, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class CreateFavoriteDto {
  @IsString()
  marketplace!: string;

  @IsString()
  title!: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsNumber()
  oldPrice?: number;

  @IsOptional()
  @IsNumber()
  rating?: number;

  @IsOptional()
  @IsNumber()
  reviewsCount?: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsUrl()
  productUrl!: string;
}
