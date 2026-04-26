import { IsString, MinLength } from 'class-validator';
import type { GatewayImageAssetUpdateRequest } from '@lxp/contracts';

export class ImageAssetUpdateRequestDto implements GatewayImageAssetUpdateRequest {
  @IsString()
  @MinLength(1)
  label!: string;
}
