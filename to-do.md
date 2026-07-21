# PR 2 — Tenant Registration Foundation

> **Document de travail destiné à Laurie Codex**
>
> Ce fichier est autonome. Il doit être utilisé uniquement pour la PR indiquée.
> Ne commence pas la PR suivante, même si certaines fondations semblent faciles à préparer.


## Métadonnées

- **Branche :** `feature/tenant-registration-foundation`
- **Départ :** `feature/user-profile-registration` après merge PR 1
- **Cible PR :** `feature/user-profile-registration`
- **Nature :** backend, persistence, contrats, admin UI, docs
- **Envoi de code :** hors périmètre
- **Création de compte :** hors périmètre

## Discipline de branche et de PR

Exécuter depuis un répertoire de travail propre :

```bash
git fetch origin
git checkout feature/user-profile-registration
git pull --ff-only origin feature/user-profile-registration
git status
```

Puis créer **la branche exacte de cette PR**. Si elle existe déjà localement ou sur `origin`, ne pas l'écraser et ne pas faire de `--force` : arrêter et signaler la situation.

Règles :

- La cible de la PR est `feature/user-profile-registration`.
- La branche doit être créée seulement après que la PR précédente a été mergée dans cette cible.
- Aucun commit direct sur `feature/user-profile-registration` ou `main`.
- Aucun reformatage massif, renommage opportuniste ou upgrade de dépendances non nécessaire.
- Aucun code de la PR suivante ne doit être préparé silencieusement.
- Chaque changement hors périmètre doit être retiré ou justifié avant la PR.
- Après les tests, préparer la PR puis **arrêter le travail**.


Créer ensuite :

```bash
git checkout -b feature/tenant-registration-foundation
```

## Lecture obligatoire avant toute modification

Avant d'écrire ou de modifier du code :

1. Lire `AGENTS.md` et `README.md`.
2. Inventorier le dossier `docs/`, puis lire au minimum :
  - `docs/SCOPE.md`
  - `docs/product/system-scope.md`
  - `docs/architecture/overview.md`
  - `docs/architecture/auth-flow.md`
  - `docs/architecture/ui-architecture.md`
  - `docs/architecture/decisions/ADR-005-auth-token-model.md`
  - `docs/architecture/decisions/ADR-006-web-session-and-runtime-config.md`
  - les autres ADR touchant directement la PR
  - les documents de sécurité, setup, proxy et VPS pertinents
3. Lire les `package.json` de la racine et des applications touchées pour confirmer les scripts réels.
4. Examiner les migrations et conventions TypeORM avant toute modification de schéma.
5. Examiner les tests existants et leurs helpers avant d'ajouter une nouvelle stratégie.
6. Distinguer dans l'audit :
  - **fait observé dans le dépôt** ;
  - **hypothèse** ;
  - **proposition** ;
  - **décision nécessitant approbation**.
7. Produire un court état des lieux et un plan d'exécution avant de modifier le premier fichier.

Le dépôt demeure la source de vérité. Les chemins proposés plus bas sont des candidats à confirmer.


## Mandat

Ajouter la fondation tenant-aware permettant d'activer l'inscription explicitement par tenant et de résoudre le tenant depuis l'URL publique.

La PR doit répondre à :

1. Quel tenant correspond à la requête publique ?
2. L'inscription est-elle autorisée globalement ?
3. Le tenant l'a-t-il activée ?
4. Que peut exposer le runtime public sans fuite ?

## Baseline à confirmer

- `GET /api/v1/public/runtime-config` lit actuellement `LXP_REGISTRATION_ENABLED`.
- Aucun tenant n'est résolu depuis le hostname.
- `TenantEntity` n'a pas de mapping public de hostname.
- `/register` est encore un placeholder.
- Les utilisateurs sont globaux et liés aux tenants par membership.
- Une surface admin des tenants existe.

## Décision fonctionnelle

### Kill switch global

`LXP_REGISTRATION_ENABLED` reste un kill switch.

Si faux :

- aucun tenant ne rend l'inscription disponible ;
- les settings tenant restent stockés mais inactifs ;
- le runtime n'annonce pas l'inscription.

### Tenant unique

Si exactement un tenant actif existe :

- il peut être tenant public par défaut ;
- aucun hostname n'est obligatoire ;
- registration reste désactivée tant qu'un admin ne l'active pas.

### Multi-tenant

Si plusieurs tenants actifs existent :

