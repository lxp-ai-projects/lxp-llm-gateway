import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class GatewayImageReferenceDto {
  @IsIn(['image_url', 'data_url'])
  type!: 'image_url' | 'data_url';

  @IsString()
  @MinLength(1)
  url!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  mimeType?: string;
}
