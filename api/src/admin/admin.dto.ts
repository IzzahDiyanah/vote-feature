import { RequestStatus } from '@prisma/client';
import { IsEnum, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { Trim } from '../common/decorators';

export class UpdateStatusDto {
  @IsEnum(RequestStatus)
  status!: RequestStatus;
}

export class OfficialResponseDto {
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;
}

export class MergeDto {
  /** The request to keep. The one in the URL is the duplicate. */
  @IsUUID()
  targetId!: string;
}
