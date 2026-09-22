import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { ERRORS_MESSAGE } from '../../common/error-messages.js';
import { CreateUserDto } from '../../users/dto/create-user.dto.js';
import { UsersRepository } from '../../users/repositories/users.repository.js';
import { UsersService } from '../../users/services/users.service.js';
import { LoginDto } from '../dto/login.dto.js';
import { RefreshTokenDto } from '../dto/refresh_token.dto.js';
import { TokensResponseDto } from '../dto/tokens-response.dto.js';
import { RefreshSessionsRepository } from '../repositories/refresh-sessions.repository.js';
import { TokenPayload } from '../types.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly usersRepository: UsersRepository,
    private readonly sessionRepository: RefreshSessionsRepository,
  ) {}
  /** Регистрация + выдача токенов */
  async register(dto: CreateUserDto): Promise<TokensResponseDto> {
    const user = await this.usersService.register(dto);

    return this.createSession(user.id);
  }

  /**Аутентификация + выдача токенов */
  async signIn(dto: LoginDto): Promise<TokensResponseDto> {
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

    return this.createSession(userWithLogin.id);
  }
  /** Обновление токенов */
  async refreshToken(dto: RefreshTokenDto): Promise<TokensResponseDto> {
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

    const tokens = await this.generateTokens(user.id);

    const { tokenHash: previousTokenHash } = this.hashRefreshToken(
      dto.refresh_token,
    );

    const { tokenHash, expiresAt } = this.hashRefreshToken(
      tokens.refresh_token,
    );

    const rotated = await this.sessionRepository.rotate({
      previousTokenHash,
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    if (!rotated) {
      throw new UnauthorizedException();
    }

    return tokens;
  }

  /**Создание сессии и выдача токенов*/
  private async createSession(userId: number): Promise<TokensResponseDto> {
    const tokens = await this.generateTokens(userId);
    const { tokenHash, expiresAt } = this.hashRefreshToken(
      tokens.refresh_token,
    );

    await this.sessionRepository.create({ userId, tokenHash, expiresAt });
    return tokens;
  }

  /**Создание хэша refresh-токена и expiresAt */
  private hashRefreshToken(token: string): {
    tokenHash: string;
    expiresAt: Date;
  } {
    const payload = this.jwtService.decode<{ exp: number }>(token);

    const expiresAt = new Date(payload.exp * 1000);

    return {
      tokenHash: createHash('sha256').update(token).digest('hex'),
      expiresAt,
    };
  }

  /** Генерация токенов access и refresh */
  private async generateTokens(userId: number): Promise<TokensResponseDto> {
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
}
