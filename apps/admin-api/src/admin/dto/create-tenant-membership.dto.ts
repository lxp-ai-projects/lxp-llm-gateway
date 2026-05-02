import {
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { TENANT_ROLE_VALUES, type TenantRole } from '@lxp/domain';

export class CreateTenantMembershipDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  displayName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(TENANT_ROLE_VALUES, { each: true })
  roles?: TenantRole[];
}
