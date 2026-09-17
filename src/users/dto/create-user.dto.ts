import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'Уникальный логин пользователя',
    example: 'Anna',
    minLength: 1,
  })
  @IsString()
  @IsNotEmpty()
  login: string;

  @ApiProperty({
    description: 'Уникальный email пользователя',
    example: 'anna@example.com',
    format: 'email',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Пароль',
    example: 'ExamplE11!',
    format: 'password',
    minLength: 1,
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description: 'Возраст пользователя',
    example: 25,
    type: 'integer',
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  age: number;

  @ApiProperty({
    description: 'Описание',
    example: 'Люблю котиков',
    maxLength: 1000,
  })
  @IsString()
  @MaxLength(1000)
  description: string;
}
