# PR 3 — Registration Email Verification

> **Document de travail destiné à Laurie Codex**
>
> Ce fichier est autonome. Il doit être utilisé uniquement pour la PR indiquée.
> Ne commence pas la PR suivante, même si certaines fondations semblent faciles à préparer.


## Métadonnées

- **Branche :** `feature/registration-email-verification`
- **Départ :** `feature/user-profile-registration` après merge PR 2
- **Cible PR :** `feature/user-profile-registration`
- **Nature :** backend, persistence, SMTP, sécurité, admin config, contrats
- **Création finale de compte :** hors périmètre
- **SMS :** hors périmètre

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
git checkout -b feature/registration-email-verification
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

Implémenter une preuve sécurisée de possession du courriel pour le tenant résolu :

1. demander un code ;
2. envoyer via SMTP ;
3. vérifier ;
4. produire une preuve courte consommable par PR 4 ;
5. gérer expiration, essais, renvoi et abuse limits ;
6. configurer/tester le transport.

Aucun `User`, `TenantMembership` ou rôle ne doit être créé.

## Frontière

Ne pas gonfler `AuthService`/`AuthController`. Créer une feature dédiée :

```text
registration-verification/
  registration-verification.module.ts
  registration-verification.controller.ts
  registration-verification.service.ts
  delivery/
  dto/
```

## Abstraction de livraison

Concept :

```ts
type VerificationChannel = 'email';

interface VerificationDeliveryProvider {
  readonly channel: VerificationChannel;
  sendChallenge(input: {
    tenantId: string;
    tenantDisplayName: string;
    destination: string;
    code: string;
    expiresInMinutes: number;
  }): Promise<void>;
}
```

- SMTP seul provider fonctionnel.
- Pas de faux SMS.
- Pas de framework de notification général.
- Seam extensible sans types vendor dans le domaine.
- Toute dépendance est justifiée.

## Configuration SMTP

Cible à adapter :

```text
LXP_SMTP_ENABLED
LXP_SMTP_HOST
LXP_SMTP_PORT
LXP_SMTP_SECURE
LXP_SMTP_USER
LXP_SMTP_PASSWORD
LXP_SMTP_FROM_EMAIL
LXP_SMTP_FROM_NAME
LXP_SMTP_REQUIRE_TLS
```

Principes :

- aucun secret public/log ;
- config invalide => email non ready ;
- app démarre si SMTP disabled ;
- inscription active + SMTP down => canal non annoncé ;
- timeouts bornés ;
- pas de retry infini ;
- tests sans envoi réel.

Préférer transport global + activation tenant pour cette PR, sauf contrainte existante. Ne pas détourner les credentials LLM.

## Challenge conceptuel

```text
registration_verification_challenges
  id
  tenant_id
  channel
  destination_hash
  code_digest
  purpose
  expires_at
  verified_at
  consumed_at
  invalidated_at
  attempt_count
  resend_count
  resend_available_at
  completion_token_digest
  completion_token_expires_at
  created_at
  updated_at
```

### Stockage

- Jamais code brut persisté/loggé.
- Email normalisé comme l'identité.
- Destination hash via mécanisme compatible existant.
- Code court protégé par HMAC secret ou hash lent + pepper.
- Completion token aléatoire, long, stocké en digest, retourné une fois.
- Pas d'email clair durable si inutile.

## Defaults de sécurité

- 6 chiffres via CSPRNG ;
- expiration 10 min ;
- 5 essais ;
- resend cooldown 60 s ;
- 3 resends/challenge ;
- completion token 15 min ;
- resend invalide l'ancien code ;
- code vérifié non réutilisable ;
- preuve consommée non réutilisable.

Toute variation est expliquée.

## Endpoints publics candidats

```text
POST /api/v1/public/registration/email/challenges
POST /api/v1/public/registration/email/challenges/:challengeId/verify
POST /api/v1/public/registration/email/challenges/:challengeId/resend
```

Demande :

```json
{
  "email": "person@example.com"
}
```

Réponse générique :

```json
{
  "challengeId": "uuid",
  "expiresAt": "ISO-8601",
  "resendAvailableAt": "ISO-8601"
}
```

Vérification :

```json
{
  "code": "123456"
}
```

Succès :

```json
{
  "completionToken": "opaque-random-secret",
  "expiresAt": "ISO-8601"
}
```

Renvoi :

- respecte cooldown ;
- resoumet email si aucune destination claire stockée ;
- vérifie correspondance ;
- nouveau code ;
- ancien invalidé ;
- compteur incrémenté ;
- vie non prolongée à l'infini.

## Anti-enumeration

Avant preuve :

- réponse générique ;
- ne pas dire si compte existe/membership ;
- statuts HTTP cohérents ;
- éviter gros écarts de timing.

Il est acceptable d'envoyer un code à une adresse déjà existante ; PR 4 décidera après preuve.

## Rate limiting

Couvrir :

