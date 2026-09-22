import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
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
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { ERRORS_MESSAGE } from '../../common/error-messages.js';
import { CurrentUserId } from '../decorators/current-user-id.decorator.js';
import { ProfileResponseDto } from '../dto/profile-response.dto.js';
import { UpdateProfileDto } from '../dto/update-user.dto.js';
import { UserConflictResponseDto } from '../dto/user-conflict-response.dto.js';
import { UsersService } from '../services/users.service.js';

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
  getUsers(@CurrentUserId() userId: number) {
    return this.userService.getProfile(userId);
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
  @ApiConflictResponse({
    description: 'Email или логин уже используется; поле указано в field',
    type: UserConflictResponseDto,
  })
  @Patch('update')
  @UseGuards(AuthGuard)
  updateProfile(
    @CurrentUserId() userId: number,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(dto, userId);
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
  deleteProfile(@CurrentUserId() userId: number): Promise<void> {
    return this.userService.deleteProfile(userId);
  }
}
