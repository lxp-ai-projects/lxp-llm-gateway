gateway-api:
/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/driver/postgres/PostgresQueryRunner.js:216
2026-05-22T03:09:36.491137915Z             throw new QueryFailedError_1.QueryFailedError(query, parameters, err);
2026-05-22T03:09:36.491140947Z                   ^
2026-05-22T03:09:36.491142616Z
2026-05-22T03:09:36.491144112Z QueryFailedError: relation "providers" does not exist
2026-05-22T03:09:36.491147447Z     at PostgresQueryRunner.query (/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/driver/postgres/PostgresQueryRunner.js:216:19)
2026-05-22T03:09:36.491149061Z     at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
2026-05-22T03:09:36.491150509Z     at async SelectQueryBuilder.loadRawResults (/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/query-builder/SelectQueryBuilder.js:2231:25)
2026-05-22T03:09:36.491152063Z     at async SelectQueryBuilder.executeEntitiesAndRawResults (/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/query-builder/SelectQueryBuilder.js:2079:26)
2026-05-22T03:09:36.491153725Z     at async SelectQueryBuilder.getRawAndEntities (/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/query-builder/SelectQueryBuilder.js:684:29)
2026-05-22T03:09:36.491155226Z     at async SelectQueryBuilder.getMany (/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/query-builder/SelectQueryBuilder.js:750:25)
2026-05-22T03:09:36.491156817Z     at async ProviderRegistryBootstrapService.onApplicationBootstrap (/app/apps/gateway-api/dist/gateway/provider-registry-bootstrap.service.js:35:35)
2026-05-22T03:09:36.491158379Z     at async Promise.all (index 0)
2026-05-22T03:09:36.491159781Z     at async callModuleBootstrapHook (/app/node_modules/.pnpm/@nestjs+core@11.1.19_@nestjs+common@11.1.19_class-transformer@0.5.1_class-validator@0.1_f9c6fa0e18205154294aa1faca2339d1/node_modules/@nestjs/core/hooks/on-app-bootstrap.hook.js:43:5)
2026-05-22T03:09:36.491161520Z     at async NestApplication.callBootstrapHook (/app/node_modules/.pnpm/@nestjs+core@11.1.19_@nestjs+common@11.1.19_class-transformer@0.5.1_class-validator@0.1_f9c6fa0e18205154294aa1faca2339d1/node_modules/@nestjs/core/nest-application-context.js:274:13) {
2026-05-22T03:09:36.491175963Z   query: 'SELECT "ProviderEntity"."id" AS "ProviderEntity_id", "ProviderEntity"."provider_id" AS "ProviderEntity_provider_id", "ProviderEntity"."display_name" AS "ProviderEntity_display_name", "ProviderEntity"."status" AS "ProviderEntity_status" FROM "providers" "ProviderEntity"',
2026-05-22T03:09:36.491178634Z   parameters: [],
2026-05-22T03:09:36.491180014Z   driverError: error: relation "providers" does not exist
2026-05-22T03:09:36.491181503Z       at /app/node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/client.js:631:17
2026-05-22T03:09:36.491183021Z       at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
2026-05-22T03:09:36.491184441Z       at async PostgresQueryRunner.query (/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/driver/postgres/PostgresQueryRunner.js:181:25)
2026-05-22T03:09:36.491186233Z       at async SelectQueryBuilder.loadRawResults (/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/query-builder/SelectQueryBuilder.js:2231:25)
2026-05-22T03:09:36.491189466Z       at async SelectQueryBuilder.executeEntitiesAndRawResults (/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/query-builder/SelectQueryBuilder.js:2079:26)
2026-05-22T03:09:36.491191214Z       at async SelectQueryBuilder.getRawAndEntities (/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/query-builder/SelectQueryBuilder.js:684:29)
2026-05-22T03:09:36.491192718Z       at async SelectQueryBuilder.getMany (/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/query-builder/SelectQueryBuilder.js:750:25)
2026-05-22T03:09:36.491194243Z       at async ProviderRegistryBootstrapService.onApplicationBootstrap (/app/apps/gateway-api/dist/gateway/provider-registry-bootstrap.service.js:35:35)
2026-05-22T03:09:36.491195728Z       at async Promise.all (index 0)
2026-05-22T03:09:36.491197225Z       at async callModuleBootstrapHook (/app/node_modules/.pnpm/@nestjs+core@11.1.19_@nestjs+common@11.1.19_class-transformer@0.5.1_class-validator@0.1_f9c6fa0e18205154294aa1faca2339d1/node_modules/@nestjs/core/hooks/on-app-bootstrap.hook.js:43:5) {
2026-05-22T03:09:36.491198849Z     length: 109,
2026-05-22T03:09:36.491200188Z     severity: 'ERROR',
2026-05-22T03:09:36.491201524Z     code: '42P01',
2026-05-22T03:09:36.491202822Z     detail: undefined,
2026-05-22T03:09:36.491204205Z     hint: undefined,
2026-05-22T03:09:36.491205491Z     position: '242',
2026-05-22T03:09:36.491206783Z     internalPosition: undefined,
2026-05-22T03:09:36.491208160Z     internalQuery: undefined,
2026-05-22T03:09:36.491209527Z     where: undefined,
2026-05-22T03:09:36.491210822Z     schema: undefined,
2026-05-22T03:09:36.491212107Z     table: undefined,
2026-05-22T03:09:36.491213391Z     column: undefined,
2026-05-22T03:09:36.491216931Z     dataType: undefined,
2026-05-22T03:09:36.491218748Z     constraint: undefined,
2026-05-22T03:09:36.491220107Z     file: 'parse_relation.c',
2026-05-22T03:09:36.491221486Z     line: '1449',
2026-05-22T03:09:36.491222765Z     routine: 'parserOpenTable'
2026-05-22T03:09:36.491224144Z   },
2026-05-22T03:09:36.491225471Z   length: 109,
2026-05-22T03:09:36.491226835Z   severity: 'ERROR',
2026-05-22T03:09:36.491228113Z   code: '42P01',
2026-05-22T03:09:36.491229391Z   detail: undefined,
2026-05-22T03:09:36.491230640Z   hint: undefined,
2026-05-22T03:09:36.491231990Z   position: '242',
2026-05-22T03:09:36.491233263Z   internalPosition: undefined,
2026-05-22T03:09:36.491234711Z   internalQuery: undefined,
2026-05-22T03:09:36.491236014Z   where: undefined,
2026-05-22T03:09:36.491237289Z   schema: undefined,
2026-05-22T03:09:36.491238639Z   table: undefined,
2026-05-22T03:09:36.491239989Z   column: undefined,
2026-05-22T03:09:36.491241349Z   dataType: undefined,
2026-05-22T03:09:36.491242788Z   constraint: undefined,
2026-05-22T03:09:36.491244247Z   file: 'parse_relation.c',
2026-05-22T03:09:36.491245576Z   line: '1449',
2026-05-22T03:09:36.491246928Z   routine: 'parserOpenTable'
2026-05-22T03:09:36.491248271Z }
2026-05-22T03:09:36.491249627Z
2026-05-22T03:09:36.491250976Z Node.js v24.15.0
2026-05-22T03:09:50.343865306Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [NestFactory] Starting Nest application...
2026-05-22T03:09:50.377218097Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +33ms
2026-05-22T03:09:50.377545425Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [InstanceLoader] ConfigHostModule dependencies initialized +1ms
2026-05-22T03:09:50.378328962Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [InstanceLoader] ConfigModule dependencies initialized +1ms
2026-05-22T03:09:50.378354059Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [InstanceLoader] TerminusModule dependencies initialized +0ms
2026-05-22T03:09:50.378621842Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [InstanceLoader] AppModule dependencies initialized +0ms
2026-05-22T03:09:50.378628239Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [InstanceLoader] JwtModule dependencies initialized +0ms
2026-05-22T03:09:50.410641390Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [InstanceLoader] TypeOrmCoreModule dependencies initialized +32ms
2026-05-22T03:09:50.410684327Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms
2026-05-22T03:09:50.411973332Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [InstanceLoader] GatewayModule dependencies initialized +1ms
2026-05-22T03:09:50.416236478Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [RoutesResolver] HealthController {/api/v1/health}: +5ms
2026-05-22T03:09:50.418206715Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [RouterExplorer] Mapped {/api/v1/health, GET} route +2ms
2026-05-22T03:09:50.418239160Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [RoutesResolver] GatewayController {/api/v1/chat}: +0ms
2026-05-22T03:09:50.418878462Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [RouterExplorer] Mapped {/api/v1/chat, POST} route +0ms
2026-05-22T03:09:50.418898534Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [RoutesResolver] ModelsController {/api/v1/models}: +0ms
2026-05-22T03:09:50.419179231Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [RouterExplorer] Mapped {/api/v1/models, GET} route +1ms
2026-05-22T03:09:50.419206589Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [RoutesResolver] ImagesController {/api/v1/images}: +0ms
2026-05-22T03:09:50.419528384Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [RouterExplorer] Mapped {/api/v1/images/catalog, GET} route +0ms
2026-05-22T03:09:50.419663532Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [RouterExplorer] Mapped {/api/v1/images/generations, POST} route +0ms
2026-05-22T03:09:50.419847107Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [RouterExplorer] Mapped {/api/v1/images/edits, POST} route +0ms
2026-05-22T03:09:50.419981933Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [RouterExplorer] Mapped {/api/v1/images/assets, POST} route +0ms
2026-05-22T03:09:50.420099384Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [RouterExplorer] Mapped {/api/v1/images/assets, GET} route +1ms
2026-05-22T03:09:50.420665218Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [RouterExplorer] Mapped {/api/v1/images/assets/:assetId/save, PATCH} route +0ms
2026-05-22T03:09:50.420919785Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [RouterExplorer] Mapped {/api/v1/images/assets/:assetId, PATCH} route +0ms
2026-05-22T03:09:50.421144024Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [RouterExplorer] Mapped {/api/v1/images/assets/:assetId, DELETE} route +1ms
2026-05-22T03:09:50.421297170Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [RouterExplorer] Mapped {/api/v1/images/history, GET} route +0ms
2026-05-22T03:09:50.421447035Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [RouterExplorer] Mapped {/api/v1/images/assets/:assetId/content, GET} route +0ms
2026-05-22T03:09:50.421522123Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [RoutesResolver] VideosController {/api/v1/videos}: +0ms
2026-05-22T03:09:50.421666148Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [RouterExplorer] Mapped {/api/v1/videos/catalog, GET} route +0ms
2026-05-22T03:09:50.421777445Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [RouterExplorer] Mapped {/api/v1/videos/generations, POST} route +0ms
2026-05-22T03:09:50.421980707Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [RouterExplorer] Mapped {/api/v1/videos/jobs/:jobId, GET} route +0ms
2026-05-22T03:09:50.422012365Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [RouterExplorer] Mapped {/api/v1/videos/history, GET} route +0ms
2026-05-22T03:09:50.422113816Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [RouterExplorer] Mapped {/api/v1/videos/jobs/:jobId/cancel, PATCH} route +1ms
2026-05-22T03:09:50.422298461Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [RouterExplorer] Mapped {/api/v1/videos/jobs/:jobId, DELETE} route +0ms
2026-05-22T03:09:50.422380286Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [RouterExplorer] Mapped {/api/v1/videos/assets/:assetId/save, PATCH} route +0ms
2026-05-22T03:09:50.422444881Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [RouterExplorer] Mapped {/api/v1/videos/assets/:assetId/content, GET} route +0ms
2026-05-22T03:09:50.422516763Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [RoutesResolver] OpenAiCompatibleController {/api/v1/openai}: +0ms
2026-05-22T03:09:50.422675933Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [RouterExplorer] Mapped {/api/v1/openai/models, GET} route +0ms
2026-05-22T03:09:50.422705597Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [RouterExplorer] Mapped {/api/v1/openai/chat/completions, POST} route +0ms
2026-05-22T03:09:50.422775552Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [RoutesResolver] SetupController {/api/v1/setup/providers}: +0ms
2026-05-22T03:09:50.423257408Z [Nest] 1  - 05/22/2026, 3:09:50 AM     LOG [RouterExplorer] Mapped {/api/v1/setup/providers/test, POST} route +1ms
2026-05-22T03:09:50.431367491Z /app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/driver/postgres/PostgresQueryRunner.js:216
2026-05-22T03:09:50.431431506Z             throw new QueryFailedError_1.QueryFailedError(query, parameters, err);
2026-05-22T03:09:50.431440254Z                   ^
2026-05-22T03:09:50.431442107Z
2026-05-22T03:09:50.431443500Z QueryFailedError: relation "providers" does not exist
2026-05-22T03:09:50.431445190Z     at PostgresQueryRunner.query (/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/driver/postgres/PostgresQueryRunner.js:216:19)
2026-05-22T03:09:50.431446802Z     at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
2026-05-22T03:09:50.431448217Z     at async SelectQueryBuilder.loadRawResults (/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/query-builder/SelectQueryBuilder.js:2231:25)
2026-05-22T03:09:50.431449710Z     at async SelectQueryBuilder.executeEntitiesAndRawResults (/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/query-builder/SelectQueryBuilder.js:2079:26)
2026-05-22T03:09:50.431451302Z     at async SelectQueryBuilder.getRawAndEntities (/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/query-builder/SelectQueryBuilder.js:684:29)
2026-05-22T03:09:50.431452925Z     at async SelectQueryBuilder.getMany (/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/query-builder/SelectQueryBuilder.js:750:25)
2026-05-22T03:09:50.431454440Z     at async ProviderRegistryBootstrapService.onApplicationBootstrap (/app/apps/gateway-api/dist/gateway/provider-registry-bootstrap.service.js:35:35)
2026-05-22T03:09:50.431455929Z     at async Promise.all (index 0)
2026-05-22T03:09:50.431469206Z     at async callModuleBootstrapHook (/app/node_modules/.pnpm/@nestjs+core@11.1.19_@nestjs+common@11.1.19_class-transformer@0.5.1_class-validator@0.1_f9c6fa0e18205154294aa1faca2339d1/node_modules/@nestjs/core/hooks/on-app-bootstrap.hook.js:43:5)
2026-05-22T03:09:50.431470925Z     at async NestApplication.callBootstrapHook (/app/node_modules/.pnpm/@nestjs+core@11.1.19_@nestjs+common@11.1.19_class-transformer@0.5.1_class-validator@0.1_f9c6fa0e18205154294aa1faca2339d1/node_modules/@nestjs/core/nest-application-context.js:274:13) {
2026-05-22T03:09:50.431476740Z   query: 'SELECT "ProviderEntity"."id" AS "ProviderEntity_id", "ProviderEntity"."provider_id" AS "ProviderEntity_provider_id", "ProviderEntity"."display_name" AS "ProviderEntity_display_name", "ProviderEntity"."status" AS "ProviderEntity_status" FROM "providers" "ProviderEntity"',
2026-05-22T03:09:50.431479540Z   parameters: [],
2026-05-22T03:09:50.431480899Z   driverError: error: relation "providers" does not exist
2026-05-22T03:09:50.431482448Z       at /app/node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/client.js:631:17
2026-05-22T03:09:50.431483990Z       at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
2026-05-22T03:09:50.431485578Z       at async PostgresQueryRunner.query (/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/driver/postgres/PostgresQueryRunner.js:181:25)
2026-05-22T03:09:50.431487143Z       at async SelectQueryBuilder.loadRawResults (/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/query-builder/SelectQueryBuilder.js:2231:25)
2026-05-22T03:09:50.431488698Z       at async SelectQueryBuilder.executeEntitiesAndRawResults (/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/query-builder/SelectQueryBuilder.js:2079:26)
2026-05-22T03:09:50.431490223Z       at async SelectQueryBuilder.getRawAndEntities (/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/query-builder/SelectQueryBuilder.js:684:29)
2026-05-22T03:09:50.431491825Z       at async SelectQueryBuilder.getMany (/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/query-builder/SelectQueryBuilder.js:750:25)
2026-05-22T03:09:50.431493373Z       at async ProviderRegistryBootstrapService.onApplicationBootstrap (/app/apps/gateway-api/dist/gateway/provider-registry-bootstrap.service.js:35:35)
2026-05-22T03:09:50.431494920Z       at async Promise.all (index 0)
2026-05-22T03:09:50.431496325Z       at async callModuleBootstrapHook (/app/node_modules/.pnpm/@nestjs+core@11.1.19_@nestjs+common@11.1.19_class-transformer@0.5.1_class-validator@0.1_f9c6fa0e18205154294aa1faca2339d1/node_modules/@nestjs/core/hooks/on-app-bootstrap.hook.js:43:5) {
2026-05-22T03:09:50.431498009Z     length: 109,
2026-05-22T03:09:50.431499407Z     severity: 'ERROR',
2026-05-22T03:09:50.431500744Z     code: '42P01',
2026-05-22T03:09:50.431502029Z     detail: undefined,
2026-05-22T03:09:50.431503315Z     hint: undefined,
2026-05-22T03:09:50.431504589Z     position: '242',
2026-05-22T03:09:50.431505923Z     internalPosition: undefined,
2026-05-22T03:09:50.431509380Z     internalQuery: undefined,
2026-05-22T03:09:50.431510871Z     where: undefined,
2026-05-22T03:09:50.431512147Z     schema: undefined,
2026-05-22T03:09:50.431513429Z     table: undefined,
2026-05-22T03:09:50.431514713Z     column: undefined,
2026-05-22T03:09:50.431516025Z     dataType: undefined,
2026-05-22T03:09:50.431517674Z     constraint: undefined,
2026-05-22T03:09:50.431519037Z     file: 'parse_relation.c',
2026-05-22T03:09:50.431520363Z     line: '1449',
2026-05-22T03:09:50.431521777Z     routine: 'parserOpenTable'
2026-05-22T03:09:50.431523135Z   },
2026-05-22T03:09:50.431524456Z   length: 109,
2026-05-22T03:09:50.431525844Z   severity: 'ERROR',
2026-05-22T03:09:50.431527357Z   code: '42P01',
2026-05-22T03:09:50.431528648Z   detail: undefined,
2026-05-22T03:09:50.431529982Z   hint: undefined,
2026-05-22T03:09:50.431531253Z   position: '242',
2026-05-22T03:09:50.431532562Z   internalPosition: undefined,
2026-05-22T03:09:50.431533993Z   internalQuery: undefined,
2026-05-22T03:09:50.431535334Z   where: undefined,
2026-05-22T03:09:50.431536614Z   schema: undefined,
2026-05-22T03:09:50.431537892Z   table: undefined,
2026-05-22T03:09:50.431539162Z   column: undefined,
2026-05-22T03:09:50.431540505Z   dataType: undefined,
2026-05-22T03:09:50.431541835Z   constraint: undefined,
2026-05-22T03:09:50.431543190Z   file: 'parse_relation.c',
2026-05-22T03:09:50.431544485Z   line: '1449',
2026-05-22T03:09:50.431545762Z   routine: 'parserOpenTable'
2026-05-22T03:09:50.431547107Z }
2026-05-22T03:09:50.431548527Z
2026-05-22T03:09:50.431549859Z Node.js v24.15.0



