Laurie Codex, nouveau point QA sur la branche `feature/easy-setup`.

Le déploiement VPS fonctionne maintenant :

```text
https://llm-gateway-admin.laurie-x-patrick.dev
  -> admin-web + admin-api

https://llm-gateway.laurie-x-patrick.dev
  -> gateway-api
```

État validé :

```text
Docker compose VPS démarre ✅
Postgres/Redis healthy ✅
Migrations OK ✅
admin-api health OK ✅
gateway-api health OK ✅
admin-web accessible via HTTPS ✅
login admin OK ✅
cookie-only session OK ✅
provider credential peut être créé ✅
```

Mais deux problèmes produit restent visibles.

---

## 1. Provider credential existant retourne 409, mais l’UI ne permet pas de le gérer

Cas observé :

Dans l’admin UI :

```text
https://llm-gateway-admin.laurie-x-patrick.dev/app/providers
```

J’ai ajouté un credential NanoGPT avec label `primary`.

Après sauvegarde, il apparaît dans la table :

```text
Provider: NanoGPT
Label: primary
Masked value: ***7907
Status: Active
Action: Edit
```

Problème : si je tente d’ajouter/sauvegarder à nouveau le même provider/label, l’API retourne un `409 Conflict`.

Le 409 est acceptable côté backend si une contrainte unique existe, mais l’UX est incomplète :

* aucun bouton delete;
* aucun bouton replace clair;
* le bouton Edit ne semble pas suffire pour gérer proprement le remplacement;
* impossible de repartir clean depuis l’UI;
* l’utilisateur doit aller supprimer directement dans Postgres (`user_provider_credentials`), ce qui n’est pas acceptable pour une beta.

### Correction demandée

Ajouter une gestion complète des credentials existants :

Minimum beta acceptable :

```text
- afficher les credentials existants;
- bouton Edit fonctionnel;
- bouton Delete credential;
- confirmation avant suppression;
- après delete, refresh de la liste;
- si POST retourne 409, afficher un message utile.
```

Message UX souhaité pour 409 :

```text
A credential already exists for this provider/label. Use Edit to update it, or delete the existing credential first.
```

Encore mieux :

```text
Credential already exists. Replace existing credential?
[Cancel] [Replace credential]
```

### Acceptance criteria

```text
Given a NanoGPT credential already exists
When I try to save another NanoGPT primary credential
Then the UI does not fail silently
And it explains the conflict
And I can update, replace, or delete the existing credential from the UI
```

---

## 2. Documenter et corriger le split admin domain vs gateway domain

Cas VPS réel :

```text
llm-gateway-admin.laurie-x-patrick.dev
  = admin-web + admin-api
  = human control plane
  = cookie-only browser auth

llm-gateway.laurie-x-patrick.dev
  = gateway-api
  = public gateway endpoint
  = external clients such as Open WebUI
  = API key / bearer / OpenAI-compatible auth
```

Problème observé pendant le test :

L’admin UI est connectée sur :

```text
https://llm-gateway-admin.laurie-x-patrick.dev
```

Mais certains appels partaient vers :

```text
https://llm-gateway.laurie-x-patrick.dev/api/v1/models?providerId=nanogpt
https://llm-gateway.laurie-x-patrick.dev/api/v1/images/catalog
```

Ces appels retournaient :

```json
{
  "message": "Access token is required.",
  "error": "Unauthorized",
  "statusCode": 401
}
```

ou apparaissaient dans DevTools comme :

```text
401 Unauthorized (from service worker)
```

Ce comportement est logique mais incorrect pour le control plane :

* l’admin session cookie appartient au domaine `llm-gateway-admin.*`;
* le domaine `llm-gateway.*` est séparé;
* le gateway public ne doit pas supposer une session admin cookie;
* le gateway public attend une auth adaptée aux clients externes;
* en local, tout marchait parce que tout était sur `localhost`, ce qui masquait le problème.

### Règle produit à appliquer

L’admin UI ne doit pas appeler directement le domaine public gateway pour des routes control-plane protégées.

Pour l’admin web, tous les appels protégés doivent être same-origin :

```text
/api/v1/...
```

Donc, depuis :

```text
https://llm-gateway-admin.laurie-x-patrick.dev
```

les appels doivent devenir :

```text
https://llm-gateway-admin.laurie-x-patrick.dev/api/v1/provider-credentials
https://llm-gateway-admin.laurie-x-patrick.dev/api/v1/provider-settings
https://llm-gateway-admin.laurie-x-patrick.dev/api/v1/models
https://llm-gateway-admin.laurie-x-patrick.dev/api/v1/images/catalog
https://llm-gateway-admin.laurie-x-patrick.dev/api/v1/runtime-config
```

Pas :

```text
https://llm-gateway.laurie-x-patrick.dev/api/v1/...
```

### Architecture attendue

```text
admin-web
  -> same-origin /api/v1
  -> admin-api
  -> DB / provider credentials / model discovery / internal service calls if needed
```

Séparément :

```text
Open WebUI / external client
  -> https://llm-gateway.laurie-x-patrick.dev/api/v1/openai
  -> gateway-api
  -> OpenAI-compatible auth / API key
```

### Config attendue

VPS env :

```env
LXP_VPS_ADMIN_WEB_ORIGIN=https://llm-gateway-admin.laurie-x-patrick.dev
LXP_VPS_ADMIN_API_PUBLIC_URL=https://llm-gateway-admin.laurie-x-patrick.dev
LXP_VPS_GATEWAY_API_PUBLIC_URL=https://llm-gateway.laurie-x-patrick.dev
```

Frontend admin should prefer:

```text
VITE_ADMIN_API_BASE_URL=/api/v1
```

The public gateway URL should not be used by admin-web for cookie-authenticated control-plane calls.

### Caddy shape currently validated

```text
llm-gateway-admin.laurie-x-patrick.dev
  /api/* -> admin-api:3002
  /*     -> admin-web:80

llm-gateway.laurie-x-patrick.dev
  /*     -> gateway-api:3001
```

This split is intentional and should be documented.

---

## 3. Service worker/cache note

During testing, DevTools showed some failed requests as:

```text
401 Unauthorized (from service worker)
```

This made debugging harder because stale frontend code could continue calling old URLs.

Please add either:

* a clear cache/versioning strategy for the admin-web PWA/service worker;
* or disable service worker registration for alpha/VPS admin builds;
* or document how to clear/unregister it during alpha testing.

For alpha, disabling the service worker may be preferable unless offline/PWA behavior is a real requirement.

---

## Desired final outcome

After fixes:

```text
Admin UI stays on llm-gateway-admin.* for all control-plane calls.
Gateway public domain stays reserved for OpenAI-compatible clients.
Provider credentials can be created, edited, deleted, and replaced from the UI.
A 409 conflict produces a useful message, not a dead end.
No protected browser control-plane route depends on gateway public auth.
```

This is not a Caddy bug anymore. The VPS infrastructure works. This is now an application-level auth/routing/UX alignment issue.

No new feature expansion beyond this. The goal is to make the beta path usable.
