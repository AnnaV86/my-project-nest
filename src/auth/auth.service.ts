import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { ERRORS_MESSAGE } from '../common/error-messages.js';
import { CreateUserDto } from '../users/dto/create-user.dto.js';
import { UsersRepository } from '../users/users.repository.js';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh_token.dto.js';
import { TokenPayload } from './types.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly usersRepository: UsersRepository,
  ) {}
  /** Генерация токенов access и refresh */
  private async generateTokens(userId: number) {
    const payload = { sub: String(userId) };

    const accessToken = await this.jwtService.signAsync(payload);

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
      jwtid: randomUUID(),
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }
  /** Регистрация + выдача токенов */
  async register(dto: CreateUserDto) {
    const user = await this.usersService.register(dto);

    return this.generateTokens(user.id);
  }

  /**Аутентификация + выдача токенов */
  async signIn(dto: LoginDto) {
    const userWithLogin = await this.usersRepository.findByLogin(dto.login);

    if (!userWithLogin) {
      throw new UnauthorizedException(ERRORS_MESSAGE.UNAUTHORIZED);
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      userWithLogin.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(ERRORS_MESSAGE.UNAUTHORIZED);
    }

    return this.generateTokens(userWithLogin.id);
  }
  /** Обновление токенов */
  async refreshToken(dto: RefreshTokenDto) {
    const secret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
    let payload: TokenPayload;

    try {
      payload = await this.jwtService.verifyAsync(dto.refresh_token, {
        secret,
      });
    } catch {
      throw new UnauthorizedException();
    }

    if (typeof payload.sub !== 'string') {
      throw new UnauthorizedException();
    }

    const userId = +payload.sub;

    const isValid = Number.isSafeInteger(userId) && userId > 0;

    if (!isValid) {
      throw new UnauthorizedException();
    }

    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedException(ERRORS_MESSAGE.USER_NOT_FOUND);
    }

    return this.generateTokens(user.id);
  }
}