- mapping hostname explicite obligatoire ;
- jamais de fallback vers le premier tenant ;
- hostname inconnu => registration indisponible ;
- le login global ne doit pas casser.

### Nouveau tenant

- registration disabled ;
- aucun domaine présumé ;
- aucune activation automatique ;
- état admin « not configured » ou équivalent.

## Modèle de données conceptuel

### `tenant_public_hosts`

```text
id
tenant_id
hostname
is_primary
enabled
created_at
updated_at
```

Contraintes :

- hostname normalisé lowercase ;
- port et point final retirés ;
- unicité globale ;
- FK explicite ;
- index tenant ;
- au plus un primary actif si cette notion est retenue ;
- pas de wildcard dans cette version.

### `tenant_registration_settings`

```text
tenant_id
enabled
default_role_id ou stratégie équivalente
created_at
updated_at
```

Principes :

- une config par tenant ;
- `enabled = false` par défaut ;
- jamais `super_admin` ;
- aucun rôle admin/opérateur self-assignable ;
- aucun champ SMTP/SMS dans cette PR.

Si `default_role_id` est dangereux ou inutile, proposer un rôle canonique `user`.

## Hostname et proxy

Créer un service testable qui :

- lit le host réel ;
- retire port ;
- normalise casse ;
- traite point final ;
- rejette invalides ;
- ne fait confiance à `X-Forwarded-Host` qu'avec proxy de confiance configuré ;
- ne fait jamais confiance à un header arbitraire venant d'Internet.

Auditer Caddy et `trust proxy`.

## Service de résolution

Le contrôleur public ne doit pas contenir toute la logique.

Séparation possible :

```text
public-registration-context.service.ts
tenant-public-host-resolver.service.ts
tenant-registration-settings.service.ts
```

Exigences :

- logique unitaire testable ;
- pas de SQL dispersé ;
- pas de fallback ambigu ;
- pas de détail interne public.

## Runtime public

Cible minimale :

```json
{
  "registrationEnabled": true,
  "tenant": {
    "slug": "lxp",
    "displayName": "LXP Technologies"
  }
}
```

Règles :

- `registrationEnabled` = global + tenant résolu + tenant enabled.
- `tenant` null/absent si non résolu.
- Aucun UUID interne.
- Aucun secret, rôle ou hostname alternatif.
- Les channels arrivent plus tard.
- L'absence de tenant ne produit pas 500.

Un contrat structuré différent est possible après analyse de compatibilité.

## Administration

Ajouter :

- état registration ;
- enable/disable ;
- gestion des hostnames ;
- indication tenant par défaut si tenant unique ;
- validation du rôle standard ;
- avertissement multi-tenant sans mapping ;
- nouveaux tenants disabled.

Toutes les mutations sont protégées par les guards existants.

## Endpoints candidats

```text
GET    /api/v1/admin/tenants/:tenantId/registration-settings
PATCH  /api/v1/admin/tenants/:tenantId/registration-settings
GET    /api/v1/admin/tenants/:tenantId/public-hosts
POST   /api/v1/admin/tenants/:tenantId/public-hosts
PATCH  /api/v1/admin/tenants/:tenantId/public-hosts/:hostId
DELETE /api/v1/admin/tenants/:tenantId/public-hosts/:hostId
```

Adapter aux conventions réelles.

## Migration/backfill

- Créer tables/colonnes.
- Ajouter contraintes/indexes.
- Créer settings disabled pour tenants existants, ou lazy creation sûre.
- Ne jamais activer automatiquement.
- Ne pas inventer de hostname.
- Conserver les données.
- `down` si requis.

Tester base vide, 1 tenant, plusieurs tenants et rollback supporté.

## Inclus

- Hostnames publics.
- Settings tenant.
- Résolution sûre.
- Runtime tenant-aware.
- Endpoints admin.
- UI admin.
- Migrations.
- Tests.
- ADR hostname/tenant.
- Docs proxy/deploy si nécessaire.

## Hors périmètre

- Email/SMTP/SMS.
- Code/challenge.
- Création de compte.
- Formulaire complet.
- Auto-login.
- Invitations/approval.
- Wildcards.
- Branding avancé.
- Rôle privilégié.
- Changement du modèle global d'identité.

## Fichiers candidats

