import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'user_provider_credentials' })
@Index(
  'ux_user_provider_credentials_active',
  ['userId', 'providerId', 'label'],
  {
    unique: true,
  },
)
export class UserProviderCredentialEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'provider_id', type: 'uuid' })
  providerId!: string;

  @Column({ type: 'varchar', length: 100 })
  label!: string;

  @Column({ name: 'encrypted_secret', type: 'text' })
  encryptedSecret!: string;

  @Column({ type: 'varchar', length: 24 })
  iv!: string;

  @Column({ name: 'auth_tag', type: 'varchar', length: 24 })
  authTag!: string;

  @Column({ name: 'key_version', type: 'integer' })
  keyVersion!: number;

  @Column({ name: 'is_active', type: 'boolean' })
  isActive!: boolean;

  @Column({ name: 'masked_hint', type: 'varchar', length: 20, nullable: true })
  maskedHint!: string | null;
}
