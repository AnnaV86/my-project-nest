import { User } from './users.entity.js';

export type FindUsersOptions = {
  offset?: number;
  limit?: number;
  age?: number;
  login?: string;
};

export type UpdateUserData = Partial<Omit<User, 'id'>>;

export type DeleteUserData = UpdateUserData & { delete: Date | null };
