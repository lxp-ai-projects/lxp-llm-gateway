# PR21 FINALIZATION — Registration Email Verification

Repository:
lxp-ai-projects/lxp-llm-gateway

Current branch:
feature/registration-email-verification

Target:
main

Current PR:
#21 — Feature/registration email verification

IMPORTANT:
This branch has been inactive for some time and its implementation is currently
incomplete/inconsistent. Do not assume previous WIP commits are correct.

The goal is to FINALIZE PR21 ONLY.

Do not start the next registration PR.
Do not implement PGS integration.
Do not implement structured evaluations.
Do not perform opportunistic refactors.
Do not fix unrelated bugs discovered during the audit.

Any unrelated bug must instead be documented for a separate PR.

──────────────────────────────────────────────────────────────────────
1. SOURCE OF TRUTH
   ──────────────────────────────────────────────────────────────────────

Before changing code, read:

- AGENTS.md
- README.md
- to-do.md
- docs/SCOPE.md
- docs/product/system-scope.md
- docs/architecture/overview.md
- docs/architecture/auth-flow.md
- docs/architecture/ui-architecture.md
- relevant ADRs
- relevant setup/VPS/security docs
- root and affected package.json files
- current TypeORM migrations
- current tests and test runners

Treat the CURRENT REPOSITORY as the ultimate source of truth.

`to-do.md` contains the intended PR21 contract and acceptance criteria.
Compare it against the actual branch implementation.

Do not blindly implement text from to-do.md if the current architecture has
evolved. Reuse current conventions and abstractions wherever possible.

──────────────────────────────────────────────────────────────────────
2. FIRST STEP: AUDIT BEFORE EDITING
   ──────────────────────────────────────────────────────────────────────

Before modifying any file, produce a concise audit with four categories:

A. Implemented and correct
B. Partially implemented
C. Missing / merge-blocking
D. Out-of-scope bugs or unrelated failures

For every finding, distinguish:

- observed fact
- hypothesis
- proposed action

Explicitly audit the diff:

    git diff main...feature/registration-email-verification

Also inspect the six commits currently belonging to PR21 and determine whether
any change is unrelated to registration email verification.

Do not begin implementation until this audit is complete.

──────────────────────────────────────────────────────────────────────
3. KNOWN ITEMS THAT MUST BE VERIFIED
   ──────────────────────────────────────────────────────────────────────

These are observations from the current remote branch. Verify them locally
before acting.

The branch currently references:

    RegistrationVerificationModule
    RegistrationVerificationService
    RegistrationVerificationChallengeEntity

from:

    apps/admin-api/src/app.module.ts
    apps/admin-api/src/admin.controller.ts
    apps/admin-api/src/public-config.controller.ts
    apps/admin-api/src/config/runtime.config.ts

but the expected registration-verification implementation appears to be absent.

Verify whether these sources are genuinely missing.

Expected feature boundary from the PR specification:

    apps/admin-api/src/registration-verification/
      registration-verification.module.ts
      registration-verification.controller.ts
      registration-verification.service.ts
      delivery/
      dto/

Also verify whether this entity exists:

    apps/admin-api/src/persistence/entities/
      registration-verification-challenge.entity.ts

and whether a corresponding TypeORM migration exists.

Do NOT simply remove the imports to make the build green unless the PR scope is
being intentionally reduced and the public contracts/docs are changed
accordingly.

The intended PR21 Definition of Done is a FUNCTIONAL email verification proof
flow, not readiness UI alone.

──────────────────────────────────────────────────────────────────────
4. REQUIRED FUNCTIONAL SCOPE
   ──────────────────────────────────────────────────────────────────────

PR21 must implement a secure tenant-aware proof of email possession:

1. Client requests an email verification challenge.
2. Email is normalized consistently with existing identity handling.
3. Tenant is resolved through the existing public-host mechanism.
4. Global and tenant registration state are respected.
5. Selected email provider must be ready.
6. Verification code is generated securely.
7. Code is delivered through the selected provider.
8. Client verifies the code.
9. Successful verification returns a short-lived opaque completion token.
10. Completion token can later be consumed by the next registration PR.

PR21 MUST NOT create:

- User
- TenantMembership
- role assignment
- authenticated session
- final account
- SMS verification

Those belong to later PRs.

──────────────────────────────────────────────────────────────────────
5. EMAIL DELIVERY ABSTRACTION
   ──────────────────────────────────────────────────────────────────────

Maintain one provider-neutral delivery seam.

