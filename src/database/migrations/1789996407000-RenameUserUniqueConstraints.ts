import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameUserUniqueConstraints1789996407000
  implements MigrationInterface
{
  name = 'RenameUserUniqueConstraints1789996407000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" RENAME CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" TO "UQ_users_email"',
    );
    await queryRunner.query(
      'ALTER TABLE "users" RENAME CONSTRAINT "UQ_2d443082eccd5198f95f2a36e2c" TO "UQ_users_login"',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" RENAME CONSTRAINT "UQ_users_login" TO "UQ_2d443082eccd5198f95f2a36e2c"',
    );
    await queryRunner.query(
      'ALTER TABLE "users" RENAME CONSTRAINT "UQ_users_email" TO "UQ_97672ac88f789774dd47f7c8be3"',
    );
  }
}
