import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SortOption } from '@ozonwb/shared';

export class SearchFiltersDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minReviews?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number | null;
}

const SORTS: SortOption[] = ['best_value', 'price_asc', 'price_desc', 'rating', 'reviews'];

export class CreateSearchDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  query!: string;

  @IsArray()
  @ArrayNotEmpty({ message: 'Выберите хотя бы один маркетплейс' })
  @ArrayMaxSize(20)
  @IsString({ each: true })
  marketplaces!: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => SearchFiltersDto)
  filters?: SearchFiltersDto;

  @IsOptional()
  @IsIn(SORTS)
  sort?: SortOption;
}
