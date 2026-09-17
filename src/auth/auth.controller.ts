import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ERRORS_MESSAGE } from '../common/error-messages.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh_token.dto.js';
import { TokensResponseDto } from './dto/tokens-response.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  /** Вход по логину и паролю */
  @ApiOperation({ summary: 'Аутентификация пользователя' })
  @ApiOkResponse({
    description: 'Пользователь аутентифицирован, выдана пара токенов',
    type: TokensResponseDto,
  })
  @ApiBadRequestResponse({
    description: ERRORS_MESSAGE.DATA_NOT_VALID,
  })
  @ApiUnauthorizedResponse({ description: ERRORS_MESSAGE.UNAUTHORIZED })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() signInDto: LoginDto) {
    return this.authService.signIn(signInDto);
  }

  /**Рефреш токенов */
  @ApiOperation({ summary: 'Замена токенов' })
  @ApiOkResponse({
    description: 'Выдана новая пара токенов',
    type: TokensResponseDto,
  })
  @ApiBadRequestResponse({
    description: ERRORS_MESSAGE.DATA_NOT_VALID,
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh-токен недействителен, истёк или пользователь удалён',
  })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }
}
