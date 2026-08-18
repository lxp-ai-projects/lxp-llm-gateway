import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'registration_verification_challenges' })
@Index('ix_registration_verification_challenges_tenant_destination', [
  'tenantId',
  'destinationHash',
])
export class RegistrationVerificationChallengeEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'tenant_id', type: 'uuid' }) tenantId!: string;
  @Column({ type: 'varchar', length: 16 }) channel!: 'email';
  @Column({ name: 'destination_hash', type: 'varchar', length: 64 })
  destinationHash!: string;
  @Column({ name: 'code_digest', type: 'varchar', length: 64 })
  codeDigest!: string;
  @Column({ type: 'varchar', length: 40, default: 'registration' })
  purpose!: 'registration';
  @Column({ name: 'expires_at', type: 'timestamptz' }) expiresAt!: Date;
  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt!: Date | null;
  @Column({ name: 'consumed_at', type: 'timestamptz', nullable: true })
  consumedAt!: Date | null;
  @Column({ name: 'invalidated_at', type: 'timestamptz', nullable: true })
  invalidatedAt!: Date | null;
  @Column({ name: 'attempt_count', type: 'integer', default: 0 })
  attemptCount!: number;
  @Column({ name: 'resend_count', type: 'integer', default: 0 })
  resendCount!: number;
  @Column({ name: 'resend_available_at', type: 'timestamptz' })
  resendAvailableAt!: Date;
  @Column({
    name: 'completion_token_digest',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  completionTokenDigest!: string | null;
  @Column({
    name: 'completion_token_expires_at',
    type: 'timestamptz',
    nullable: true,
  })
  completionTokenExpiresAt!: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
