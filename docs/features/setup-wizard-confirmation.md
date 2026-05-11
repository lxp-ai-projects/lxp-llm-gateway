Oui, on valide le plan proposé. Il est aligné avec l’architecture voulue.

Décision validée:
- Phase 1: installation_state + guards
- Phase 2: setup endpoints admin-api
- Phase 3: provider test gateway-api
- Phase 4: packages/cli-setup
- Phase 5: tests/hardening
- Frontend wizard après la fondation backend/CLI

Quelques précisions à intégrer avant de coder:

1. installation_state doit être singleton

La table installation_state doit être conçue comme un état global d’installation, pas une table multi-row.

Prévoir:
- id fixe ou clé unique singleton
- contrainte unique empêchant plusieurs états actifs
- status: PENDING | IN_PROGRESS | COMPLETED

Pendant bootstrap, il faut gérer le cas où la ligne n’existe pas encore.

Règle:
- si ligne absente et aucun super admin existe: créer/initialiser PENDING
- si ligne absente mais super admin existe: considérer setup fermé / completed legacy
- si ligne présente COMPLETED: setup fermé

2. Verrouillage transactionnel / concurrence

Le bootstrap doit être protégé contre deux requêtes simultanées.

À prévoir:
- transaction TypeORM
- lock pessimiste sur installation_state si la ligne existe
- si la ligne n’existe pas, créer la ligne de manière atomique avant de continuer
- en alternative, utiliser advisory lock PostgreSQL si c’est plus simple/propre

Acceptance:
Deux POST /setup/bootstrap simultanés:
- un seul réussit
- l’autre échoue proprement
- aucun doublon user/tenant/membership
- installation_state finit en COMPLETED une seule fois

3. SetupStatus doit rester public mais safe

GET /api/v1/setup/status peut être public, mais il ne doit jamais exposer:
- setup token hash
- env vars
- secrets
- database info
- détails internes sensibles

Réponse attendue:
- setupRequired
- setupCompleted
- tokenRequired
- version si disponible

Si super admin existe déjà, setupRequired doit toujours être false, même si installation_state est absent.

4. Setup token guard partagé

Le guard/verifier X-Setup-Token doit être réutilisable dans admin-api et gateway-api.

Si le repo a déjà un package shared/common approprié, le mettre là.
Sinon, duplication minimale acceptable pour la première passe, mais éviter deux implémentations divergentes.

Le verifier doit:
- lire LXP_SETUP_TOKEN_HASH
- refuser si absent en mode où le setup est requis
- comparer avec crypto.timingSafeEqual
- supporter le format sha256:<hash>
- ne jamais logger le token brut

5. Legacy env bootstrap

Très important:
L’ancien bootstrap par LXP_SUPER_ADMIN_EMAILS ne doit pas rester actif silencieusement en production.

Règle validée:
- setup wizard = flow officiel
- env bootstrap = dev/emergency seulement
- activation seulement avec flag explicite:
  LXP_ALLOW_ENV_SUPER_ADMIN_BOOTSTRAP=true

Si ce flag est absent ou false:
- ne pas créer de super admin automatiquement depuis env

6. Provider test dans gateway-api

Validé:
gateway-api expose POST /api/v1/setup/providers/test uniquement pour réutiliser les vrais adapters.

Contraintes:
- X-Setup-Token obligatoire
- setup non complété uniquement
- aucune persistance
- aucune API key dans les logs
- erreurs sanitisées
- pas de payload complet provider dans les logs
- ne pas tester de génération coûteuse si possible; utiliser un call minimal, list models, lightweight request, ou provider-specific health check selon ce que l’adapter permet

7. Bootstrap admin-api

Le bootstrap final doit rester transactionnel.

Le frontend pourra être multi-step, mais le backend ne doit pas créer un état partiel à chaque étape.

Le vrai commit applicatif se fait dans:
POST /api/v1/setup/bootstrap

La transaction doit couvrir:
- installation_state IN_PROGRESS/COMPLETED
- premier user
- rôle super_admin
- premier tenant
- membership initial
- policies
- tenant provider configurations
- credentials chiffrés tenant-scoped
- client OpenWebUI optionnel
- API key optionnelle

Si une étape échoue:
- rollback complet
- setup non complété
- aucune donnée orpheline

8. CLI

Validé:
packages/cli-setup.

Mais garder le scope petit:
- setup:init
- setup:doctor

Pas de setup:reset dangereux dans la première passe, sauf si clairement dev-only et protégé.

Le CLI écrit un seul .env racine.

Si .env existe:
- keep existing
- fill missing
- rotate setup token
- overwrite all

Le .env doit stocker:
- LXP_SETUP_TOKEN_HASH
- secrets JWT selon architecture existante
- encryption master key
- encryption key version
- URLs/config nécessaires

Le token brut est affiché une seule fois.

9. Ordre d’exécution

L’ordre proposé est bon, mais je mettrais status + guard avant provider test:

1. installation_state + migration
2. setup status endpoint
3. setup token verifier/guard partagé
4. gateway-api provider test
5. admin-api bootstrap transactionnel
6. cli-setup
7. tests/hardening
8. frontend wizard

10. Ne pas élargir le scope

Important:
Ne pas refactorer JWT, auth, provider credentials ou tenants au-delà de ce qui est nécessaire pour la feature setup.

Si une dette est découverte, la documenter, mais ne pas transformer cette PR en refactor global.

==

Tu peux préparer le plan de fichiers exacts pour la Phase 1 et commencer par:
- InstallationStateEntity
- migration admin-api
- lecture setup state
- status endpoint minimal
- tests du status fresh/completed/legacy