SMTP and MailerSend must both implement the same conceptual contract.

No MailerSend-specific types should leak into the verification domain.

Reuse the existing configuration that is already present where valid:

    LXP_EMAIL_DELIVERY_PROVIDER
    LXP_SMTP_ENABLED
    LXP_SMTP_HOST
    LXP_SMTP_PORT
    LXP_SMTP_SECURE
    LXP_SMTP_USER
    LXP_SMTP_PASSWORD
    LXP_SMTP_FROM_EMAIL
    LXP_SMTP_FROM_NAME
    LXP_SMTP_REQUIRE_TLS

    LXP_MAILERSEND_API_KEY
    LXP_MAILERSEND_FROM_EMAIL
    LXP_MAILERSEND_FROM_NAME

    LXP_REGISTRATION_EMAIL_TEST_RECIPIENT

Confirm current runtime validation semantics rather than replacing them.

Requirements:

- no credential logging
- bounded timeout
- no infinite retry
- no real email delivery in unit tests
- provider readiness is explicit
- public runtime config advertises `email` only when the selected provider is
  actually usable

──────────────────────────────────────────────────────────────────────
6. VERIFICATION CHALLENGE PERSISTENCE
   ──────────────────────────────────────────────────────────────────────

Implement or restore the verification challenge entity and migration.

Expected semantics include:

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

Adapt exact columns/types/naming to repository conventions.

Security requirements:

- never persist raw verification code
- never persist raw completion token
- avoid durable plaintext email where unnecessary
- normalized destination
- destination hashing through an existing compatible protection mechanism
- suitable protection for short numeric codes
- cryptographically secure code generation
- cryptographically secure opaque completion token

Migration MUST include a correct down() rollback.

Remember:
TypeORM synchronize is disabled; migrations are mandatory.

──────────────────────────────────────────────────────────────────────
7. SECURITY BEHAVIOR
   ──────────────────────────────────────────────────────────────────────

Verify and implement the PR21 defaults unless the current architecture has a
documented reason to differ:

- 6-digit CSPRNG verification code
- challenge expiry around 10 minutes
- maximum verification attempts
- resend cooldown around 60 seconds
- bounded resend count
- completion token expiry around 15 minutes
- resend invalidates previous code
- verified code cannot be reused
- consumed completion proof cannot be reused

Implement anti-enumeration:

Before proof of possession, public responses must not reveal whether:

- a User already exists
- a TenantMembership already exists
- the email belongs to an existing account

Avoid materially different public behavior/timing where practical.

──────────────────────────────────────────────────────────────────────
8. PUBLIC API CONTRACT
   ──────────────────────────────────────────────────────────────────────

Verify and implement the currently documented public flow:

    POST /api/v1/public/registration/email/challenges

    POST /api/v1/public/registration/email/challenges/:challengeId/verify

    POST /api/v1/public/registration/email/challenges/:challengeId/resend

The repository documentation currently describes these routes as exposed.

Do not leave documentation claiming an endpoint exists when no handler exists.

Conversely, do not remove the documented contract simply to avoid completing
the feature if PR21 still intends to deliver email verification.

Use DTO validation consistent with existing NestJS conventions.

──────────────────────────────────────────────────────────────────────
9. RATE LIMITING / ABUSE PROTECTION
   ──────────────────────────────────────────────────────────────────────

Audit existing Redis/rate-limit infrastructure before introducing anything new.

The verification flow must be bounded across appropriate dimensions such as:

- IP
- tenant
- destination hash
- challenge
- resend
- verify attempts

Reuse existing infrastructure where possible.

Do not introduce a large generic notification/rate-limit framework merely for
this PR.

Do not log:

- raw email
- raw code
- raw completion token
- SMTP password
- MailerSend API key

──────────────────────────────────────────────────────────────────────
10. ADMIN READINESS / TEST EMAIL
    ──────────────────────────────────────────────────────────────────────

Preserve the existing super-admin registration email readiness functionality.

Verify:

    GET /api/v1/admin/tenants/:tenantId/registration/email/readiness

and:

    POST /api/v1/admin/tenants/:tenantId/registration/email/test

Requirements:

- super-admin protected
- selected provider displayed
- ready/not_ready/disabled state is accurate
- sender address may be displayed if non-secret
- test recipient is controlled by configuration
- endpoint must not become an arbitrary mail relay
- test sending must be bounded

The existing tenant panel should continue to show useful readiness warnings.

Do not redesign unrelated admin UI.

