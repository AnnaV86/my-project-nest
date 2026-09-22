import { ApiProperty } from '@nestjs/swagger';
import { ERRORS_MESSAGE } from '../../common/error-messages.js';

export class UserConflictResponseDto {
  @ApiProperty({ enum: [409], example: 409 })
  statusCode: 409;

  @ApiProperty({ enum: ['Conflict'], example: 'Conflict' })
  error: 'Conflict';

  @ApiProperty({ example: ERRORS_MESSAGE.EMAIL_ALREADY_EXISTS })
  message: string;

  @ApiProperty({ enum: ['email', 'login'], example: 'email' })
  field: 'email' | 'login';
}
