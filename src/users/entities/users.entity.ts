import {
  Column,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
/**Схема user для БД */
@Entity('users')
@Unique('UQ_users_login', ['login'])
@Unique('UQ_users_email', ['email'])
export class User {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;
  @Column({ type: 'varchar' })
  login: string;
  @Column({ type: 'varchar' })
  email: string;
  @Column({ type: 'text' })
  passwordHash: string;
  @Column({ type: 'integer' })
  age: number;
  @Column({ type: 'varchar', length: 1000 })
  description: string;
  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deleted: null | Date;
}
