Laurie Codex — réponses de cadrage pour la feature first-time setup

Oui, on valide la direction générale:

- CLI = prépare l’environnement technique.
- Wizard = configure les données applicatives.
- admin-api = propriétaire du setup applicatif.
- gateway-api = peut exposer uniquement le test live des providers, si cela évite de dupliquer les adapters.
- installation_state = table persistante partagée.
- bootstrap final = transactionnel et irréversible après completion.

Réponses aux 5 questions:

1. Où vit la feature setup côté backend?

Décision:
admin-api possède le setup applicatif:
- GET /api/v1/setup/status
- POST /api/v1/setup/bootstrap

gateway-api peut exposer seulement:
- POST /api/v1/setup/providers/test

Raison:
Le bootstrap crée le super admin, le premier tenant, les memberships, les policies et les clients d’intégration. C’est clairement du domaine admin.

Par contre, le test live des providers doit utiliser les adapters réels déjà branchés dans gateway-api. On ne veut pas dupliquer la logique provider dans admin-api juste pour le setup.

Règles:
- L’endpoint setup/providers/test dans gateway-api doit être token-guarded avec X-Setup-Token.
- Il doit être disponible seulement si setup non complété.
- Il ne persiste rien.
- Il ne log jamais les credentials.
- Il retourne seulement un résultat sanitisé: success/failure, provider, optional model tested, sanitized error code/message.

Plus tard, si on extrait un shared ProviderTestService propre, admin-api pourra redevenir le seul facade. Mais pour cette première implémentation, gateway-api pour le test live est acceptable.

2. installation_state partagé ou seulement admin-api?

Décision:
installation_state doit être une vraie table persistante partagée par admin-api et gateway-api.

Raison:
gateway-api doit savoir si les endpoints setup provider-test sont encore permis ou non. Il faut donc qu’il puisse lire l’état d’installation.

Implémentation souhaitée:
- Une seule table installation_state.
- Une entité TypeORM commune si possible.
- Si le projet a encore des entités dupliquées par app, ajouter la même entité côté admin-api et gateway-api, mais garder une seule migration source de vérité.
- Les deux APIs peuvent lire installation_state.
- Seul admin-api modifie l’état final lors du bootstrap.

Règle importante:
Si installation_state est absent mais qu’un super admin existe déjà, considérer l’installation comme non setup-required. Pour les installations existantes, on ne veut jamais exposer le wizard par accident.

Idéalement:
- au démarrage ou via migration, si super admin existe et installation_state absent, créer installation_state avec status = COMPLETED et source = legacy/existing.
- sinon, fresh DB = setupRequired true.

3. Scope des credentials providers créés pendant le setup

Décision:
Les credentials créés par le setup doivent être tenant-scoped par défaut.

Donc:
- créer le premier tenant;
- créer les credentials providers pour ce tenant;
- stocker via le stockage chiffré existant;
- ne pas créer de platform credentials par défaut.

Mode recommandé:
- tenant credentials enabled;
- user BYOK allowed si le modèle de config le supporte;
- platform fallback disabled par défaut.

En logique de résolution, on garde:
user BYOK → tenant credential → platform credential seulement si explicitement autorisé.

Mais au setup initial, la configuration créée est:
- credentialScope = tenant
- tenant provider enabled
- platform fallback = false

Raison:
C’est plus sûr pour un produit self-hosted. Le premier admin configure son tenant. On évite de créer une clé plateforme globale qui serait utilisée trop largement.

4. Bootstrap wizard vs ancien LXP_SUPER_ADMIN_EMAILS

Décision:
Le setup wizard devient la voie canonique pour une vraie installation.

L’ancien bootstrap env LXP_SUPER_ADMIN_EMAILS doit être gardé seulement comme fallback dev/emergency, mais il ne doit pas devenir une voie parallèle confuse.

Règles de precedence:
- Si installation_state = COMPLETED, le wizard est fermé.
- Si un super admin existe déjà, le wizard est fermé.
- Si setup wizard est utilisé, LXP_SUPER_ADMIN_EMAILS ne doit pas créer un autre chemin concurrent.
- En production, l’env bootstrap doit être désactivé par défaut sauf flag explicite du genre:
  LXP_ALLOW_ENV_SUPER_ADMIN_BOOTSTRAP=true

