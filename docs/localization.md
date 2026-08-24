Implement complete frontend localization for **lxp-llm-gateway** using **i18next** and **react-i18next**.

This PR must be focused on localization only. Do not include PGS changes or unrelated refactoring unless required to safely introduce localization.

## Goal

Localize the complete LLM Gateway user interface in:

- English (`en`)
- French (`fr`)
- Spanish (`es`)
- German (`de`)

The localization must cover **all user-facing frontend screens and states**, including authenticated and unauthenticated experiences.

English should be treated as the canonical/source locale.

---

# 1. Audit the existing frontend first

Before implementing translations, inspect the complete frontend and identify every user-facing string.

Audit at minimum:

- Login
- Authentication states
- Main navigation / side menu
- Header / top navigation
- Overview
- Provider Tokens
- Profile
- Chat Lab
- Image Lab
- Video Lab
- Tenant-related UI
- Provider configuration
- Model configuration
- Forms
- Modals
- Confirmation dialogs
- Empty states
- Loading states
- Error states
- Success notifications
- Toasts
- Tooltips
- Buttons
- Table headers
- Pagination
- Filters
- Search placeholders
- Select/dropdown labels and options
- Validation messages
- Security-related messages
- Logout
- 401 / 403 / unavailable states
- Any admin-only or super-admin surfaces
- Any remaining secondary routes or components reachable through the UI

Search the codebase for hardcoded user-facing strings and migrate them to translation resources.

Do not assume that visible screens in the main navigation are the complete surface.

---

# 2. i18next foundation

Use:

- `i18next`
- `react-i18next`

Create a centralized i18n initialization layer.

Suggested structure:

```text
src/
  i18n/
    index.ts
    locales/
      en/
        common.json
        auth.json
        navigation.json
        profile.json
        providers.json
        chat.json
        image.json
        video.json
        errors.json
      fr/
        ...
      es/
        ...
      de/
        ...
```

The exact namespace split may be adjusted to match the application architecture, but avoid:

- one enormous translation file;
- one translation file per React component;
- duplicated translation keys;
- arbitrary keys such as `text1`, `label2`, etc.

Prefer semantic keys such as:

```text
navigation.chatLab
auth.login.title
providers.tokens.emptyState
profile.language.label
common.actions.save
errors.network.unavailable
```

---

# 3. Supported locales

Define supported locales centrally.

Example conceptual model:

```ts
type SupportedLocale = 'en' | 'fr' | 'es' | 'de';
```

Maintain metadata such as:

```ts
{
  en: { label: 'English' },
  fr: { label: 'Français' },
  es: { label: 'Español' },
  de: { label: 'Deutsch' }
}
```

Do not duplicate locale definitions across components.

---

# 4. Language resolution

Resolve the initial locale in this order:

1. previously selected language stored locally;
2. browser language when supported;
3. English fallback.

Examples:

```text
fr-CA -> fr
fr-FR -> fr
en-CA -> en
de-DE -> de
es-MX -> es
```

Unsupported browser locales must fall back to English.

Default/fallback locale:

```text
en
```

---

# 5. Persist the language selection

Persist the user's selected locale in browser storage.

A reasonable key would be:

```text
lxp.locale
```

The implementation must:

- update i18next immediately;
- persist the locale;
- apply it without a page reload;
- restore it on the next application load;
- preserve it through logout/login.

Do not require authentication to remember language selection.

Do not introduce backend persistence of the user's locale in this PR unless such functionality already exists.

---

# 6. Language selector

Create a reusable `LanguageSelector` component.

It must be usable in both authenticated and unauthenticated layouts.

## Login screen

Place the selector in the **top-right area** of the login screen.

It must be available before authentication so users can understand the login experience in their language.

Use a compact dropdown/select.

Example display values:

```text
English
Français
Español
Deutsch
```

Avoid flags as the primary language identifier because languages do not map cleanly to countries.

---

## Authenticated application

Place the same selector in the **side menu**, preferably in the lower utility/profile area where it remains accessible without competing with primary navigation.

