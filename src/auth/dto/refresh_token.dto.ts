import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh-токен',
    example: 'ewrwerwerrerwerewr',
  })
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}