```text
apps/admin-api/src/public-config.controller.ts
apps/admin-api/src/app.module.ts
apps/admin-api/src/admin/**
apps/admin-api/src/persistence/entities/tenant.entity.ts
apps/admin-api/src/persistence/entities/tenant-public-host.entity.ts
apps/admin-api/src/persistence/entities/tenant-registration-settings.entity.ts
apps/admin-api/src/persistence/migrations/*
apps/admin-api/src/config/*
apps/admin-web/src/pages/tenants-page.tsx
apps/admin-web/src/pages/tenants-page.test.tsx
apps/admin-web/src/features/tenants/**
apps/admin-web/src/lib/api-client*
packages/contracts/**
docs/SCOPE.md
docs/product/system-scope.md
docs/architecture/overview.md
docs/architecture/ui-architecture.md
docs/architecture/decisions/ADR-0xx-tenant-public-host-resolution.md
docs/setup/vps.md
infra/proxy/caddy/lxp-gateway.Caddyfile.example
```

## Tests backend

### Résolution

- zéro tenant actif ;
- un tenant actif ;
- un tenant + host ;
- multi + host exact ;
- multi + host inconnu ;
- casse/port/point final ;
- host invalide ;
- doublon rejeté ;
- mapping disabled ;
- tenant inactive ;
- forwarded host ignoré sans trust proxy ;
- forwarded host accepté seulement avec config approuvée.

### Activation

- global faux + tenant vrai => faux ;
- global vrai + tenant faux => faux ;
- global vrai + tenant vrai + résolu => vrai ;
- non résolu => faux ;
- nouveau tenant => faux ;
- rôle privilégié => rejet.

### Isolation

- admin non autorisé rejeté ;
- isolation inter-tenant ;
- runtime sans infos internes ;
- erreurs sans fuite.

## Tests frontend

- disabled/enabled ;
- tenant résolu ;
- ajout host valide ;
- invalid/doublon ;
- suppression confirmée ;
- warning multi sans mapping ;
- nouveau tenant disabled ;
- erreurs API ;
- pending bloque doubles mutations.

## Critères d'acceptation

- [ ] PR 1 mergée avant création.
- [ ] Kill switch global conservé.
- [ ] Tenant unique peut servir de défaut.
- [ ] Multi exige host explicite.
- [ ] Aucun fallback « premier tenant ».
- [ ] Host inconnu => indisponible.
- [ ] Forwarded headers seulement derrière proxy trusted.
- [ ] Hostnames normalisés et uniques.
- [ ] Nouveau tenant disabled.
- [ ] Aucun tenant existant activé par migration.
- [ ] Aucun rôle privilégié configurable.
- [ ] Runtime expose seulement le nécessaire.
- [ ] Login continue sans tenant public.
- [ ] Admin gère settings/hosts.
- [ ] Migrations base vide/existante passent.
- [ ] Tests sécurité/isolation passent.
- [ ] ADR/docs à jour.
- [ ] Aucun SMTP/challenge/account/SMS.

## Définition de terminé

Résolution déterministe du tenant, posture disabled par défaut et contexte public sûr, sans prétendre fournir l'inscription complète.

## Titre suggéré

```text
feat(admin-api): add tenant-aware registration configuration
```

## Description PR suggérée

```markdown
## Summary
- Adds explicit public hostname mapping for tenants
- Adds per-tenant registration settings, disabled by default
- Makes runtime config tenant-aware

## Security
- No first-tenant fallback
- Forwarded host trusted only behind configured proxy
- Privileged roles blocked

## Migrations
[details]

## Validation
[commands/results]

## Out of scope
Verification delivery and account creation.
```

## Compte rendu final attendu de Laurie Codex

À la fin de la PR, fournir :

1. Résumé fonctionnel.
2. Décisions prises et raisons.
3. Liste des fichiers créés, modifiés et supprimés.
4. Migrations et effets sur les données, s'il y en a.
5. Contrats API modifiés, avec exemples avant/après.
6. Tests exécutés, commandes exactes et résultats.
7. Vérifications manuelles effectuées.
8. Risques résiduels et éléments hors périmètre.
9. Étapes de configuration ou de déploiement.
10. Titre proposé de la PR.
11. Description complète de la PR.
12. Checklist de revue.
13. Confirmation explicite : **« Je n'ai pas commencé la PR suivante. »**

## Condition d'arrêt

Lorsque le code, les tests, la documentation et la description de PR sont prêts, arrêter. Ne pas créer la branche suivante et ne pas continuer sans instruction explicite de Patrick.