Example:

```text
Language
[ Français  ▾ ]
```

The selector must use the same state and component implementation as the login version.

Do not maintain separate language-selection logic for login and authenticated layouts.

---

# 7. No hardcoded user-facing strings

After migration, React components should not contain ordinary hardcoded UI strings.

Instead of:

```tsx
<Button>Save</Button>
```

use:

```tsx
<Button>{t('common:actions.save')}</Button>
```

This applies to:

- visible labels;
- accessibility labels;
- placeholders;
- titles;
- tooltips;
- notifications;
- modal content;
- validation feedback;
- empty states;
- loading text;
- confirmation messages.

Technical constants that are not user-facing do not need localization.

Provider names, model IDs, tenant IDs, API identifiers and other proper technical identifiers must not be translated.

---

# 8. Avoid translating provider/model terminology incorrectly

Do not translate product or protocol names such as:

- OpenAI
- Mistral
- Anthropic
- Grok
- NanoGPT
- OpenRouter
- OAuth
- OIDC
- JWT
- API
- HTTP
- model IDs
- provider IDs
- tenant IDs

Translate the surrounding UI, not technical identifiers themselves.

For example:

English:

```text
Selected provider: NanoGPT
```

French:

```text
Fournisseur sélectionné : NanoGPT
```

---

# 9. Dynamic values

Never build translated sentences through string concatenation.

Bad:

```ts
t('selectedProvider') + ': ' + provider.name;
```

Prefer:

```json
{
  "selectedProvider": "Selected provider: {{provider}}"
}
```

and:

```ts
t('selectedProvider', { provider: provider.name });
```

Equivalent translations must preserve natural grammar in each language.

---

# 10. Pluralization

Use i18next pluralization rather than manual conditions whenever text depends on a count.

Examples:

```text
1 model
2 models

1 provider
4 providers

1 token
5 tokens
```

Ensure plural forms work correctly for all four supported languages.

---

# 11. Date, time and number formatting

Do not localize only the text while keeping English-specific formatting.

Where the frontend displays dates, times or numbers, use locale-aware formatting.

Prefer browser-native `Intl` APIs or a centralized formatter.

Examples:

```ts
Intl.DateTimeFormat(locale);
Intl.NumberFormat(locale);
```

Avoid hardcoded formats such as:

```text
MM/DD/YYYY
```

unless technically required by an API field.

User-facing dates should follow the selected locale.

---

# 12. Backend/API errors

Do not expose raw backend error messages as the primary localized UX when a known application error can be mapped to a translation key.

Create a clean separation between:

```text
machine-readable error code
        ↓
frontend error mapping
        ↓
localized message
```

Example:

```text
PROVIDER_CREDENTIAL_CONFLICT
```

could resolve to:

```text
errors.providers.credentialConflict
```

Do not attempt to translate arbitrary unknown backend text.

For unknown errors:

- log/preserve technical details where appropriate;
- show a localized generic fallback to the user.

Example:

```text
Something went wrong. Please try again.
```

with corresponding French, Spanish and German translations.

---

# 13. Authentication and authorization states

Explicitly localize and preserve the semantic distinction between:

- authentication required / `401`;
- permission denied / `403`;
- API/network unavailable;
- server failure;
- session expired.

Do not collapse these into a generic "application unavailable" message.

Make sure logout, expired-session and login-redirect UX are localized.

---

# 14. Accessibility

Localization must also cover user-facing accessibility text:

```text
aria-label
title
alt
```

where applicable.

Changing language must update relevant accessibility labels immediately.

Set the document language dynamically:

```html
<html lang="fr"></html>
```

Update `document.documentElement.lang` whenever the selected locale changes.

---

# 15. Layout resilience

German and French strings are often longer than English strings.

Verify that translated content does not break:

- navigation;
- buttons;
- cards;
- tables;
- badges;
- selectors;
- mobile views;
- modals.

Do not solve localization overflow by arbitrarily truncating important labels.

