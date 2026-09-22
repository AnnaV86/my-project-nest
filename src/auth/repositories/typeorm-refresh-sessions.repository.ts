import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { RefreshSession } from '../entities/refresh-session.entity.js';
import {
  CreateRefreshSessionData,
  RefreshSessionsRepository,
  RotateRefreshSessionData,
} from './refresh-sessions.repository.js';

@Injectable()
export class TypeOrmRefreshSessionsRepository extends RefreshSessionsRepository {
  constructor(
    @InjectRepository(RefreshSession)
    private readonly sessionRepository: Repository<RefreshSession>,
  ) {
    super();
  }

  async create(data: CreateRefreshSessionData): Promise<void> {
    const session = this.sessionRepository.create(data);

    await this.sessionRepository.save(session);
  }

  async rotate({
    userId,
    previousTokenHash,
    tokenHash,
    expiresAt,
  }: RotateRefreshSessionData): Promise<boolean> {
    const result = await this.sessionRepository.update(
      {
        userId,
        tokenHash: previousTokenHash,
        expiresAt: MoreThan(new Date()),
      },
      {
        tokenHash,
        expiresAt,
      },
    );

    return result.affected === 1;
  }
}
