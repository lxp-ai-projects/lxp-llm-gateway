import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export const INSTALLATION_STATE_SINGLETON_ID = 'global';

export type InstallationStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

@Entity({ name: 'installation_state' })
export class InstallationStateEntity {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  id!: string;

  @Column({ type: 'varchar', length: 20 })
  status!: InstallationStatus;

  @Column({
    name: 'setup_started_at',
    type: 'timestamptz',
    nullable: true,
  })
  setupStartedAt!: Date | null;

  @Column({
    name: 'setup_completed_at',
    type: 'timestamptz',
    nullable: true,
  })
  setupCompletedAt!: Date | null;

  @Column({
    name: 'completed_by_user_id',
    type: 'uuid',
    nullable: true,
  })
  completedByUserId!: string | null;

  @Column({
    name: 'app_version',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  appVersion!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
