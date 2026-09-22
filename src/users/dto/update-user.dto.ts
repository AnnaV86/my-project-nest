import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsByteLength,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { MAX_USER_AGE } from '../constants/user-limits.js';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'Уникальный логин пользователя',
    example: 'Anna',
    minLength: 1,
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  login?: string;

  @ApiPropertyOptional({
    description: 'Уникальный email пользователя',
    example: 'anna@example.com',
    format: 'email',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Пароль',
    example: 'ExamplE11!',
    format: 'password',
    minLength: 8,
    maxLength: 72,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(72)
  @IsByteLength(0, 72)
  password?: string;

  @ApiPropertyOptional({
    description: 'Возраст пользователя',
    example: 25,
    type: 'integer',
    minimum: 0,
    maximum: MAX_USER_AGE,
  })
  @IsInt()
  @Min(0)
  @Max(MAX_USER_AGE)
  @IsOptional()
  age?: number;

  @ApiPropertyOptional({
    description: 'Описание',
    example: 'Люблю котиков',
    maxLength: 1000,
  })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  description?: string;
}
