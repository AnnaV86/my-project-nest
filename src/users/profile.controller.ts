import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard.js';
import type { RequestWithUser } from '../auth/types.js';
import { ERRORS_MESSAGE } from '../common/error-messages.js';
import { ProfileResponseDto } from './dto/profile-response.dto.js';
import { UpdateProfileDto } from './dto/update-user.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('profile')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Access-токен отсутствует, недействителен или истёк',
})
@Controller('profile')
export class ProfileController {
  constructor(private userService: UsersService) {}

  /**Информация профиля с проверкой токена в заголовке */
  @ApiOperation({ summary: 'Информация о пользователе' })
  @ApiOkResponse({
    description: 'Выдана информация о пользователе',
    type: ProfileResponseDto,
  })
  @ApiNotFoundResponse({ description: ERRORS_MESSAGE.USER_NOT_FOUND })
  @Get('my')
  @UseGuards(AuthGuard)
  getUsers(@Req() request: RequestWithUser) {
    if (!request.user) {
      throw new UnauthorizedException();
    }

    return this.userService.getProfile(request.user);
  }

  /**Изменение профиля */
  @ApiOperation({ summary: 'Изменение профиля' })
  @ApiOkResponse({
    description: 'Профиль изменен',
    type: ProfileResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Некорректные данные, пустой запрос или null в полях',
  })
  @ApiNotFoundResponse({ description: ERRORS_MESSAGE.USER_NOT_FOUND })
  @ApiConflictResponse({ description: ERRORS_MESSAGE.DOUBLE })
  @Patch('update')
  @UseGuards(AuthGuard)
  updateProfile(
    @Req() request: RequestWithUser,
    @Body() dto: UpdateProfileDto,
  ) {
    if (!request.user) {
      throw new UnauthorizedException();
    }

    return this.userService.updateProfile(dto, request.user);
  }

  /**Удаление профиля */
  @ApiOperation({ summary: 'Удаление профиля' })
  @ApiNoContentResponse({
    description: 'Профиль удален',
  })
  @ApiNotFoundResponse({ description: ERRORS_MESSAGE.USER_NOT_FOUND })
  @Delete('delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard)
  deleteProfile(@Req() request: RequestWithUser): Promise<void> {
    if (!request.user) {
      throw new UnauthorizedException();
    }

    return this.userService.deleteProfile(request.user);
  }
}
