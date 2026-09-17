import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

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
    minLength: 1,
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  password?: string;

  @ApiPropertyOptional({
    description: 'Возраст пользователя',
    example: 25,
    type: 'integer',
    minimum: 0,
  })
  @IsInt()
  @Min(0)
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
