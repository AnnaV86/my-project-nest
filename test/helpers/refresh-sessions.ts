import { vi } from 'vitest';
import type {
  CreateRefreshSessionData,
  RefreshSessionsRepository,
  RotateRefreshSessionData,
} from '../../src/auth/repositories/refresh-sessions.repository.js';

export function createRefreshSessionsRepositoryMock() {
  return {
    create: vi
      .fn<RefreshSessionsRepository['create']>()
      .mockResolvedValue(undefined),
    rotate: vi
      .fn<RefreshSessionsRepository['rotate']>()
      .mockResolvedValue(false),
  };
}

export function createInMemoryRefreshSessionsRepository() {
  const sessions = new Map<string, CreateRefreshSessionData>();

  return {
    create(data: CreateRefreshSessionData): Promise<void> {
      sessions.set(data.tokenHash, { ...data });
      return Promise.resolve();
    },
    rotate(data: RotateRefreshSessionData): Promise<boolean> {
      const session = sessions.get(data.previousTokenHash);

      if (
        !session ||
        session.userId !== data.userId ||
        session.expiresAt.getTime() <= Date.now()
      ) {
        return Promise.resolve(false);
      }

      sessions.delete(data.previousTokenHash);
      sessions.set(data.tokenHash, {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      });
      return Promise.resolve(true);
    },
    clear(): void {
      sessions.clear();
    },
  } satisfies RefreshSessionsRepository & { clear(): void };
}
