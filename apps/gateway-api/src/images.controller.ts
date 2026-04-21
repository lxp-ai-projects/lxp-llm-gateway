import type { Request } from 'express';
import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import type { GatewayImageEditRequest } from '@lxp/contracts';

import { GatewayAuthService } from './auth/gateway-auth.service';
import { GatewayImageEditRequestDto } from './gateway/dto/gateway-image-edit-request.dto';
import { GatewayImageGenerationRequestDto } from './gateway/dto/gateway-image-generation-request.dto';
import { ImageApplicationService } from './images/image-application.service';
import { ImageAssetSaveRequestDto } from './images/dto/image-asset-save-request.dto';
import { ImageAssetUploadRequestDto } from './images/dto/image-asset-upload-request.dto';
import { ImageHistoryQueryDto } from './images/dto/image-history-query.dto';

@Controller('images')
export class ImagesController {
  constructor(
    private readonly imageApplicationService: ImageApplicationService,
    private readonly gatewayAuthService: GatewayAuthService,
  ) {}

  @Get('catalog')
  async getCatalog(
    @Headers('authorization') authorizationHeader: string | undefined,
    @Req()
    httpRequest: Request & { cookies?: Record<string, string | undefined> },
  ) {
    const authContext = await this.gatewayAuthService.authenticateAccessToken(
      authorizationHeader,
      httpRequest.cookies?.lxp_access_token,
    );

    return this.imageApplicationService.getCatalog(authContext);
  }

  @Post('generations')
  async generateImage(
    @Body() request: GatewayImageGenerationRequestDto,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Req()
    httpRequest: Request & { cookies?: Record<string, string | undefined> },
  ) {
    const authContext = await this.gatewayAuthService.authenticateAccessToken(
      authorizationHeader,
      httpRequest.cookies?.lxp_access_token,
    );

    return this.imageApplicationService.generateImage(request, authContext);
  }

  @Post('edits')
  async editImage(
    @Body() request: GatewayImageEditRequestDto,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Req()
    httpRequest: Request & { cookies?: Record<string, string | undefined> },
  ) {
    const authContext = await this.gatewayAuthService.authenticateAccessToken(
      authorizationHeader,
      httpRequest.cookies?.lxp_access_token,
    );

    return this.imageApplicationService.editImage(
      mapEditRequestDto(request),
      authContext,
    );
  }

  @Post('assets')
  async uploadAsset(
    @Body() request: ImageAssetUploadRequestDto,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Req()
    httpRequest: Request & { cookies?: Record<string, string | undefined> },
  ) {
    const authContext = await this.gatewayAuthService.authenticateAccessToken(
      authorizationHeader,
      httpRequest.cookies?.lxp_access_token,
    );

    return this.imageApplicationService.uploadAsset(request, authContext);
  }

  @Patch('assets/:assetId/save')
  async setAssetSaved(
    @Param('assetId') assetId: string,
    @Body() request: ImageAssetSaveRequestDto,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Req()
    httpRequest: Request & { cookies?: Record<string, string | undefined> },
  ) {
    const authContext = await this.gatewayAuthService.authenticateAccessToken(
      authorizationHeader,
      httpRequest.cookies?.lxp_access_token,
    );

    return this.imageApplicationService.setAssetSaved(
      assetId,
      request,
      authContext,
    );
  }

  @Get('history')
  async getHistory(
    @Query() query: ImageHistoryQueryDto,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Req()
    httpRequest: Request & { cookies?: Record<string, string | undefined> },
  ) {
    const authContext = await this.gatewayAuthService.authenticateAccessToken(
      authorizationHeader,
      httpRequest.cookies?.lxp_access_token,
    );

    return this.imageApplicationService.listHistory(query.page ?? 1, authContext);
  }

  @Get('assets/:assetId/content')
  async getAssetContent(
    @Param('assetId') assetId: string,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Req()
    httpRequest: Request & { cookies?: Record<string, string | undefined> },
    @Res() response: Response,
  ) {
    const authContext = await this.gatewayAuthService.authenticateAccessToken(
      authorizationHeader,
      httpRequest.cookies?.lxp_access_token,
    );
    const assetContent = await this.imageApplicationService.getAssetContent(
      assetId,
      authContext,
    );

    response.setHeader('content-type', assetContent.mimeType);
    response.setHeader('cache-control', 'private, max-age=300');
    response.send(assetContent.data);
  }
}

function mapEditRequestDto(
  request: GatewayImageEditRequestDto,
): GatewayImageEditRequest {
  return {
    ...request,
    images: request.images.map((image) =>
      image.type === 'asset'
        ? {
            type: 'asset',
            assetId: image.assetId!,
          }
        : image.type === 'data_url'
          ? {
              type: 'data_url',
              url: image.url!,
              mimeType: image.mimeType,
            }
          : {
              type: 'image_url',
              url: image.url!,
            },
    ),
  };
}
