import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { Trim } from '../common/decorators';

export class RegisterDto {
  @Trim()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  // bcrypt only uses the first 72 bytes, so we cap the length there.
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}

export class LoginDto {
  @Trim()
  @IsEmail()
  email!: string;

  @IsString()
  @MaxLength(72)
  password!: string;
}