──────────────────────────────────────────────────────────────────────
11. CURRENT CI FAILURE
    ──────────────────────────────────────────────────────────────────────

The current remote PR has:

    Frontend Build: PASS
    Backend Build: FAIL

The backend workflow currently reports failure from:

    @lxp/provider-xai#test

Reproduce this failure locally.

Classify it before changing anything:

CASE A — caused by PR21:
Fix the minimal regression required for PR21.

CASE B — pre-existing, flaky, environmental, or unrelated to PR21:
DO NOT fix it in this branch.
Document:
- failing command/test
- reproduction result
- why it is unrelated
- suggested separate bug-fix branch/PR

Do not use an unrelated CI failure as permission to expand PR21.

──────────────────────────────────────────────────────────────────────
12. BUGS DISCOVERED DURING AUDIT
    ──────────────────────────────────────────────────────────────────────

Patrick has already noticed additional bugs that will be handled separately.

Therefore:

If you discover a bug outside PR21's registration-email-verification scope:

DO NOT FIX IT.

Instead create a final section:

    Deferred bugs / separate PR candidates

For each bug provide:

- short title
- observed behavior
- reproduction steps if known
- affected files/components
- severity
- whether it blocks PR21
- suggested branch name
- suggested acceptance criteria

Only fix an out-of-scope bug if it is objectively impossible to complete or
validate PR21 without doing so. In that case, stop and explain the dependency
before modifying it.

──────────────────────────────────────────────────────────────────────
13. TESTS REQUIRED
    ──────────────────────────────────────────────────────────────────────

At minimum, cover the cases defined in to-do.md.

Challenge lifecycle:

- valid/normalized email
- unresolved tenant
- global registration disabled
- tenant registration disabled
- selected provider not ready
- correct code
- incorrect code
- expired code
- already verified
- code invalidated by resend
- maximum attempts
- resend before cooldown
- resend after cooldown
- maximum resends
- completion token returned once
- only digests persisted
- completion proof consumed once
- concurrent verification behavior

Delivery providers:

- SMTP disabled
- SMTP incomplete configuration
- SMTP TLS/secure behavior
- MailerSend complete configuration
- MailerSend incomplete configuration
- selected-provider readiness
- timeout
- success
- delivery failure
- no password/API-key leakage
- text and HTML templates
- no real delivery in unit tests

Privacy / abuse:

- IP/destination/tenant/challenge limits
- Redis TTL where applicable
- no code/token/email leakage in logs
- public runtime config contains no secret
- no account enumeration

Admin web:

- ready state
- provider not ready state
- global/tenant registration state where relevant
- existing tenant registration functionality remains intact

──────────────────────────────────────────────────────────────────────
14. VALIDATION
    ──────────────────────────────────────────────────────────────────────

Use the repository's actual scripts after confirming them.

Run the narrowest useful tests during implementation, then the complete
required validation before declaring PR21 finished.

At minimum confirm the equivalent of:

    pnpm lint
    pnpm test
    pnpm build

plus any package-specific commands required by the repository.

Run/admin migration validation against the existing migration mechanism.

If full validation cannot pass because of an unrelated pre-existing failure,
report it explicitly and provide evidence. Do not claim the PR is green.

──────────────────────────────────────────────────────────────────────
15. DOCUMENTATION
    ──────────────────────────────────────────────────────────────────────

After implementation, reconcile documentation against actual behavior.

Especially audit:

- to-do.md
- docs/api/gateway-contract.md
- docs/SCOPE.md
- docs/architecture/auth-flow.md
- docs/architecture/overview.md
- docs/product/system-scope.md
- docs/setup/quickstart.md
- docs/setup/vps.md
- env examples
- VPS compose wiring
- Linux VPS env generator
- PowerShell VPS env generator

Documentation must not describe planned behavior as implemented unless it
actually exists.

Do not rewrite unrelated docs.

──────────────────────────────────────────────────────────────────────
16. OUT OF SCOPE — STRICT
    ──────────────────────────────────────────────────────────────────────

Do NOT implement in this PR:

- final account creation
- user self-registration completion
- SMS provider
- password reset
- invitations
- PGS
- /evaluations endpoint
- evaluation:invoke scope
- general inference refactor
- provider architecture redesign
- unrelated xAI bug fixes
- unrelated UI bugs
- dependency upgrades not required by PR21
- broad code cleanup

Those belong in separate PRs.

──────────────────────────────────────────────────────────────────────
17. DEFINITION OF DONE
    ──────────────────────────────────────────────────────────────────────

