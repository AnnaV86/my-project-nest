import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/users.entity.js';

@Entity('refresh_sessions')
export class RefreshSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ type: 'integer' })
  userId: number;
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;
  @Column({ type: 'varchar', length: 64, unique: true })
  tokenHash: string;
  @Column({ type: 'timestamptz' })
  expiresAt: Date;
}
