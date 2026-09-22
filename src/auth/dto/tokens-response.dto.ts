import { ApiProperty } from '@nestjs/swagger';

export class TokensResponseDto {
  @ApiProperty({ description: 'Access-токен' })
  access_token: string;
  @ApiProperty({
    description: 'Refresh-токен',
  })
  refresh_token: string;
}