Usage recommandé:
- dev/local/testing: env bootstrap permis si explicitement activé.
- production/self-hosted: setup wizard recommandé.
- emergency recovery: commande maintenance documentée, pas comportement automatique magique.

Important:
On doit documenter que LXP_SUPER_ADMIN_EMAILS est legacy/dev/emergency, pas le flow officiel d’installation.

5. Où loger le CLI initial?

Décision:
Je préfère packages/cli-setup.

Raison:
Même si on garde la première passe simple, l’objectif est d’avoir un produit self-hosted sérieux. Le CLI va probablement devenir réutilisable/publiable plus tard avec une commande style:

npx @lxp-ai/llm-gateway-setup

ou

pnpm lxp setup

Donc autant le mettre dans un package dédié dès le départ, mais avec un scope très limité.

À ne pas faire:
- ne pas créer une grosse app CLI complexe;
- ne pas mélanger avec admin-api ou gateway-api;
- ne pas faire un framework maison.

Structure simple:
packages/cli-setup
- TypeScript
- clack/prompts ou équivalent
- picocolors
- génération .env
- génération secrets
- doctor command minimal

Commandes visées:
- setup:init
- setup:doctor
- setup:token:rotate éventuellement
- setup:reset éventuellement, mais dangereux et réservé maintenance

Décision validée:
On part donc avec:
1. admin-api possède setup/status et setup/bootstrap.
2. gateway-api expose seulement setup/providers/test pour réutiliser les adapters réels.
3. installation_state est une table TypeORM partagée.
4. provider credentials initiaux = tenant-scoped.
5. setup wizard remplace le bootstrap env comme flow officiel, env bootstrap reste fallback dev/emergency explicite.
6. CLI initial dans packages/cli-setup.

Contraintes supplémentaires à respecter:

- Le setup token ne doit pas être passé dans l’URL.
- Le CLI affiche:
  Setup URL: https://...
  Setup token: ...
  une seule fois.
- Le frontend demande le token dans un champ.
- Les requêtes setup utilisent:
  X-Setup-Token: <token>
- En env, on stocke idéalement:
  SETUP_TOKEN_HASH=sha256:<hash>
- Comparaison avec timingSafeEqual.
- Token brut jamais loggé.
- Provider keys jamais loggées.
- Integration API key affichée une seule fois après création.
- Bootstrap doit utiliser une transaction DB.
- Bootstrap doit verrouiller installation_state pendant la transaction pour éviter deux bootstraps concurrents.
- Après COMPLETED, tous les endpoints setup retournent 410 Gone ou 403, mais ne doivent plus permettre aucune action.

Plan d’implémentation souhaité avant code:

Phase 1 — Audit
- Inspecter auth/users/roles.
- Inspecter tenant/membership.
- Inspecter provider credential storage.
- Inspecter integration clients/API keys.
- Inspecter adapters provider côté gateway-api.
- Identifier où placer InstallationState entity + migration.

Phase 2 — Backend foundation
- Ajouter installation_state.
- Ajouter setup status dans admin-api.
- Ajouter setup token guard partagé.
- Ajouter bootstrap transactionnel dans admin-api.
- Ajouter provider test dans gateway-api.
- Ajouter tests unitaires/intégration.

Phase 3 — CLI foundation
- Créer packages/cli-setup.
- Générer .env sans écraser par défaut.
- Générer JWT secrets, credential encryption key, setup token, setup token hash.
- Ajouter doctor command.
- Afficher URL + token une seule fois.

Phase 4 — Frontend wizard
- /setup route.
- token entry step.
- system check.
- super admin.
- tenant.
- providers.
- policies.
- OpenWebUI integration.
- finish.

Phase 5 — Hardening
- setup closed after completion.
- no setup if super admin exists.
- logs sanitized.
- bootstrap rollback test.
- concurrency test.
- documentation install flow.

Acceptance criteria:
- Fresh install shows setup required.
- Existing install never exposes wizard.
- Bootstrap works once.
- Bootstrap cannot run twice.
- Provider test works before completion with setup token.
- Provider test is disabled after completion.
- First super admin, tenant, membership, policies and optional OpenWebUI client are created.
- Provider credentials are tenant-scoped and encrypted.
- No secrets are logged.
- CLI generates usable .env and prints setup token only once.
