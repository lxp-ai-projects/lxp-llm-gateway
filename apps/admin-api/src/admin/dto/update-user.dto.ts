import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { TENANT_ROLE_VALUES, type TenantRole } from '@lxp/domain';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  displayName?: string;

  @IsOptional()
  @IsIn(['active', 'disabled'])
  status?: 'active' | 'disabled';

  @IsOptional()
  @IsArray()
  @IsIn(TENANT_ROLE_VALUES, { each: true })
  roles?: TenantRole[];

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
