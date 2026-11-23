import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Trim } from '../common/decorators';

export class CreateCommentDto {
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  body!: string;
}

export class ListCommentsQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 50;
}
