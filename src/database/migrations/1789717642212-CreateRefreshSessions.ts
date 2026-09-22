import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRefreshSessions1789717642212 implements MigrationInterface {
  name = 'CreateRefreshSessions1789717642212';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "refresh_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" integer NOT NULL, "tokenHash" character varying(64) NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "UQ_2cc521fed1a42c97ac78b1ffb68" UNIQUE ("tokenHash"), CONSTRAINT "PK_9190032f6967b7971dca07d69f3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_sessions" ADD CONSTRAINT "FK_78744bff965517952df6c02da76" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_sessions" DROP CONSTRAINT "FK_78744bff965517952df6c02da76"`,
    );
    await queryRunner.query(`DROP TABLE "refresh_sessions"`);
  }
}
