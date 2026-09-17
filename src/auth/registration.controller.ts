import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ERRORS_MESSAGE } from '../common/error-messages.js';
import { CreateUserDto } from '../users/dto/create-user.dto.js';
import { AuthService } from './auth.service.js';
import { TokensResponseDto } from './dto/tokens-response.dto.js';

/**Регистрация нового пользователя */
@ApiTags('auth')
@Controller('registration')
export class RegistrationController {
  constructor(private authService: AuthService) {}

  @Post()
  @ApiOperation({ summary: 'Регистрация пользователя' })
  @ApiCreatedResponse({
    description: 'Пользователь создан, выдана пара токенов',
    type: TokensResponseDto,
  })
  @ApiBadRequestResponse({
    description: ERRORS_MESSAGE.DATA_NOT_VALID,
  })
  @ApiConflictResponse({
    description: ERRORS_MESSAGE.DOUBLE,
  })
  create(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }
}
