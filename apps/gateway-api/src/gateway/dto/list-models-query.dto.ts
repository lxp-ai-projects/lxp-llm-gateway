import { IsIn, IsOptional } from 'class-validator';
import { PROVIDER_IDS, type ProviderId } from '@lxp/domain';

export class ListModelsQueryDto {
  @IsOptional()
  @IsIn(PROVIDER_IDS)
  providerId?: ProviderId;
}
