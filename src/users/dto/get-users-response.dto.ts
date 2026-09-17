import { ApiProperty } from '@nestjs/swagger';
import { ProfileResponseDto } from './profile-response.dto.js';

export class GetUsersResponseDto {
  @ApiProperty({
    description: 'Список пользователей',
    example: [
      {
        id: 1,
        login: 'Anna',
        email: 'anna@example.com',
        age: 25,
        description: 'Обо мне',
      },
    ],
    type: [ProfileResponseDto],
  })
  items: ProfileResponseDto[];

  @ApiProperty({
    description:
      'Общее количество пользователей с учётом фильтра, до пагинации',
    example: 2,
    type: 'integer',
  })
  total: number;
}