PR21 is complete when:

- a public client can request an email verification challenge
- the code is delivered through SMTP or MailerSend
- the code can be securely verified
- resend/expiry/attempt protections work
- a short-lived one-time completion token is returned
- no account/user/membership is created
- raw codes/tokens are not persisted or logged
- anti-enumeration behavior is preserved
- abuse controls are present
- provider readiness is exposed correctly
- admin readiness/test-email works
- required TypeORM migration exists and works
- env/VPS/scripts are coherent
- docs match reality
- relevant tests pass
- unrelated bugs remain outside this PR

──────────────────────────────────────────────────────────────────────
18. FINAL REPORT
    ──────────────────────────────────────────────────────────────────────

When done, STOP and report:

1. Initial audit findings.
2. What was already correct.
3. What was missing.
4. Functional changes made.
5. Security decisions.
6. Files created/modified/deleted.
7. Migration details and rollback behavior.
8. API contracts implemented.
9. Exact test/build/lint commands executed and results.
10. Manual validation performed.
11. Remaining risks.
12. Deferred bugs / separate PR candidates.
13. Suggested branches for those bugs.
14. Proposed PR title.
15. Complete updated PR description.
16. Review checklist.
17. Explicit statement:

    "I did not start the next PR."

Do not create another branch and do not begin another feature without Patrick's
explicit instruction.

== IMPORTANT ==

Oui — **tu as raison**. 😅 Là, Codex est en train d’interpréter le delta Git comme *« ceci ne semble pas appartenir à PR21, donc retirons-le »*, alors que **Ollama Cloud Catalog est déjà une feature intentionnelle et implémentée**. Il ne faut absolument pas la rollbacker juste pour rendre le diff de PR21 plus « pur ».

Je lui répondrais immédiatement ceci :

> **Correction concernant le delta Ollama**
>
> Do **not** remove or revert the existing Ollama Cloud Catalog implementation.
>
> `fix/ollama-cloud-catalog-access` is **not required**. This functionality is already intentionally implemented in the repository and must remain intact.
>
> The presence of Ollama-related changes in the current branch does not mean they should be removed merely because they are outside the conceptual scope of PR21. This branch contains valid existing work that must be preserved.
>
> Treat the current repository state as intentional unless there is concrete evidence of a regression.
>
> Specifically:
>
> * preserve the Ollama Cloud Catalog implementation;
> * preserve its existing tests;
> * do not move it to another branch;
> * do not revert it to make the PR diff smaller;
> * do not classify already-implemented intentional functionality as a deferred bug;
> * only touch Ollama code if PR21 directly breaks it or an existing test exposes a real regression.
>
> Also leave these untouched:
>
> * `.pnpm-store/`
> * `docker-compose.setup-watch.yml`
> * the existing user modification to `docs/refactor-doc.md`
>
> These are **not cleanup targets for PR21**.
>
> Continue the PR21 audit and focus only on determining what remains necessary to complete **registration email verification**.

Et je corrigerais aussi une règle de mon gros prompt précédent, parce qu’on vient de découvrir une subtilité importante :

### ❌ Ancienne règle trop agressive

> inspect the diff and determine whether any change is unrelated to registration email verification

Ça peut inciter Codex à faire exactement ce qu’il vient de proposer : **nettoyer des travaux valides simplement parce qu’ils ne correspondent pas au nom de la branche.**

Je la remplacerais par :

> Inspect the branch history and diff to understand context, **not to purge unrelated pre-existing work**.
>
> Some functionality visible in the branch may be intentional work completed before or alongside PR21.
>
> Do not revert, relocate, or remove existing functionality solely because it is unrelated to email verification.
>
> Only modify existing unrelated functionality when:
>
> 1. PR21 introduced a regression in it, or
> 2. it objectively prevents PR21 from building or operating correctly.
>
> Otherwise, preserve it exactly as-is.

Ça, c’est beaucoup plus sûr.

Et j’ajouterais carrément une règle générale en haut :

> **IMPORTANT — This is a completion audit, not a branch cleanup exercise.**
>
> Preserve intentional existing functionality. The goal is to identify and complete the missing PR21 behavior, not to reconstruct an artificially minimal branch.

Parce que oui : **on veut retrouver le fil de PR21, pas passer le dimanche à faire de l’archéologie Git et à désimplémenter ce que nous avions déjà terminé.** 😭😂

Donc : **Ollama reste. On poursuit l’audit.** 🫡💻❤️

