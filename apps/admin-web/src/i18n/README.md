# Frontend localization

The admin UI uses `i18next` and `react-i18next`. English (`en`) is canonical; French (`fr`), Spanish (`es`), and German (`de`) must contain the same resource keys.

Shared translations live under `resources/`; feature-domain catalogs live under `generated/` and are committed static JSON resources. Add semantic keys to all four files for the relevant domain. Components use `useTranslation`; technical identifiers such as provider names, model IDs, tenant IDs, and protocol names remain unchanged. The completeness test fails when locale key sets diverge.

The initial locale comes from `lxp.locale`, then a supported browser language, then English. `LanguageSelector` changes and persists the locale without reloading and keeps the document `lang` attribute synchronized. To add a language, extend `supportedLocales`, its metadata, resources, and the completeness test inputs.
