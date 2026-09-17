import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { QueryFailedError } from 'typeorm';
import { ERRORS_MESSAGE } from '../common/error-messages.js';
import type { CreateUserDto } from './dto/create-user.dto.js';
import { GetUsersQueryDto } from './dto/get-users-query.dto.js';
import { UpdateProfileDto } from './dto/update-user.dto.js';
import { UpdateUserData } from './types.js';
import { UsersRepository } from './users.repository.js';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}
  /**Регистрация (проверка на дубли email и логин) + хэш пароля + сохранение пользователя */
  async register(dto: CreateUserDto) {
    const userWithEmail = await this.usersRepository.findByEmail(dto.email);
    // email занят
    if (userWithEmail) {
      throw new ConflictException(ERRORS_MESSAGE.DOUBLE);
    }

    const userWithLogin = await this.usersRepository.findByLogin(dto.login);
    // логин занят
    if (userWithLogin) {
      throw new ConflictException(ERRORS_MESSAGE.DOUBLE);
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
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(ERRORS_MESSAGE.DOUBLE);
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
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(ERRORS_MESSAGE.DOUBLE);
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
    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(password, salt);

    return hash;
  }

  /** Проверка на уникальность */
  private isUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError: unknown = error.driverError;

    return (
      typeof driverError === 'object' &&
      driverError !== null &&
      'code' in driverError &&
      driverError.code === '23505'
    );
  }
}
