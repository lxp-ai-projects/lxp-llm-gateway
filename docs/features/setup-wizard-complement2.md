Oui, on valide ces deux points.

1. Source de vérité de la migration installation_state

Décision:
admin-api est la source de vérité pour la migration installation_state.

Raison:
admin-api possède le domaine setup applicatif:
- setup/status
- setup/bootstrap
- création du premier super admin
- création du premier tenant
- création membership/policies
- création optionnelle integration client
- transition finale vers COMPLETED

Donc c’est logique que la migration officielle vive côté admin-api.

gateway-api peut avoir une entité miroir ou une lecture repository compatible, mais ne doit pas posséder la migration ni modifier l’état final.

Règles:
- admin-api owns schema migration.
- admin-api owns writes to installation_state.
- gateway-api reads installation_state only.
- gateway-api uses it only to allow/deny POST /api/v1/setup/providers/test.
- Si les deux apps ont des entités TypeORM séparées, gateway-api peut dupliquer l’entité en lecture, mais la migration reste admin-api.
- Éviter deux migrations concurrentes pour la même table.

2. CLI et .env racine

Décision:
Oui, le CLI écrit un unique .env à la racine du repo.

Raison:
Pour une première installation self-hosted, un .env racine unique est plus simple à comprendre, à documenter et à monter dans docker compose.

On veut éviter:
- .env.admin-api
- .env.gateway-api
- .env.web
- secrets dupliqués ou incohérents

Le .env racine devient la source de config d’installation, utilisée par docker compose pour injecter les bonnes variables dans chaque service.

Nommage recommandé:
Utiliser un préfixe explicite LXP_ pour éviter les collisions.

Variables minimales:
- LXP_PUBLIC_APP_URL
- LXP_ADMIN_API_URL ou internal service URL si nécessaire
- LXP_GATEWAY_API_URL ou internal service URL si nécessaire
- LXP_DATABASE_URL_ADMIN ou LXP_DATABASE_URL si une seule DB logique
- LXP_DATABASE_URL_GATEWAY si les services ont besoin d’URLs séparées
- LXP_SETUP_TOKEN_HASH
- LXP_JWT_PRIVATE_KEY ou LXP_JWT_SECRET selon l’implémentation actuelle
- LXP_JWT_PUBLIC_KEY si JWT asymétrique
- LXP_ENCRYPTION_MASTER_KEY
- LXP_ENCRYPTION_KEY_VERSION

Important:
Si l’auth actuelle utilise déjà des secrets symétriques JWT, ne pas forcer une migration vers private/public key dans cette feature. Utiliser les variables alignées avec l’existant, mais nommées proprement.

Donc:
- si JWT symétrique actuel: LXP_JWT_ACCESS_SECRET / LXP_JWT_REFRESH_SECRET
- si JWT asymétrique déjà présent ou décidé: LXP_JWT_PRIVATE_KEY / LXP_JWT_PUBLIC_KEY

Ne pas élargir le scope inutilement.

Règles CLI:
- Le CLI ne doit jamais écraser .env sans confirmation.
- Si .env existe, proposer:
  1. keep existing
  2. fill missing values only
  3. rotate setup token
  4. overwrite all
- Le setup token brut est affiché une seule fois.
- Le .env ne stocke que LXP_SETUP_TOKEN_HASH, pas le token brut.
- Les secrets générés ne doivent pas être loggés à répétition.
- Ajouter .env au .gitignore si ce n’est pas déjà fait.
- Fournir un .env.example sans secrets réels.

Décision finale:
- admin-api owns installation_state migration.
- gateway-api reads installation_state only.
- packages/cli-setup writes a single root .env.
- Use LXP_ prefixed env vars.
- Respect existing JWT/encryption architecture; do not introduce a JWT architecture change inside this setup feature unless already planned separately.

Tu peux maintenant proposer le plan d’implémentation détaillé par fichiers et phases.
