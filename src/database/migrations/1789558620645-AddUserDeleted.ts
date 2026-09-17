import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserDeleted1789558620645 implements MigrationInterface {
  name = 'AddUserDeleted1789558620645';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "deleted" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "deleted"`);
  }
}
