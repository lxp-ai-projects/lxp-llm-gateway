import { IsArray, IsIn } from 'class-validator';

export class UpdateGlobalRolesDto {
  @IsArray()
  @IsIn(['super_admin'], { each: true })
  globalRoles!: Array<'super_admin'>;
}
