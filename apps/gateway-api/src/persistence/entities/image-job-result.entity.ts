import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'image_job_results' })
@Index('ix_image_job_results_job_id_result_index', ['jobId', 'resultIndex'], {
  unique: true,
})
export class ImageJobResultEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'job_id', type: 'uuid' })
  jobId!: string;

  @Column({ name: 'asset_id', type: 'uuid' })
  assetId!: string;

  @Column({ name: 'result_index', type: 'integer' })
  resultIndex!: number;

  @Column({ name: 'revised_prompt', type: 'text', nullable: true })
  revisedPrompt!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
