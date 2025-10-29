import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { RoleName } from '@prisma/client';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;

  @IsOptional()
  @IsEnum(RoleName as object)
  role?: RoleName;
}
