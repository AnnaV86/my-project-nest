import { ERRORS_MESSAGE } from '../../src/common/error-messages.js';

export const userConflictCases = [
  {
    field: 'email',
    constraint: 'UQ_users_email',
    message: ERRORS_MESSAGE.EMAIL_ALREADY_EXISTS,
  },
  {
    field: 'login',
    constraint: 'UQ_users_login',
    message: ERRORS_MESSAGE.LOGIN_ALREADY_EXISTS,
  },
] as const;
