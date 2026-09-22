import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ERRORS_MESSAGE } from '../../common/error-messages.js';
import { CreateUserDto } from '../../users/dto/create-user.dto.js';
import { UserConflictResponseDto } from '../../users/dto/user-conflict-response.dto.js';
import { TokensResponseDto } from '../dto/tokens-response.dto.js';
import { AuthService } from '../services/auth.service.js';

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
    description: 'Email или логин уже используется; поле указано в field',
    type: UserConflictResponseDto,
  })
  create(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }
}
