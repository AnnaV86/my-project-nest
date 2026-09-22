import type { RefreshSession } from '../entities/refresh-session.entity.js';

export type CreateRefreshSessionData = Pick<
  RefreshSession,
  'userId' | 'tokenHash' | 'expiresAt'
>;

export type RotateRefreshSessionData = CreateRefreshSessionData & {
  previousTokenHash: string;
};

export abstract class RefreshSessionsRepository {
  abstract create(data: CreateRefreshSessionData): Promise<void>;
  abstract rotate(data: RotateRefreshSessionData): Promise<boolean>;
}