Use responsive layout adjustments where necessary.

---

# 16. Translation quality

Translations must be natural UI language rather than literal word-for-word translations.

Tone should remain consistent with the current LLM Gateway positioning:

- professional;
- concise;
- technical where appropriate;
- clear;
- enterprise-oriented without sounding bureaucratic.

Avoid machine-translated phrasing that sounds unnatural.

Terminology must remain consistent across screens.

Create a small terminology convention where useful.

For example, decide consistently how the following concepts are translated:

```text
Provider
Tenant
Token
Credential
Workspace
Profile
Model
Gateway
```

Some technical terms may intentionally remain in English when that produces the clearest developer-oriented UX.

---

# 17. Testing

Add tests for the localization infrastructure.

At minimum test:

## Locale resolution

- saved locale is restored;
- browser locale is detected;
- regional locales resolve correctly;
- unsupported locale falls back to English.

### Language switching

Verify switching:

```text
en -> fr
fr -> es
es -> de
de -> en
```

updates visible UI without reload.

### Persistence

Verify the selected language survives application initialization.

### LanguageSelector

Test:

- all four options appear;
- current language is selected;
- selecting another language updates i18next;
- persistence is updated.

### Core screens

Add representative tests confirming translation keys are correctly rendered in major layouts/screens.

Do not duplicate exhaustive UI tests four times unless necessary.

---

# 18. Translation completeness guard

Add a mechanism or test capable of detecting missing translation keys between locales.

English is the canonical locale.

All keys present in English must exist in:

```text
fr
es
de
```

The quality gate should fail when a required translation key is missing.

Do not silently rely on English fallback to hide incomplete translation resources during CI.

Runtime fallback to English is still required as a resilience mechanism.

---

# 19. Development experience

Keep translation usage straightforward for future contributors.

Document briefly:

- where translations live;
- how to add a new translation key;
- supported locales;
- which locale is canonical;
- how locale detection works;
- how to add another language later.

Avoid excessive i18n abstraction that makes ordinary React development cumbersome.

---

# 20. Cleanup

After migration:

Search again for remaining hardcoded user-facing strings.

Review:

```text
.ts
.tsx
```

files systematically.

Do not blindly extract:

- technical constants;
- test fixture values;
- provider/model names;
- IDs;
- log messages intended solely for developers.

The goal is localization of the **user experience**, not every string literal in the repository.

---

# 21. UX acceptance criteria

The PR is complete when:

- the entire accessible LLM Gateway UI is available in English;
- the entire accessible LLM Gateway UI is available in French;
- the entire accessible LLM Gateway UI is available in Spanish;
- the entire accessible LLM Gateway UI is available in German;
- the login page exposes the language selector in the upper-right area;
- the authenticated application exposes the language selector in the side menu;
- switching languages does not reload the page;
- the choice persists locally;
- browser locale is used for first-time visitors when supported;
- English is used as fallback;
- `document.documentElement.lang` follows the active locale;
- layouts remain usable with longer translations;
- known errors are localized;
- 401, 403, network and server failures remain semantically distinct;
- no meaningful user-facing hardcoded English strings remain;
- translation completeness is covered by automated validation;
- existing functionality and authorization behavior remain unchanged.

---

# 22. Quality gates

Before declaring the PR complete, run the repository's relevant quality gates, including at minimum:

```text
lint
typecheck
unit tests
frontend tests
build
```

Use the repository's actual existing commands rather than inventing new ones.

Fix regressions introduced by the localization work.

Do not weaken tests, linting, TypeScript strictness, or existing security behavior to make the PR pass.

---

# Deliverables

At completion, report:

1. localization architecture introduced;
2. namespaces/resources created;
3. screens audited and migrated;
4. language selector locations;
5. locale detection/persistence strategy;
6. handling of API/backend errors;
7. tests added;
8. translation-completeness mechanism;
9. quality gates executed and their results;
10. any remaining user-facing string that could not safely be localized, with justification.

Do not claim the application is fully localized until the complete reachable UI has been audited.
