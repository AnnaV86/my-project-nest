import { BadRequestException, ValidationPipe } from '@nestjs/common';
import {
  invalidPasswordCases,
  validPasswordCases,
} from '../../../test/helpers/passwords.js';
import { LoginDto } from './login.dto.js';

describe('LoginDto', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true });

  it.each(validPasswordCases)(
    'Принимает пароль: $name',
    async ({ password }) => {
      const data = { login: 'Anna', password };

      await expect(
        pipe.transform(data, { type: 'body', metatype: LoginDto }),
      ).resolves.toEqual(data);
    },
  );

  it.each(invalidPasswordCases)(
    'Отклоняет пароль: $name',
    async ({ password }) => {
      await expect(
        pipe.transform(
          { login: 'Anna', password },
          { type: 'body', metatype: LoginDto },
        ),
      ).rejects.toThrow(BadRequestException);
    },
  );
});
