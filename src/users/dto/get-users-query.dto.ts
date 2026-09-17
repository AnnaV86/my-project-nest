import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

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
    maximum: 100,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Max(100)
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Поиск по части логина без учёта регистра',
    example: 'ann',
  })
  @IsOptional()
  @IsString()
  login?: string;

  @ApiPropertyOptional({
    description: 'Значение фильтра age',
    example: 25,
    type: 'integer',
    minimum: 0,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;
}
