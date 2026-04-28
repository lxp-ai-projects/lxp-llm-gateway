import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImageJobProviderMetadata1713000000002
  implements MigrationInterface
{
  name = 'AddImageJobProviderMetadata1713000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "image_jobs"
      ADD COLUMN "provider_metadata" jsonb
    `);

    await queryRunner.query(`
      ALTER TABLE "image_job_results"
      ADD COLUMN "provider_metadata" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "image_job_results"
      DROP COLUMN "provider_metadata"
    `);

    await queryRunner.query(`
      ALTER TABLE "image_jobs"
      DROP COLUMN "provider_metadata"
    `);
  }
}
