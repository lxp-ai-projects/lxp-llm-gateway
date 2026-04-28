import { IsOptional, IsString, MinLength } from 'class-validator';
import type { GatewayImageAssetUploadRequest } from '@lxp/contracts';

export class ImageAssetUploadRequestDto implements GatewayImageAssetUploadRequest {
  @IsString()
  @MinLength(1)
  dataUrl!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  label?: string;
}
