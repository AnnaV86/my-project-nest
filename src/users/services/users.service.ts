import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcrypt';
import { QueryFailedError } from 'typeorm';
import { ERRORS_MESSAGE } from '../../common/error-messages.js';
import type { CreateUserDto } from '../dto/create-user.dto.js';
import { GetUsersQueryDto } from '../dto/get-users-query.dto.js';
import { UpdateProfileDto } from '../dto/update-user.dto.js';
import { UsersRepository } from '../repositories/users.repository.js';
import { UpdateUserData } from '../types.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly config: ConfigService,
  ) {}
  /**Регистрация (проверка на дубли email и логин) + хэш пароля + сохранение пользователя */
  async register(dto: CreateUserDto) {
    const userWithEmail = await this.usersRepository.findByEmail(dto.email);

    if (userWithEmail) {
      throw this.createConflictException('email');
    }

    const userWithLogin = await this.usersRepository.findByLogin(dto.login);

    if (userWithLogin) {
      throw this.createConflictException('login');
    }

    const { password, ...user } = dto;

    const hash = await this.hashPassword(password);

    try {
      const { passwordHash: _passwordHash, ...createdUser } =
        await this.usersRepository.create({
          ...user,
          deleted: null,
          passwordHash: hash,
        });

      return createdUser;
    } catch (error) {
      const field = this.getUniqueConflictField(error);

      if (field) {
        throw this.createConflictException(field);
      }

      throw error;
    }
  }
  /**Поиск данных профиля */
  async getProfile(userId: number) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException();
    }

    const { passwordHash: _passworHash, deleted: _deleted, ...rest } = user;
    return rest;
  }

  /**Запрос всех пользователей (с пагинацией и фильтрацией по age) */
  async getUsers({ page, limit, age, login }: GetUsersQueryDto) {
    const offset = limit !== undefined ? (page - 1) * limit : undefined;

    if (offset !== undefined && !Number.isSafeInteger(offset)) {
      throw new BadRequestException(ERRORS_MESSAGE.DATA_NOT_VALID);
    }

    const [users, total] = await this.usersRepository.findAll({
      offset,
      limit,
      age,
      login,
    });

    return {
      items: users.map(
        ({ passwordHash: _passwordHash, deleted: _deleted, ...user }) => user,
      ),
      total,
    };
  }

  /**Редактирование профиля */
  async updateProfile(dto: UpdateProfileDto, userId: number) {
    const values = Object.values(dto);

    if (!values.some((value) => value !== undefined)) {
      throw new BadRequestException(ERRORS_MESSAGE.UPDATE_DATA_NOT_FOUND);
    }

    if (values.some((value) => value === null)) {
      throw new BadRequestException(ERRORS_MESSAGE.NOT_NULL_PROFILE_FIELDS);
    }

    const { password, ...fields } = dto;
    const data: UpdateUserData = { ...fields };

    if (password !== undefined) {
      data.passwordHash = await this.hashPassword(password);
    }

    try {
      const result = await this.usersRepository.updateProfile(data, userId);

      if (!result.affected) {
        throw new NotFoundException(ERRORS_MESSAGE.USER_NOT_FOUND);
      }

      return this.getProfile(userId);
    } catch (error) {
      const field = this.getUniqueConflictField(error);

      if (field) {
        throw this.createConflictException(field);
      }

      throw error;
    }
  }

  /**Удаление профиля */
  async deleteProfile(userId: number) {
    const result = await this.usersRepository.deleteProfile(userId);

    if (!result.affected) {
      throw new NotFoundException(ERRORS_MESSAGE.USER_NOT_FOUND);
    }
  }

  /**Хэш пароля */
  private async hashPassword(password: string) {
    const rounds = Number(this.config.getOrThrow<string>('BCRYPT_ROUNDS'));

    if (!Number.isInteger(rounds) || rounds < 4 || rounds > 31) {
      throw new Error('BCRYPT_ROUNDS должен быть целым числом от 4 до 31');
    }

    return bcrypt.hash(password, rounds);
  }

  private createConflictException(field: 'email' | 'login'): ConflictException {
    return new ConflictException({
      statusCode: HttpStatus.CONFLICT,
      error: 'Conflict',
      field,
      message:
        field === 'email'
          ? ERRORS_MESSAGE.EMAIL_ALREADY_EXISTS
          : ERRORS_MESSAGE.LOGIN_ALREADY_EXISTS,
    });
  }

  /** Проверка на уникальность */
  private getUniqueConflictField(
    error: unknown,
  ): 'email' | 'login' | undefined {
    if (!(error instanceof QueryFailedError)) {
      return undefined;
    }

    const driverError: unknown = error.driverError;

    if (
      typeof driverError !== 'object' ||
      driverError === null ||
      !('code' in driverError) ||
      driverError.code !== '23505' ||
      !('constraint' in driverError)
    ) {
      return undefined;
    }

    switch (driverError.constraint) {
      case 'UQ_users_email':
        return 'email';

      case 'UQ_users_login':
        return 'login';

      default:
        return undefined;
    }
  }
}
