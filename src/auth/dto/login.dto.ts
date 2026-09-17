import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Уникальный логин пользователя',
    example: 'Anna',
    minLength: 1,
  })
  @IsString()
  @IsNotEmpty()
  login: string;

  @ApiProperty({
    description: 'Пароль',
    example: 'ExamplE11!',
    format: 'password',
    minLength: 1,
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
