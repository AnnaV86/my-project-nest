import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1789129410794 implements MigrationInterface {
  name = 'CreateUsers1789129410794';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" SERIAL NOT NULL, "login" character varying NOT NULL, "email" character varying NOT NULL, "passwordHash" text NOT NULL, "age" integer NOT NULL, "description" character varying(1000) NOT NULL, CONSTRAINT "UQ_2d443082eccd5198f95f2a36e2c" UNIQUE ("login"), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
