import { IsBoolean } from 'class-validator';
import type { GatewayVideoAssetSaveRequest } from '@lxp/contracts';

export class VideoAssetSaveRequestDto implements GatewayVideoAssetSaveRequest {
  @IsBoolean()
  saved!: boolean;
}
