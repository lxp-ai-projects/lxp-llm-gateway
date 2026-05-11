import {
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class GatewayVideoReferenceDto {
  @IsIn(['image_url', 'data_url', 'asset'])
  type!: 'image_url' | 'data_url' | 'asset';

  @ValidateIf((value: GatewayVideoReferenceDto) => value.type !== 'asset')
  @IsString()
  @MinLength(1)
  url?: string;

  @ValidateIf((value: GatewayVideoReferenceDto) => value.type === 'data_url')
  @IsOptional()
  @IsString()
  @MinLength(1)
  mimeType?: string;

  @ValidateIf((value: GatewayVideoReferenceDto) => value.type === 'asset')
  @IsString()
  @MinLength(1)
  assetId?: string;
}
