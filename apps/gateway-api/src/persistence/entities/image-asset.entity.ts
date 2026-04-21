import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'image_assets' })
@Index('ix_image_assets_user_id_created_at', ['userId', 'createdAt'])
export class ImageAssetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'source_type', type: 'varchar', length: 20 })
  sourceType!: 'upload' | 'generated';

  @Column({ type: 'varchar', length: 255, nullable: true })
  label!: string | null;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
  mimeType!: string | null;

  @Column({ name: 'data_url', type: 'text' })
  dataUrl!: string;

  @Column({ name: 'original_url', type: 'text', nullable: true })
  originalUrl!: string | null;

  @Column({ name: 'is_saved', type: 'boolean', default: false })
  isSaved!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
