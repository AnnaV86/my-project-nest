import { ApiProperty } from '@nestjs/swagger';

export class ProfileResponseDto {
  @ApiProperty({ description: 'Id пользователя', example: 1, type: 'integer' })
  id: number;
  @ApiProperty({
    description: 'Логин пользователя',
    example: 'Anna',
    type: 'string',
  })
  login: string;
  @ApiProperty({
    description: 'Email пользователя',
    example: 'anna@example.com',
    type: 'string',
    format: 'email',
  })
  email: string;
  @ApiProperty({
    description: 'Возраст пользователя',
    example: 25,
    type: 'integer',
  })
  age: number;
  @ApiProperty({ description: 'Описание', example: 'Обо мне', type: 'string' })
  description: string;
}
