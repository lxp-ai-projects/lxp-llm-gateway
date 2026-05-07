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
import type {
  GatewayVideoFrameImageReference,
  GatewayVideoGenerationRequest,
  GatewayVideoReference,
} from '@lxp/contracts';

import { GatewayAuthService } from './auth/gateway-auth.service';
import {
  GatewayVideoGenerationRequestDto,
} from './gateway/dto/gateway-video-generation-request.dto';
import { GatewayVideoReferenceDto } from './gateway/dto/gateway-video-reference.dto';
import { VideoApplicationService } from './videos/video-application.service';
import { VideoHistoryQueryDto } from './videos/dto/video-history-query.dto';

@Controller('videos')
export class VideosController {
  constructor(
    private readonly videoApplicationService: VideoApplicationService,
    private readonly gatewayAuthService: GatewayAuthService,
  ) {}

  @Get('catalog')
  async getCatalog(
    @Headers('authorization') authorizationHeader: string | undefined,
    @Req()
    httpRequest: Request & { cookies?: Record<string, string | undefined> },
  ) {
    const authContext = await this.gatewayAuthService.authenticateGatewayRequest(
      authorizationHeader,
      httpRequest.cookies?.lxp_access_token,
      httpRequest.headers,
    );

    return this.videoApplicationService.getCatalog(authContext);
  }

  @Post('generations')
  async generateVideo(
    @Body() request: GatewayVideoGenerationRequestDto,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Req()
    httpRequest: Request & { cookies?: Record<string, string | undefined> },
  ) {
    const authContext = await this.gatewayAuthService.authenticateGatewayRequest(
      authorizationHeader,
      httpRequest.cookies?.lxp_access_token,
      httpRequest.headers,
    );

    return this.videoApplicationService.submitVideoGeneration(
      mapVideoRequestDto(request),
      authContext,
    );
  }

  @Get('jobs/:jobId')
  async getJob(
    @Param('jobId') jobId: string,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Req()
    httpRequest: Request & { cookies?: Record<string, string | undefined> },
  ) {
    const authContext = await this.gatewayAuthService.authenticateGatewayRequest(
      authorizationHeader,
      httpRequest.cookies?.lxp_access_token,
      httpRequest.headers,
    );

    return this.videoApplicationService.getJob(jobId, authContext);
  }

  @Get('history')
  async getHistory(
    @Query() query: VideoHistoryQueryDto,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Req()
    httpRequest: Request & { cookies?: Record<string, string | undefined> },
  ) {
    const authContext = await this.gatewayAuthService.authenticateGatewayRequest(
      authorizationHeader,
      httpRequest.cookies?.lxp_access_token,
      httpRequest.headers,
    );

    return this.videoApplicationService.listHistory(query.page ?? 1, authContext);
  }

  @Patch('jobs/:jobId/cancel')
  async cancelJob(
    @Param('jobId') jobId: string,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Req()
    httpRequest: Request & { cookies?: Record<string, string | undefined> },
  ) {
    const authContext = await this.gatewayAuthService.authenticateGatewayRequest(
      authorizationHeader,
      httpRequest.cookies?.lxp_access_token,
      httpRequest.headers,
    );

    return this.videoApplicationService.cancelJob(jobId, authContext);
  }

  @Get('assets/:assetId/content')
  async getAssetContent(
    @Param('assetId') assetId: string,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Req()
    httpRequest: Request & { cookies?: Record<string, string | undefined> },
    @Res() response: Response,
  ) {
    const authContext = await this.gatewayAuthService.authenticateGatewayRequest(
      authorizationHeader,
      httpRequest.cookies?.lxp_access_token,
      httpRequest.headers,
    );
    const assetContent = await this.videoApplicationService.getAssetContent(
      assetId,
      authContext,
    );

    response.setHeader('content-type', assetContent.mimeType);
    response.setHeader('cache-control', 'private, max-age=300');
    response.send(assetContent.data);
  }
}

function mapVideoRequestDto(
  request: GatewayVideoGenerationRequestDto,
): GatewayVideoGenerationRequest {
  return {
    ...request,
    frameImages: request.frameImages?.map(
      (frame): GatewayVideoFrameImageReference => ({
        frameType: frame.frameType,
        image: mapVideoReferenceDto(frame.image),
      }),
    ),
    referenceImages: request.referenceImages?.map(mapVideoReferenceDto),
  };
}

function mapVideoReferenceDto(
  image: GatewayVideoReferenceDto,
): GatewayVideoReference {
  return image.type === 'asset'
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
        };
}
