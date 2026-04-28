import { IsBoolean } from 'class-validator';
import type { GatewayImageAssetSaveRequest } from '@lxp/contracts';

export class ImageAssetSaveRequestDto implements GatewayImageAssetSaveRequest {
  @IsBoolean()
  saved!: boolean;
}
