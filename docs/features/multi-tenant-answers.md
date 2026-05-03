Merci Laurie, je valide tes recommandations avec quelques précisions.

1. UsageRecordEntity vs UsageEventEntity

Je préfère faire évoluer l’existant.

S’il existe déjà usage_events côté gateway, on ne crée pas une nouvelle table usage_records pour éviter deux sources de vérité.

On garde donc :
- table: usage_events
- entity: UsageEventEntity, sauf si un renommage interne est vraiment peu coûteux
- concept métier/documentation: usage ledger / usage records

UsageEventEntity doit devenir le ledger durable attendu.

On ajoute les colonnes manquantes progressivement :
- tenantId
- userId
- integrationClientId
- apiKeyId
- providerId/providerCode
- model
- capability
- credentialScopeUsed
- inputTokens
- outputTokens
- totalTokens
- imageCount
- estimatedCostUsd
- latencyMs
- status
- errorCode
- requestId
- createdAt

Important : même les requêtes bloquées par policy/quota doivent produire un usage event avec status BLOCKED_BY_POLICY ou BLOCKED_BY_QUOTA.

==

2. Fallback platform_default

Je valide ta recommandation.

Le fallback plateforme doit être désactivé par défaut en production.

Il doit être activable explicitement par tenant/provider seulement, idéalement par super admin.

Règle souhaitée :
- Dev/local seed: fallback plateforme permis si utile pour démo.
- Prod: fallback plateforme false par défaut.
- Pour utiliser une clé plateforme, deux conditions doivent être vraies :
  1. TenantPolicy.allowPlatformCredentials = true
  2. TenantProviderConfiguration.allowPlatformFallback = true

Ordre de résolution :
1. User BYOK si disponible et autorisé.
2. Tenant BYOK si disponible et autorisé.
3. Platform credential seulement si explicitement autorisé.
4. Sinon deny avec une erreur claire.

BYOK doit rester la préférence naturelle.

==

3. Sémantique des règles de modèle

Je valide :
- priority numérique : plus grand gagne.
- à égalité : deny gagne toujours sur allow.

Je veux aussi une règle claire de sécurité :
- default deny dans le modèle final.
- Pour ne pas briser l’existant pendant la migration, on peut seed des allow rules initiales pour les tenants/providers déjà fonctionnels.
- Mais à terme, un tenant ne devrait voir/utiliser que les modèles explicitement autorisés.

Algorithme souhaité :
1. Charger les règles du tenant pour provider + model + capability.
2. Trouver les règles applicables, incluant wildcard/pattern si supporté.
3. Trier par priority descending.
4. Si plusieurs règles ont la même priority gagnante, deny > allow.
5. Si aucune règle applicable : deny, sauf mode de compatibilité temporaire/migration.

Ça garde une posture enterprise propre.

==

4. Portée des limites Phase 5

Je valide ta recommandation : pour cette phase, on ne fait pas encore un vrai rate limiting robuste multi-instance.

On fait :
- enforcement DB/app simple pour budgets/quotas
- rate limit good enough documenté
- architecture prête à remplacer par Redis/global limiter plus tard

À prioriser en Phase 5 :
- monthlyBudgetUsd
- dailyRequestLimit
- monthlyRequestLimit
- monthlyTokenLimit
- imageRequestsPerMonth
- maxInputTokens
- maxOutputTokens
- allowPromptLogging
- allowResponseLogging
- retentionDays

Pour le rate limiting :
- on peut créer une abstraction TenantRateLimitService / QuotaEnforcer
- implémentation initiale simple
- future implémentation Redis/global possible sans changer les callers

Pas de sur-ingénierie maintenant.

==

5. API keys read scopes

Je valide aussi ta recommandation.

On garde usage:read prévu dans le modèle de scopes, mais on ne l’expose pas encore aux API keys d’intégration.

Pour l’instant :
- usage/analytics reste réservé aux surfaces admin/control plane.
- Les API keys d’intégration ne doivent pas lire l’usage du tenant tant qu’on n’a pas une politique d’accès claire.
- usage:read peut rester un scope réservé/futur.

Scopes MVP plus sûrs :
- chat:completion
- image:generate
- image:edit
- models:list

usage:read = reserved, not exposed yet.

==

6. Ordre de livraison réel

Je valide ton ordre recommandé :

Phase 1
Phase 2
Phase 6
puis Phase 3/4/5

Donc :
1. Phase 1 — fix credential uniqueness / BYOK safety.
2. Phase 2 — TenantProviderConfiguration.
3. Phase 6 — integration clients + tenant-scoped API keys/scopes alignment.
4. Phase 3 — Model access rules.
5. Phase 4 — Usage events/ledger enrichment.
6. Phase 5 — Policies/limits enforcement.

Pourquoi :
- Provider configuration donne la base de résolution tenant/provider.
- Integration clients + scopes donne rapidement de la valeur à OpenWebUI.
- Ensuite model access rules, usage ledger et policies deviennent plus naturels à brancher.

Précision : Phase 6 doit rester lightweight.
On veut tenant-binding + scopes + provider config awareness, pas une refonte complète de billing/analytics.

==

Implementation preference:

Keep each PR small and testable.

Avoid creating parallel concepts if an existing gateway concept can evolve cleanly.

The target posture is:
multi-tenant-aware -> multi-tenant-enforced

Every provider request should eventually pass through:

ActiveTenantContext
→ TenantProviderConfiguration
→ Integration/API key scope check if applicable
→ TenantModelAccessRule
→ TenantPolicy/Quota guard
→ CredentialResolver
→ ProviderAdapter
→ UsageEvent recording

But we should not implement the whole chain in one PR. (Tell me when we need to do another PR to keep things manageable.)
