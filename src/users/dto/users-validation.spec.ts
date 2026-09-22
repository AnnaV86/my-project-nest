import { BadRequestException, ValidationPipe } from '@nestjs/common';
import {
  invalidPasswordCases,
  validPasswordCases,
} from '../../../test/helpers/passwords.js';
import { registrationData } from '../../../test/helpers/users.js';
import { CreateUserDto } from './create-user.dto.js';
import { GetUsersQueryDto } from './get-users-query.dto.js';
import { UpdateProfileDto } from './update-user.dto.js';

describe('Валидация DTO пользователей', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true });

  describe('CreateUserDto', () => {
    it.each(validPasswordCases)(
      'Принимает пароль: $name',
      async ({ password }) => {
        const data = { ...registrationData, password };

        await expect(
          pipe.transform(data, { type: 'body', metatype: CreateUserDto }),
        ).resolves.toEqual(data);
      },
    );

    it.each(invalidPasswordCases)(
      'Отклоняет пароль: $name',
      async ({ password }) => {
        await expect(
          pipe.transform(
            { ...registrationData, password },
            { type: 'body', metatype: CreateUserDto },
          ),
        ).rejects.toThrow(BadRequestException);
      },
    );

    it('Принимает корректные данные, включая возраст 0 и описание из 1000 символов', async () => {
      const data = {
        ...registrationData,
        age: 0,
        description: 'a'.repeat(1000),
      };

      await expect(
        pipe.transform(data, { type: 'body', metatype: CreateUserDto }),
      ).resolves.toEqual(data);
    });

    it('Принимает максимальный допустимый возраст 150', async () => {
      const data = { ...registrationData, age: 150 };

      await expect(
        pipe.transform(data, { type: 'body', metatype: CreateUserDto }),
      ).resolves.toEqual(data);
    });

    it.each([
      { login: '' },
      { login: 123 },
      { email: 'not-an-email' },
      { password: '' },
      { age: -1 },
      { age: 1.5 },
      { age: '25' },
      { age: 151 },
      { description: 'a'.repeat(1001) },
      { description: null },
    ])('Отклоняет некорректные поля: %j', async (invalidFields) => {
      await expect(
        pipe.transform(
          { ...registrationData, ...invalidFields },
          { type: 'body', metatype: CreateUserDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it.each(['login', 'email', 'password', 'age', 'description'])(
      'Требует обязательное поле %s',
      async (field) => {
        await expect(
          pipe.transform(
            { ...registrationData, [field]: undefined },
            { type: 'body', metatype: CreateUserDto },
          ),
        ).rejects.toThrow(BadRequestException);
      },
    );

    it('Удаляет поля, которыми клиент не должен управлять', async () => {
      await expect(
        pipe.transform(
          {
            ...registrationData,
            id: 99,
            passwordHash: 'injected',
            deleted: new Date(),
          },
          { type: 'body', metatype: CreateUserDto },
        ),
      ).resolves.toEqual(registrationData);
    });
  });

  describe('UpdateProfileDto', () => {
    it.each(validPasswordCases)(
      'Принимает новый пароль: $name',
      async ({ password }) => {
        await expect(
          pipe.transform(
            { password },
            { type: 'body', metatype: UpdateProfileDto },
          ),
        ).resolves.toEqual({ password });
      },
    );

    it.each(invalidPasswordCases)(
      'Отклоняет новый пароль: $name',
      async ({ password }) => {
        await expect(
          pipe.transform(
            { password },
            { type: 'body', metatype: UpdateProfileDto },
          ),
        ).rejects.toThrow(BadRequestException);
      },
    );

    it.each([
      { login: 'NewAnna' },
      { age: 0 },
      { age: 150 },
      { description: '' },
    ])('Принимает частичное обновление: %j', async (data) => {
      await expect(
        pipe.transform(data, { type: 'body', metatype: UpdateProfileDto }),
      ).resolves.toMatchObject(data);
    });

    it.each([
      { login: '' },
      { email: 'wrong-email' },
      { password: '' },
      { age: -1 },
      { age: 151 },
      { description: 'a'.repeat(1001) },
    ])('Отклоняет некорректное обновление: %j', async (data) => {
      await expect(
        pipe.transform(data, { type: 'body', metatype: UpdateProfileDto }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('GetUsersQueryDto', () => {
    it.each(['a', 'ann'])(
      'Принимает непустой фильтр login: %s',
      async (login) => {
        await expect(
          pipe.transform(
            { login },
            { type: 'query', metatype: GetUsersQueryDto },
          ),
        ).resolves.toEqual({ page: 1, login });
      },
    );

    it('Преобразует строки query в числа', async () => {
      await expect(
        pipe.transform(
          { page: '2', limit: '10', age: '0' },
          { type: 'query', metatype: GetUsersQueryDto },
        ),
      ).resolves.toEqual({ page: 2, limit: 10, age: 0 });
    });

    it('Принимает запрос без фильтра login и limit, задавая первую страницу', async () => {
      await expect(
        pipe.transform({}, { type: 'query', metatype: GetUsersQueryDto }),
      ).resolves.toEqual({ page: 1 });
    });

    it('Принимает большой номер страницы и верхние границы возраста и limit', async () => {
      await expect(
        pipe.transform(
          { age: '150', page: String(Number.MAX_SAFE_INTEGER), limit: '100' },
          { type: 'query', metatype: GetUsersQueryDto },
        ),
      ).resolves.toEqual({
        age: 150,
        page: Number.MAX_SAFE_INTEGER,
        limit: 100,
      });
    });

    it.each([
      { login: '' },
      { page: '0' },
      { page: '1.5' },
      { limit: '0' },
      { limit: '-1' },
      { limit: '101' },
      { limit: '1.5' },
      { age: '-1' },
      { age: 'abc' },
      { age: '151' },
    ])('Отклоняет некорректный query: %j', async (query) => {
      await expect(
        pipe.transform(query, { type: 'query', metatype: GetUsersQueryDto }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
