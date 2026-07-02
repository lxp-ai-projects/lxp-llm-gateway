import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import { AdminCatalogService } from './admin/admin-catalog.service';
import { AdminService } from './admin/admin.service';
import { BootstrapAdminDto } from './admin/dto/bootstrap-admin.dto';
import { CreateTenantDto } from './admin/dto/create-tenant.dto';
import { CreateTenantMembershipDto } from './admin/dto/create-tenant-membership.dto';
import { CreateTenantModelAccessRuleDto } from './admin/dto/create-tenant-model-access-rule.dto';
import { CreateIntegrationClientDto } from './admin/dto/create-integration-client.dto';
import { CreateIntegrationClientApiKeyDto } from './admin/dto/create-integration-client-api-key.dto';
import { CreateProviderCredentialDto } from './admin/dto/create-provider-credential.dto';
import { CreateUserDto } from './admin/dto/create-user.dto';
import { StoreProviderCredentialDto } from './admin/dto/store-provider-credential.dto';
import { UpdateTenantDto } from './admin/dto/update-tenant.dto';
import { TestTenantProviderConfigurationDto } from './admin/dto/test-tenant-provider-configuration.dto';
import { UpdateProviderCredentialDto } from './admin/dto/update-provider-credential.dto';
import { UpdateProviderSettingsDto } from './admin/dto/update-provider-settings.dto';
import { UpdateTenantProviderConfigurationDto } from './admin/dto/update-tenant-provider-configuration.dto';
import { UpdateTenantPolicyDto } from './admin/dto/update-tenant-policy.dto';
import { UpdateIntegrationClientDto } from './admin/dto/update-integration-client.dto';
import { UpdateIntegrationClientApiKeyDto } from './admin/dto/update-integration-client-api-key.dto';
import { UpdateTenantModelAccessRuleDto } from './admin/dto/update-tenant-model-access-rule.dto';
import { UpdateGlobalRolesDto } from './admin/dto/update-global-roles.dto';
import { UpdateUserDto } from './admin/dto/update-user.dto';
import { AccessTokenGuard } from './auth/access-token.guard';
import type { RequestWithAuthUser } from './auth/auth-request.types';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';

