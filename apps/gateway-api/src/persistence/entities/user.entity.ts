import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('ux_users_user_uuid', { unique: true })
  @Column({ name: 'user_uuid', type: 'uuid' })
  userUuid!: string;

  @Index('ux_users_email_hash', { unique: true })
  @Column({ name: 'email_hash', type: 'varchar', length: 64 })
  emailHash!: string;

  @Column({ type: 'varchar', length: 30 })
  status!: 'active' | 'disabled';
}