- IP ;
- tenant ;
- destination hash ;
- challenge ;
- resend ;
- verify.

Utiliser Redis si cohérent.

Defaults recommandés :

- 5 demandes/h/destination/tenant ;
- 20 demandes/h/IP ;
- 5 verifies/challenge ;
- 3 resends/challenge.

Logs : challenge ID, tenant ID, channel, résultat ; jamais email/code/token brut.

## Email

Texte + HTML simple :

- tenant display name ;
- code ;
- expiration ;
- ignorer si non demandé ;
- aucun tracking/pixel ;
- aucun détail sensible.

## Runtime readiness

Annoncer `email` seulement si :

- global actif ;
- tenant résolu ;
- tenant registration active ;
- SMTP valide.

Exemple :

```json
{
  "registrationEnabled": true,
  "tenant": {
    "slug": "lxp",
    "displayName": "LXP Technologies"
  },
  "verificationChannels": ["email"]
}
```

## Admin

Afficher :

- SMTP disabled/invalid/ready ;
- from address ;
- test admin-only ;
- message si registration active mais email non ready.

Endpoint candidat :

```text
POST /api/v1/admin/tenants/:tenantId/registration/email/test
```

Le test est protégé, rate-limité et ne devient pas un relais arbitraire.

## Inclus

- Module verification.
- Entité/migration challenge.
- SMTP adapter.
- Config/validation.
- Code sécurisé.
- Completion token.
- Expiration/attempts/resend.
- Rate limits.
- Templates.
- Runtime readiness.
- Admin test/readiness.
- Tests/docs.

## Hors périmètre

- User/membership/rôle.
- Formulaire final.
- Auto-login.
- SMS/téléphone.
- Password reset.
- Invitation.
- Marketing.
- Notification framework.
- Queue distribuée sans besoin démontré.

## Fichiers candidats

```text
apps/admin-api/src/registration-verification/**
apps/admin-api/src/persistence/entities/registration-verification-challenge.entity.ts
apps/admin-api/src/persistence/migrations/*
apps/admin-api/src/config/*
apps/admin-api/src/app.module.ts
apps/admin-api/src/public-config.controller.ts
apps/admin-api/.env.example
apps/admin-web/src/pages/tenants-page.tsx
apps/admin-web/src/features/tenants/**
apps/admin-web/src/lib/api-client*
packages/contracts/**
docs/architecture/auth-flow.md
docs/architecture/overview.md
docs/security/*
docs/setup/quickstart.md
docs/setup/vps.md
infra/compose/*
scripts/generate-vps-env.sh
scripts/Generate-VpsEnv.ps1
```

## Tests

### Challenge

- email valide/normalisé ;
- tenant non résolu ;
- global/tenant disabled ;
- SMTP non ready ;
- code correct/incorrect/expiré ;
- déjà vérifié ;
- invalidé par resend ;
- max attempts ;
- resend avant/après cooldown ;
- max resends ;
- completion token une fois ;
- digest seulement ;
- preuve consommée ;
- deux verify simultanés.

### SMTP

- disabled ;
- config partielle ;
- TLS/secure ;
- timeout ;
- succès/échec ;
- pas de password leak ;
- texte + HTML ;
- aucun vrai envoi unit test.

### Anti-abus/confidentialité

- IP/destination/tenant/challenge limits ;
- Redis TTL ;
- code/token/email absents des logs ;
- runtime sans secret ;
- réponse sans account enumeration.

## Critères d'acceptation

- [ ] PR 2 mergée.
- [ ] Aucun user/membership créé.
- [ ] SMTP seul provider fonctionnel.
- [ ] Code via CSPRNG.
- [ ] Code brut non stocké/loggé.
- [ ] Protection adaptée aux codes courts.
- [ ] Email normalisé comme l'existant.
- [ ] Expiration/attempts/resend appliqués.
- [ ] Ancien code invalidé au resend.
- [ ] Completion token opaque, court, one-time, digest-only.
- [ ] Anti-enumeration.
- [ ] Rate limits IP/tenant/destination.
- [ ] Email annoncé seulement si SMTP ready.
- [ ] Test SMTP admin-only et borné.
- [ ] Aucun secret exposé.
- [ ] Templates testés.
- [ ] Migrations/tests passent.
- [ ] Env/VPS/scripts à jour.
- [ ] Aucun formulaire final/account/SMS.

## Définition de terminé

Un client peut obtenir et valider une preuve email et recevoir un completion token, sans création de compte.

## Titre suggéré

```text
feat(admin-api): add SMTP registration email verification
```

## Description PR suggérée

```markdown
## Summary
- Adds tenant-aware email verification challenges
- Adds SMTP delivery with readiness checks
- Adds one-time completion tokens

## Security
- No raw code/token persistence
- Anti-enumeration
- Redis-backed abuse limits
- Expiration, attempt and resend controls

## Migrations
[details]

## Validation
[commands/results]

## Out of scope
User creation and SMS.
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
