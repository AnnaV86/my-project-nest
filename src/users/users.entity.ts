import {
  Column,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
/**Схема user для БД */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;
  @Column({ type: 'varchar', unique: true })
  login: string;
  @Column({ type: 'varchar', unique: true })
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
