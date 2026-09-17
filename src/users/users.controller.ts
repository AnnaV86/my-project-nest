import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard.js';
import { ERRORS_MESSAGE } from '../common/error-messages.js';
import { GetUsersQueryDto } from './dto/get-users-query.dto.js';
import { GetUsersResponseDto } from './dto/get-users-response.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Access-токен отсутствует, недействителен или истёк',
})
@Controller('user')
export class UserController {
  constructor(private userService: UsersService) {}

  /** Информация о всех пользователях */
  @ApiOperation({ summary: 'Получить список пользователей' })
  @ApiOkResponse({
    description: 'Выдана список пользователей',
    type: GetUsersResponseDto,
  })
  @ApiBadRequestResponse({
    description: ERRORS_MESSAGE.DATA_NOT_VALID,
  })
  @Get('all')
  @UseGuards(AuthGuard)
  getUserAll(@Query() query: GetUsersQueryDto) {
    return this.userService.getUsers(query);
  }
}