@Controller()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly adminCatalogService: AdminCatalogService,
  ) {}

  @Post('bootstrap/admin')
  bootstrapAdmin(@Body() dto: BootstrapAdminDto) {
    return this.adminService.bootstrapAdmin(dto);
  }

  @Post('admin/users')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('tenant_admin')
  createUser(@Req() request: RequestWithAuthUser, @Body() dto: CreateUserDto) {
    return this.adminService.createUser(request.authUser!, dto);
  }

  @Get('admin/users')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('tenant_admin')
  listUsers(@Req() request: RequestWithAuthUser) {
    return this.adminService.listUsers(request.authUser!);
  }

  @Get('admin/tenants')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('super_admin')
  listTenants() {
    return this.adminService.listTenants();
  }

  @Post('admin/tenants')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('super_admin')
  createTenant(@Body() dto: CreateTenantDto) {
    return this.adminService.createTenant(dto);
  }

  @Patch('admin/tenants/:tenantId')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('super_admin')
  updateTenant(
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.adminService.updateTenant(tenantId, dto);
  }

  @Post('admin/tenants/:tenantId/users')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('super_admin')
  createTenantUser(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateTenantMembershipDto,
  ) {
    return this.adminService.createTenantUser(tenantId, dto);
  }

  @Patch('admin/tenants/:tenantId/users/:userUuid')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('super_admin')
  updateTenantUser(
    @Param('tenantId') tenantId: string,
    @Param('userUuid') userUuid: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.adminService.updateTenantUser(tenantId, userUuid, dto);
  }

  @Patch('admin/users/:userUuid/global-roles')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('super_admin')
  updateUserGlobalRoles(
    @Req() request: RequestWithAuthUser,
    @Param('userUuid') userUuid: string,
    @Body() dto: UpdateGlobalRolesDto,
  ) {
    return this.adminService.updateUserGlobalRoles(
      request.authUser!,
      userUuid,
      dto,
    );
  }

  @Get('admin/tenants/:tenantId/memberships')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('super_admin')
  listTenantMemberships(@Param('tenantId') tenantId: string) {
    return this.adminService.listTenantMemberships(tenantId);
  }

  @Get('admin/tenants/:tenantId/provider-configurations')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('super_admin')
  listTenantProviderConfigurations(@Param('tenantId') tenantId: string) {
    return this.adminService.listTenantProviderConfigurations(tenantId);
  }

  @Put('admin/tenants/:tenantId/provider-configurations/:providerId')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('super_admin')
  upsertTenantProviderConfiguration(
    @Param('tenantId') tenantId: string,
    @Param('providerId') providerId: string,
    @Body() dto: UpdateTenantProviderConfigurationDto,
  ) {
    return this.adminService.upsertTenantProviderConfiguration(
      tenantId,
      providerId,
      dto,
    );
  }

  @Post('admin/tenants/:tenantId/provider-configurations/:providerId/test')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('super_admin')
  testTenantProviderConfiguration(
    @Req() request: RequestWithAuthUser,
    @Param('tenantId') tenantId: string,
    @Param('providerId') providerId: string,
    @Body() dto: TestTenantProviderConfigurationDto,
  ) {
    return this.adminService.testTenantProviderConfiguration(
      request.authUser!,
      tenantId,
      providerId,
      dto,
    );
  }

  @Get('admin/tenants/:tenantId/policies')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('super_admin')
  getTenantPolicy(@Param('tenantId') tenantId: string) {
    return this.adminService.getTenantPolicy(tenantId);
  }

  @Put('admin/tenants/:tenantId/policies')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('super_admin')
  upsertTenantPolicy(
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateTenantPolicyDto,
  ) {
    return this.adminService.upsertTenantPolicy(tenantId, dto);
  }

  @Get('admin/tenants/:tenantId/integration-clients')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('super_admin')
  listTenantIntegrationClients(@Param('tenantId') tenantId: string) {
    return this.adminService.listTenantIntegrationClients(tenantId);
  }

  @Post('admin/tenants/:tenantId/integration-clients')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('super_admin')
  createTenantIntegrationClient(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateIntegrationClientDto,
  ) {
    return this.adminService.createTenantIntegrationClient(tenantId, dto);
  }

  @Patch('admin/tenants/:tenantId/integration-clients/:integrationClientId')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('super_admin')
  updateTenantIntegrationClient(
    @Param('tenantId') tenantId: string,
    @Param('integrationClientId') integrationClientId: string,
    @Body() dto: UpdateIntegrationClientDto,
  ) {
    return this.adminService.updateTenantIntegrationClient(
      tenantId,
      integrationClientId,
      dto,
    );
  }

  @Get('admin/tenants/:tenantId/integration-clients/:integrationClientId/api-keys')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('super_admin')
  listTenantIntegrationApiKeys(
    @Param('tenantId') tenantId: string,
    @Param('integrationClientId') integrationClientId: string,
  ) {
    return this.adminService.listTenantIntegrationApiKeys(
      tenantId,
      integrationClientId,
    );
  }

  @Post('admin/tenants/:tenantId/integration-clients/:integrationClientId/api-keys')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('super_admin')
  createTenantIntegrationApiKey(
    @Param('tenantId') tenantId: string,
    @Param('integrationClientId') integrationClientId: string,
    @Body() dto: CreateIntegrationClientApiKeyDto,
  ) {
    return this.adminService.createTenantIntegrationApiKey(
      tenantId,
      integrationClientId,
      dto,
    );
  }

  @Post('admin/tenants/:tenantId/integration-clients/:integrationClientId/api-keys/:apiKeyId/rotate')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('super_admin')
  rotateTenantIntegrationApiKey(
    @Param('tenantId') tenantId: string,
    @Param('integrationClientId') integrationClientId: string,
    @Param('apiKeyId') apiKeyId: string,
  ) {
    return this.adminService.rotateTenantIntegrationApiKey(
      tenantId,
      integrationClientId,
      apiKeyId,
    );
  }

  @Patch('admin/tenants/:tenantId/integration-clients/:integrationClientId/api-keys/:apiKeyId')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('super_admin')
  updateTenantIntegrationApiKey(
    @Param('tenantId') tenantId: string,
    @Param('integrationClientId') integrationClientId: string,
    @Param('apiKeyId') apiKeyId: string,
    @Body() dto: UpdateIntegrationClientApiKeyDto,
  ) {
    return this.adminService.updateTenantIntegrationApiKey(
      tenantId,
      integrationClientId,
      apiKeyId,
      dto,
    );
  }

  @Get('admin/tenants/:tenantId/model-access-rules')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('super_admin')
  listTenantModelAccessRules(@Param('tenantId') tenantId: string) {
    return this.adminService.listTenantModelAccessRules(tenantId);
  }

  @Get('admin/tenants/:tenantId/usage')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('tenant_admin', 'operator')
  listTenantUsage(
    @Req() request: RequestWithAuthUser,
    @Param('tenantId') tenantId: string,
  ) {
    return this.adminService.listTenantUsageEvents(request.authUser!, tenantId);
  }

  @Get('admin/tenants/:tenantId/usage/summary')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('tenant_admin', 'operator')
  getTenantUsageSummary(
    @Req() request: RequestWithAuthUser,
    @Param('tenantId') tenantId: string,
  ) {
    return this.adminService.getTenantUsageSummary(request.authUser!, tenantId);
  }

  @Get('admin/tenants/:tenantId/usage/by-provider')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('tenant_admin', 'operator')
  getTenantUsageByProvider(
    @Req() request: RequestWithAuthUser,
    @Param('tenantId') tenantId: string,
  ) {
    return this.adminService.getTenantUsageByProvider(
      request.authUser!,
      tenantId,
    );
  }

  @Get('admin/tenants/:tenantId/usage/by-model')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('tenant_admin', 'operator')
  getTenantUsageByModel(
    @Req() request: RequestWithAuthUser,
    @Param('tenantId') tenantId: string,
  ) {
    return this.adminService.getTenantUsageByModel(request.authUser!, tenantId);
  }

  @Post('admin/tenants/:tenantId/model-access-rules')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('super_admin')
  createTenantModelAccessRule(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateTenantModelAccessRuleDto,
  ) {
    return this.adminService.createTenantModelAccessRule(tenantId, dto);
  }

  @Put('admin/tenants/:tenantId/model-access-rules/:ruleId')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('super_admin')
  updateTenantModelAccessRule(
    @Param('tenantId') tenantId: string,
    @Param('ruleId') ruleId: string,
    @Body() dto: UpdateTenantModelAccessRuleDto,
  ) {
    return this.adminService.updateTenantModelAccessRule(tenantId, ruleId, dto);
  }

  @Delete('admin/tenants/:tenantId/model-access-rules/:ruleId')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('super_admin')
  deleteTenantModelAccessRule(
    @Param('tenantId') tenantId: string,
    @Param('ruleId') ruleId: string,
  ) {
    return this.adminService.deleteTenantModelAccessRule(tenantId, ruleId);
  }

  @Patch('admin/users/:userUuid')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('tenant_admin')
  updateUser(
    @Req() request: RequestWithAuthUser,
    @Param('userUuid') userUuid: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.adminService.updateUser(request.authUser!, userUuid, dto);
  }

  @Post('admin/provider-credentials')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('tenant_admin', 'operator')
  storeProviderCredential(
    @Req() request: RequestWithAuthUser,
    @Body() dto: StoreProviderCredentialDto,
  ) {
    return this.adminService.storeProviderCredentialForActor(
      request.authUser!,
      dto,
    );
  }

  @Get('admin/users/:userUuid/provider-credentials')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('tenant_admin')
  listUserProviderCredentials(
    @Req() request: RequestWithAuthUser,
    @Param('userUuid') userUuid: string,
  ) {
    return this.adminService.listProviderCredentialsForUser(
      request.authUser!,
      userUuid,
    );
  }

  @Get('provider-credentials')
  @UseGuards(AccessTokenGuard)
  listOwnProviderCredentials(@Req() request: RequestWithAuthUser) {
    return this.adminService.listProviderCredentialsForUser(
      request.authUser!,
      request.authUser!.userUuid,
    );
  }

  @Patch('provider-credentials/:credentialId')
  @UseGuards(AccessTokenGuard)
  updateOwnProviderCredential(
    @Req() request: RequestWithAuthUser,
    @Param('credentialId') credentialId: string,
    @Body() dto: UpdateProviderCredentialDto,
  ) {
    return this.adminService.updateOwnProviderCredential(
      request.authUser!,
      credentialId,
      dto,
    );
  }

  @Delete('provider-credentials/:credentialId')
  @UseGuards(AccessTokenGuard)
  deleteOwnProviderCredential(
    @Req() request: RequestWithAuthUser,
    @Param('credentialId') credentialId: string,
  ) {
    return this.adminService.deleteOwnProviderCredential(
      request.authUser!,
      credentialId,
    );
  }

  @Post('provider-credentials')
  @UseGuards(AccessTokenGuard)
  createProviderCredential(
    @Req() request: RequestWithAuthUser,
    @Body() dto: CreateProviderCredentialDto,
  ) {
    return this.adminService.storeProviderCredentialForActor(
      request.authUser!,
      {
        ...dto,
        userUuid: dto.userUuid ?? request.authUser!.userUuid,
      },
    );
  }

  @Get('models')
  @UseGuards(AccessTokenGuard)
  listOwnModels(
    @Req() request: RequestWithAuthUser,
    @Query('providerId') providerId?: string,
  ) {
    return this.adminService.listOwnModels(request.authUser!, providerId);
  }

  @Get('images/catalog')
  @UseGuards(AccessTokenGuard)
  getOwnImageCatalog(@Req() request: RequestWithAuthUser) {
    return this.adminService.getOwnImageCatalog(request.authAccessToken!);
  }

  @Get('videos/catalog')
  @UseGuards(AccessTokenGuard)
  getOwnVideoCatalog(@Req() request: RequestWithAuthUser) {
    return this.adminService.getOwnVideoCatalog(request.authAccessToken!);
  }

  @Post('chat')
  @UseGuards(AccessTokenGuard)
  proxyOwnChat(
    @Req() request: RequestWithAuthUser,
    @Body() payload: unknown,
    @Res() response: Response,
  ) {
    return this.adminCatalogService.proxyGatewayChat(
      request.authAccessToken!,
      payload,
      response,
    );
  }

  @Post('images/generations')
  @UseGuards(AccessTokenGuard)
  generateOwnImage(
    @Req() request: RequestWithAuthUser,
    @Body() payload: unknown,
  ) {
    return this.adminCatalogService.proxyGatewayJson(
      request.authAccessToken!,
      '/api/v1/images/generations',
      {
        method: 'POST',
        body: payload,
        timeoutMs: 300_000,
      },
    );
  }

  @Post('images/edits')
  @UseGuards(AccessTokenGuard)
  editOwnImage(
    @Req() request: RequestWithAuthUser,
    @Body() payload: unknown,
  ) {
    return this.adminCatalogService.proxyGatewayJson(
      request.authAccessToken!,
      '/api/v1/images/edits',
      {
        method: 'POST',
        body: payload,
        timeoutMs: 300_000,
      },
    );
  }

  @Post('images/assets')
  @UseGuards(AccessTokenGuard)
  uploadOwnImageAsset(
    @Req() request: RequestWithAuthUser,
    @Body() payload: unknown,
  ) {
    return this.adminCatalogService.proxyGatewayJson(
      request.authAccessToken!,
      '/api/v1/images/assets',
      {
        method: 'POST',
        body: payload,
        timeoutMs: 90_000,
      },
    );
  }

  @Get('images/assets')
  @UseGuards(AccessTokenGuard)
  listOwnImageAssets(@Req() request: RequestWithAuthUser) {
    return this.adminCatalogService.proxyGatewayJson(
      request.authAccessToken!,
      '/api/v1/images/assets',
    );
  }

  @Patch('images/assets/:assetId/save')
  @UseGuards(AccessTokenGuard)
  setOwnImageAssetSaved(
    @Req() request: RequestWithAuthUser,
    @Param('assetId') assetId: string,
    @Body() payload: unknown,
  ) {
    return this.adminCatalogService.proxyGatewayJson(
      request.authAccessToken!,
      `/api/v1/images/assets/${encodeURIComponent(assetId)}/save`,
      {
        method: 'PATCH',
        body: payload,
      },
    );
  }

  @Patch('images/assets/:assetId')
  @UseGuards(AccessTokenGuard)
  updateOwnImageAsset(
    @Req() request: RequestWithAuthUser,
    @Param('assetId') assetId: string,
    @Body() payload: unknown,
  ) {
    return this.adminCatalogService.proxyGatewayJson(
      request.authAccessToken!,
      `/api/v1/images/assets/${encodeURIComponent(assetId)}`,
      {
        method: 'PATCH',
        body: payload,
      },
    );
  }

  @Delete('images/assets/:assetId')
  @UseGuards(AccessTokenGuard)
  deleteOwnImageAsset(
    @Req() request: RequestWithAuthUser,
    @Param('assetId') assetId: string,
  ) {
    return this.adminCatalogService.proxyGatewayJson(
      request.authAccessToken!,
      `/api/v1/images/assets/${encodeURIComponent(assetId)}`,
      {
        method: 'DELETE',
      },
    );
  }

  @Get('images/history')
  @UseGuards(AccessTokenGuard)
  getOwnImageHistory(
    @Req() request: RequestWithAuthUser,
    @Query('page') page?: string,
  ) {
    const queryString = page
      ? `?page=${encodeURIComponent(page)}`
      : '';

    return this.adminCatalogService.proxyGatewayJson(
      request.authAccessToken!,
      `/api/v1/images/history${queryString}`,
    );
  }

  @Get('images/assets/:assetId/content')
  @UseGuards(AccessTokenGuard)
  getOwnImageAssetContent(
    @Req() request: RequestWithAuthUser,
    @Param('assetId') assetId: string,
    @Res() response: Response,
  ) {
    return this.adminCatalogService.proxyGatewayBinary(
      request.authAccessToken!,
      `/api/v1/images/assets/${encodeURIComponent(assetId)}/content`,
      response,
    );
  }

  @Post('videos/generations')
  @UseGuards(AccessTokenGuard)
  generateOwnVideo(
    @Req() request: RequestWithAuthUser,
    @Body() payload: unknown,
  ) {
    return this.adminCatalogService.proxyGatewayJson(
      request.authAccessToken!,
      '/api/v1/videos/generations',
      {
        method: 'POST',
        body: payload,
        timeoutMs: 300_000,
      },
    );
  }

  @Get('videos/jobs/:jobId')
  @UseGuards(AccessTokenGuard)
  getOwnVideoJob(
    @Req() request: RequestWithAuthUser,
    @Param('jobId') jobId: string,
  ) {
    return this.adminCatalogService.proxyGatewayJson(
      request.authAccessToken!,
      `/api/v1/videos/jobs/${encodeURIComponent(jobId)}`,
      {
        timeoutMs: 90_000,
      },
    );
  }

  @Patch('videos/jobs/:jobId/cancel')
  @UseGuards(AccessTokenGuard)
  cancelOwnVideoJob(
    @Req() request: RequestWithAuthUser,
    @Param('jobId') jobId: string,
  ) {
    return this.adminCatalogService.proxyGatewayJson(
      request.authAccessToken!,
      `/api/v1/videos/jobs/${encodeURIComponent(jobId)}/cancel`,
      {
        method: 'PATCH',
      },
    );
  }

  @Delete('videos/jobs/:jobId')
  @UseGuards(AccessTokenGuard)
  deleteOwnVideoJob(
    @Req() request: RequestWithAuthUser,
    @Param('jobId') jobId: string,
  ) {
    return this.adminCatalogService.proxyGatewayJson(
      request.authAccessToken!,
      `/api/v1/videos/jobs/${encodeURIComponent(jobId)}`,
      {
        method: 'DELETE',
      },
    );
  }

  @Patch('videos/assets/:assetId/save')
  @UseGuards(AccessTokenGuard)
  setOwnVideoAssetSaved(
    @Req() request: RequestWithAuthUser,
    @Param('assetId') assetId: string,
    @Body() payload: unknown,
  ) {
    return this.adminCatalogService.proxyGatewayJson(
      request.authAccessToken!,
      `/api/v1/videos/assets/${encodeURIComponent(assetId)}/save`,
      {
        method: 'PATCH',
        body: payload,
      },
    );
  }

  @Get('videos/history')
  @UseGuards(AccessTokenGuard)
  getOwnVideoHistory(
    @Req() request: RequestWithAuthUser,
    @Query('page') page?: string,
  ) {
    const queryString = page
      ? `?page=${encodeURIComponent(page)}`
      : '';

    return this.adminCatalogService.proxyGatewayJson(
      request.authAccessToken!,
      `/api/v1/videos/history${queryString}`,
    );
  }

  @Get('videos/assets/:assetId/content')
  @UseGuards(AccessTokenGuard)
  getOwnVideoAssetContent(
    @Req() request: RequestWithAuthUser,
    @Param('assetId') assetId: string,
    @Res() response: Response,
  ) {
    return this.adminCatalogService.proxyGatewayBinary(
      request.authAccessToken!,
      `/api/v1/videos/assets/${encodeURIComponent(assetId)}/content`,
      response,
    );
  }

  @Get('provider-settings')
  @UseGuards(AccessTokenGuard)
  getOwnProviderSettings(@Req() request: RequestWithAuthUser) {
    return this.adminService.getProviderSettingsForUser(
      request.authUser!,
      request.authUser!.userUuid,
    );
  }

  @Patch('provider-settings')
  @UseGuards(AccessTokenGuard)
  updateOwnProviderSettings(
    @Req() request: RequestWithAuthUser,
    @Body() dto: UpdateProviderSettingsDto,
  ) {
    return this.adminService.updateProviderSettingsForUser(
      request.authUser!,
      request.authUser!.userUuid,
      dto,
    );
  }
}
