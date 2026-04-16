import { IsIn, IsOptional } from 'class-validator';

export class ListModelsQueryDto {
  @IsOptional()
  @IsIn(['nanogpt'])
  providerId?: 'nanogpt';
}
