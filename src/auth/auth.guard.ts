import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ERRORS_MESSAGE } from '../common/error-messages.js';
import { UsersRepository } from '../users/users.repository.js';
import { RequestWithUser, TokenPayload } from './types.js';

/** Проверяет заголовок Authorization, и добавляет  request.user = userId, для дальнейшей обработки */

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersRepository: UsersRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    let userId;
    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(token);

      if (typeof payload.sub !== 'string') {
        throw new UnauthorizedException();
      }

      userId = Number(payload.sub);

      const isValid = Number.isSafeInteger(userId) && userId > 0;

      if (!isValid) {
        throw new UnauthorizedException();
      }

      request['user'] = userId;
    } catch {
      throw new UnauthorizedException();
    }

    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedException(ERRORS_MESSAGE.DELETED_USER);
    }

    request.user = userId;

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
