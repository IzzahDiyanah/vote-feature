import { RequestStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Trim } from '../common/decorators';

export class CreateRequestDto {
  @Trim()
  @IsString()
  @MinLength(5)
  @MaxLength(120)
  title!: string;

  @Trim()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description!: string;
}

export class UpdateRequestDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(5)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description?: string;
}

export const SORT_OPTIONS = ['newest', 'votes', 'comments'] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export class ListRequestsQuery {
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @IsOptional()
  @IsIn(SORT_OPTIONS)
  sort: SortOption = 'newest';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize: number = 20;
}