---

admin-api:

Node.js v24.15.0
2026-05-22T03:10:18.532601718Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [NestFactory] Starting Nest application...
2026-05-22T03:10:18.558378915Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +27ms
2026-05-22T03:10:18.558614086Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [InstanceLoader] ConfigHostModule dependencies initialized +0ms
2026-05-22T03:10:18.559341442Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [InstanceLoader] ConfigModule dependencies initialized +0ms
2026-05-22T03:10:18.559478441Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [InstanceLoader] TerminusModule dependencies initialized +1ms
2026-05-22T03:10:18.559851138Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [InstanceLoader] JwtModule dependencies initialized +0ms
2026-05-22T03:10:18.585013972Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [InstanceLoader] TypeOrmCoreModule dependencies initialized +25ms
2026-05-22T03:10:18.585048757Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms
2026-05-22T03:10:18.585051302Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms
2026-05-22T03:10:18.585980117Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [InstanceLoader] AuthModule dependencies initialized +1ms
2026-05-22T03:10:18.586958959Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [InstanceLoader] AppModule dependencies initialized +1ms
2026-05-22T03:10:18.590100286Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RoutesResolver] AdminController {/api/v1}: +3ms
2026-05-22T03:10:18.591888390Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/bootstrap/admin, POST} route +2ms
2026-05-22T03:10:18.592305006Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/users, POST} route +1ms
2026-05-22T03:10:18.592531227Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/users, GET} route +0ms
2026-05-22T03:10:18.592706377Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants, GET} route +0ms
2026-05-22T03:10:18.592895219Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants, POST} route +0ms
2026-05-22T03:10:18.593282754Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:tenantId, PATCH} route +1ms
2026-05-22T03:10:18.593466415Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:tenantId/users, POST} route +0ms
2026-05-22T03:10:18.593622282Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:tenantId/users/:userUuid, PATCH} route +0ms
2026-05-22T03:10:18.593888027Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/users/:userUuid/global-roles, PATCH} route +0ms
2026-05-22T03:10:18.594326130Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:tenantId/memberships, GET} route +1ms
2026-05-22T03:10:18.594486187Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:tenantId/provider-configurations, GET} route +0ms
2026-05-22T03:10:18.594652614Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:tenantId/provider-configurations/:providerId, PUT} route +0ms
2026-05-22T03:10:18.594927659Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:tenantId/provider-configurations/:providerId/test, POST} route +0ms
2026-05-22T03:10:18.595153215Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:tenantId/policies, GET} route +1ms
2026-05-22T03:10:18.595390257Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:tenantId/policies, PUT} route +0ms
2026-05-22T03:10:18.595563010Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:tenantId/integration-clients, GET} route +0ms
2026-05-22T03:10:18.595693820Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:tenantId/integration-clients, POST} route +0ms
2026-05-22T03:10:18.595949097Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:tenantId/integration-clients/:integrationClientId, PATCH} route +0ms
2026-05-22T03:10:18.596208401Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:tenantId/integration-clients/:integrationClientId/api-keys, GET} route +1ms
2026-05-22T03:10:18.596524892Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:tenantId/integration-clients/:integrationClientId/api-keys, POST} route +0ms
2026-05-22T03:10:18.596731479Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:tenantId/integration-clients/:integrationClientId/api-keys/:apiKeyId/rotate, POST} route +0ms
2026-05-22T03:10:18.596934268Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:tenantId/integration-clients/:integrationClientId/api-keys/:apiKeyId, PATCH} route +0ms
2026-05-22T03:10:18.597237357Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:tenantId/model-access-rules, GET} route +1ms
2026-05-22T03:10:18.597540118Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:tenantId/usage, GET} route +0ms
2026-05-22T03:10:18.597852285Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:tenantId/usage/summary, GET} route +0ms
2026-05-22T03:10:18.597985608Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:tenantId/usage/by-provider, GET} route +0ms
2026-05-22T03:10:18.598058396Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:tenantId/usage/by-model, GET} route +1ms
2026-05-22T03:10:18.598207781Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:tenantId/model-access-rules, POST} route +0ms
2026-05-22T03:10:18.598515136Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:tenantId/model-access-rules/:ruleId, PUT} route +0ms
2026-05-22T03:10:18.598686100Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:tenantId/model-access-rules/:ruleId, DELETE} route +0ms
2026-05-22T03:10:18.598771373Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/users/:userUuid, PATCH} route +0ms
2026-05-22T03:10:18.599044939Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/provider-credentials, POST} route +0ms
2026-05-22T03:10:18.599145464Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/users/:userUuid/provider-credentials, GET} route +1ms
2026-05-22T03:10:18.599419231Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/provider-credentials, GET} route +0ms
2026-05-22T03:10:18.599486648Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/provider-credentials/:credentialId, PATCH} route +0ms
2026-05-22T03:10:18.599742237Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/provider-credentials, POST} route +0ms
2026-05-22T03:10:18.599984133Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/provider-settings, GET} route +0ms
2026-05-22T03:10:18.600108273Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/provider-settings, PATCH} route +1ms
2026-05-22T03:10:18.600173738Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RoutesResolver] HealthController {/api/v1/health}: +0ms
2026-05-22T03:10:18.600438254Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/health, GET} route +0ms
2026-05-22T03:10:18.600569330Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RoutesResolver] PublicConfigController {/api/v1/public/runtime-config}: +0ms
2026-05-22T03:10:18.600806513Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/public/runtime-config, GET} route +0ms
2026-05-22T03:10:18.600963622Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RoutesResolver] ConversationTransferController {/api/v1/chat-transfers}: +0ms
2026-05-22T03:10:18.601191467Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/chat-transfers/export/conversation, POST} route +1ms
2026-05-22T03:10:18.601278363Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/chat-transfers/export/archive, POST} route +0ms
2026-05-22T03:10:18.601504570Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/chat-transfers/import, POST} route +0ms
2026-05-22T03:10:18.601826363Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RoutesResolver] SetupController {/api/v1/setup}: +0ms
2026-05-22T03:10:18.602157311Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/setup/status, GET} route +1ms
2026-05-22T03:10:18.602647286Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/setup/bootstrap, POST} route +0ms
2026-05-22T03:10:18.602768667Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RoutesResolver] AuthController {/api/v1/auth}: +0ms
2026-05-22T03:10:18.602998735Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/login, POST} route +0ms
2026-05-22T03:10:18.603073440Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/refresh, POST} route +1ms
2026-05-22T03:10:18.603305473Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/logout, POST} route +0ms
2026-05-22T03:10:18.603553215Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/me, GET} route +0ms
2026-05-22T03:10:18.603815097Z [Nest] 1  - 05/22/2026, 3:10:18 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/active-tenant, POST} route +0ms
2026-05-22T03:10:18.639680508Z /app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/driver/postgres/PostgresQueryRunner.js:216
2026-05-22T03:10:18.639762344Z             throw new QueryFailedError_1.QueryFailedError(query, parameters, err);
2026-05-22T03:10:18.639780974Z                   ^
2026-05-22T03:10:18.639783092Z
2026-05-22T03:10:18.639784916Z QueryFailedError: relation "installation_state" does not exist
2026-05-22T03:10:18.639786748Z     at PostgresQueryRunner.query (/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/driver/postgres/PostgresQueryRunner.js:216:19)
2026-05-22T03:10:18.639788517Z     at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
2026-05-22T03:10:18.639790142Z     at async SelectQueryBuilder.loadRawResults (/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/query-builder/SelectQueryBuilder.js:2231:25)
2026-05-22T03:10:18.639791834Z     at async SelectQueryBuilder.executeEntitiesAndRawResults (/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/query-builder/SelectQueryBuilder.js:2079:26)
2026-05-22T03:10:18.639793538Z     at async SelectQueryBuilder.getRawAndEntities (/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/query-builder/SelectQueryBuilder.js:684:29)
2026-05-22T03:10:18.639795225Z     at async SelectQueryBuilder.getOne (/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/query-builder/SelectQueryBuilder.js:711:25)
2026-05-22T03:10:18.639796927Z     at async SetupStatusService.ensureInstallationState (/app/apps/admin-api/dist/setup/setup-status.service.js:32:31)
2026-05-22T03:10:18.639798621Z     at async SetupStatusBootstrapService.onApplicationBootstrap (/app/apps/admin-api/dist/setup/setup-status-bootstrap.service.js:21:9)
2026-05-22T03:10:18.639800283Z     at async Promise.all (index 1)
2026-05-22T03:10:18.639801860Z     at async callModuleBootstrapHook (/app/node_modules/.pnpm/@nestjs+core@11.1.19_@nestjs+common@11.1.19_class-transformer@0.5.1_class-validator@0.1_f9c6fa0e18205154294aa1faca2339d1/node_modules/@nestjs/core/hooks/on-app-bootstrap.hook.js:43:5) {
2026-05-22T03:10:18.639806642Z   query: 'SELECT "InstallationStateEntity"."id" AS "InstallationStateEntity_id", "InstallationStateEntity"."status" AS "InstallationStateEntity_status", "InstallationStateEntity"."setup_started_at" AS "InstallationStateEntity_setup_started_at", "InstallationStateEntity"."setup_completed_at" AS "InstallationStateEntity_setup_completed_at", "InstallationStateEntity"."completed_by_user_id" AS "InstallationStateEntity_completed_by_user_id", "InstallationStateEntity"."app_version" AS "InstallationStateEntity_app_version", "InstallationStateEntity"."created_at" AS "InstallationStateEntity_created_at", "InstallationStateEntity"."updated_at" AS "InstallationStateEntity_updated_at" FROM "installation_state" "InstallationStateEntity" WHERE (("InstallationStateEntity"."id" = $1)) LIMIT 1',
2026-05-22T03:10:18.639826690Z   parameters: [ 'global' ],
2026-05-22T03:10:18.639828374Z   driverError: error: relation "installation_state" does not exist
2026-05-22T03:10:18.639830443Z       at /app/node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/client.js:631:17
2026-05-22T03:10:18.639832080Z       at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
2026-05-22T03:10:18.639833737Z       at async PostgresQueryRunner.query (/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/driver/postgres/PostgresQueryRunner.js:181:25)
2026-05-22T03:10:18.639835470Z       at async SelectQueryBuilder.loadRawResults (/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/query-builder/SelectQueryBuilder.js:2231:25)
2026-05-22T03:10:18.639837185Z       at async SelectQueryBuilder.executeEntitiesAndRawResults (/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/query-builder/SelectQueryBuilder.js:2079:26)
2026-05-22T03:10:18.639838979Z       at async SelectQueryBuilder.getRawAndEntities (/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/query-builder/SelectQueryBuilder.js:684:29)
2026-05-22T03:10:18.639840694Z       at async SelectQueryBuilder.getOne (/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.20.0_redis@5.12.0/node_modules/typeorm/query-builder/SelectQueryBuilder.js:711:25)
2026-05-22T03:10:18.639842407Z       at async SetupStatusService.ensureInstallationState (/app/apps/admin-api/dist/setup/setup-status.service.js:32:31)
2026-05-22T03:10:18.639844070Z       at async SetupStatusBootstrapService.onApplicationBootstrap (/app/apps/admin-api/dist/setup/setup-status-bootstrap.service.js:21:9)
2026-05-22T03:10:18.639845793Z       at async Promise.all (index 1) {
2026-05-22T03:10:18.639847426Z     length: 118,
2026-05-22T03:10:18.639848945Z     severity: 'ERROR',
2026-05-22T03:10:18.639850525Z     code: '42P01',
2026-05-22T03:10:18.639852498Z     detail: undefined,
2026-05-22T03:10:18.639854047Z     hint: undefined,
2026-05-22T03:10:18.639855536Z     position: '678',
2026-05-22T03:10:18.639856993Z     internalPosition: undefined,
2026-05-22T03:10:18.639858503Z     internalQuery: undefined,
2026-05-22T03:10:18.639860057Z     where: undefined,
2026-05-22T03:10:18.639861535Z     schema: undefined,
2026-05-22T03:10:18.639863000Z     table: undefined,
2026-05-22T03:10:18.639864493Z     column: undefined,
2026-05-22T03:10:18.639865941Z     dataType: undefined,
2026-05-22T03:10:18.639867414Z     constraint: undefined,
2026-05-22T03:10:18.639868915Z     file: 'parse_relation.c',
2026-05-22T03:10:18.639870395Z     line: '1449',
2026-05-22T03:10:18.639871915Z     routine: 'parserOpenTable'
2026-05-22T03:10:18.639875759Z   },
2026-05-22T03:10:18.639877285Z   length: 118,
2026-05-22T03:10:18.639878837Z   severity: 'ERROR',
2026-05-22T03:10:18.639880370Z   code: '42P01',
2026-05-22T03:10:18.639881847Z   detail: undefined,
2026-05-22T03:10:18.639883275Z   hint: undefined,
2026-05-22T03:10:18.639884746Z   position: '678',
2026-05-22T03:10:18.639886237Z   internalPosition: undefined,
2026-05-22T03:10:18.639887793Z   internalQuery: undefined,
2026-05-22T03:10:18.639889400Z   where: undefined,
2026-05-22T03:10:18.639891089Z   schema: undefined,
2026-05-22T03:10:18.639892864Z   table: undefined,
2026-05-22T03:10:18.639895521Z   column: undefined,
2026-05-22T03:10:18.639897056Z   dataType: undefined,
2026-05-22T03:10:18.639898529Z   constraint: undefined,
2026-05-22T03:10:18.639900071Z   file: 'parse_relation.c',
2026-05-22T03:10:18.639901541Z   line: '1449',
2026-05-22T03:10:18.639902982Z   routine: 'parserOpenTable'
2026-05-22T03:10:18.639904507Z }
2026-05-22T03:10:18.639905979Z
2026-05-22T03:10:18.639907456Z Node.js v24.15.0
