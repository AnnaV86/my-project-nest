import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { MAX_USER_AGE, MAX_USERS_LIMIT } from '../constants/user-limits.js';

export class GetUsersQueryDto {
  @ApiPropertyOptional({
    description: 'Номер страницы для фильтрации',
    example: 1,
    type: 'integer',
    minimum: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Количество пользователей',
    example: 10,
    type: 'integer',
    minimum: 1,
    maximum: MAX_USERS_LIMIT,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Max(MAX_USERS_LIMIT)
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Поиск по буквальной части логина без учёта регистра',
    example: 'ann',
    minLength: 1,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  login?: string;

  @ApiPropertyOptional({
    description: 'Значение фильтра age',
    example: 25,
    type: 'integer',
    minimum: 0,
    maximum: MAX_USER_AGE,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_USER_AGE)
  age?: number;
}
