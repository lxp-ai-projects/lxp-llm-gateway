## Suivi Chat Lab: capacites declarees par les catalogues

- `ModelCapability.reasoning` distingue une declaration positive, une
  declaration negative et l'absence de donnee.
- Anthropic lit `capabilities.thinking` et ses types `adaptive` / `enabled`
  depuis `GET /v1/models`.
- NanoGPT utilise `GET /api/v1/models?detailed=true` et
  `capabilities.reasoning`.
- OpenRouter conserve `supported_parameters` et l'objet `reasoning` par modele.
- Ollama complete `GET /api/tags` par `POST /api/show`; un echec de detail
  laisse la capacite inconnue sans faire echouer tout le catalogue.
- Chat Lab ne presente plus Claude ou OpenAI via un agregateur comme un modele
  GLM. Les controles et messages proviennent du modele selectionne.
- Un modele OpenRouter dont le reasoning est obligatoire n'affiche aucun toggle
  et utilise le defaut du provider. Le transport `reasoning` generique reste
  utilisable lorsque le catalogue le declare mais que la famille est inconnue.
- Le catalogue OpenAI natif ne publie actuellement que les informations de base
  du modele. Chat Lab affiche donc `non declare` au lieu d'inventer le support
  d'un alias ou d'une future version.

ADR-015 documente les sources officielles et la priorite entre capacite native,
capacite effective de route agregee et etat inconnu.

Contexte : monorepo "lxp-llm-gateway" (NestJS + adaptateurs provider dans
packages/provider-\*, contrats partagés dans packages/contracts, logique de
domaine dans packages/domain).

Problème identifié : la capacité "reasoning/thinking" est aujourd'hui modélisée
comme si elle appartenait au provider de TRANSPORT (nanogpt, openrouter, zai,
anthropic...) plutôt qu'à la FAMILLE DE MODÈLE sous-jacente. Concrètement :

- packages/domain/src/index.ts : ReasoningModelFamily ne contient que
  'zai-glm'. detectReasoningModelFamily() et supportsThinkingModelFamily()
  ne reconnaissent que les modèles GLM, peu importe le provider qui les sert.
- packages/contracts/src/index.ts : GatewayChatProviderOptions namespace les
  options de reasoning par provider littéral (anthropic.extendedThinking,
  zai.thinking, openrouter.reasoning, ollama.thinking) plutôt que par famille
  de modèle. Résultat : un appelant qui route un modèle Claude via
  providerId='nanogpt' ou 'openrouter' n'a aucun moyen structurel de demander
  l'extended thinking d'Anthropic, même si le modèle sous-jacent le supporte
  et que l'agrégateur le transmettrait fidèlement.
- packages/provider-nanogpt/src/index.ts et packages/provider-openrouter/src/
  index.ts ne lisent que providerOptions?.zai?.thinking (ou .openrouter.
  reasoning) dans dispatchChatRequest — jamais providerOptions?.anthropic.
  extendedThinking, même quand request.model correspond clairement à un
  modèle Claude servi par l'agrégateur.
- Le comptage de tokens précis (packages/provider-anthropic countTextTokens
  via /v1/messages/count_tokens) et l'extraction d'erreurs structurées
  (request_id, message Anthropic) n'ont pas d'équivalent dans les adaptateurs
  agrégateurs — perte de fidélité silencieuse, pas seulement de fonctionnalité.

Objectif : généraliser le pattern déjà existant pour zai-glm à toutes les
familles de modèles pertinentes (au minimum : Claude via Anthropic, GPT/o-series
via OpenAI, Grok via xAI — étendre au fur et à mesure que d'autres agrégateurs
le justifient), sans casser les appels natifs existants.

Découpe le travail en PRs séparées et testées :

PR 1 — Détection de famille de modèle par ID, indépendante du provider
Dans packages/domain/src/index.ts, étendre ReasoningModelFamily au-delà de
'zai-glm' (ex. 'anthropic-claude', 'openai-reasoning', 'xai-grok') avec un
pattern de détection par modelId pour chaque famille, sur le modèle exact de
GLM_THINKING_MODEL_PATTERN / isGlmThinkingModel. Documenter clairement que
cette détection est indépendante du providerId — un modèle "anthropic/
claude-opus-4" doit être détecté comme famille anthropic-claude qu'il soit
appelé via providerId='anthropic', 'nanogpt', ou 'openrouter'.
Ajouter des tests unitaires par famille et par convention de nommage de
modèle (les agrégateurs préfixent différemment : "anthropic/claude-...",
"claude-...", etc. — couvrir les variantes réellement observées dans les
catalogues nanogpt/openrouter actuels).

PR 2 — Étendre supportsThinkingModelFamily et la table de compatibilité
Généraliser la logique provider x modèle actuellement câblée en dur pour
zai-glm, avec une table explicite {family: {providers autorisés à relayer
cette famille + mapping du champ de requête attendu}}. Ne pas supposer que
toutes les combinaisons provider x family fonctionnent identiquement —
vérifier au cas par cas si l'agrégateur transmet réellement le paramètre
natif ou le drop silencieusement (à valider par test d'intégration contre
un vrai appel, pas seulement en unitaire).

PR 3 — Mapper providerOptions par famille plutôt que par provider littéral
dans les adaptateurs agrégateurs
Dans packages/provider-nanogpt/src/index.ts et packages/provider-openrouter/
src/index.ts (méthode dispatchChatRequest), ajouter la lecture de
providerOptions?.anthropic?.extendedThinking (et équivalents OpenAI/xAI)
quand supportsThinkingModelFamily() confirme que le modèle demandé appartient
à cette famille, avec le mapping vers le champ que l'agrégateur attend
réellement (vérifier la doc NanoGPT/OpenRouter pour le nom exact du champ
côté agrégateur — ce n'est probablement pas le même nom que côté Anthropic
natif). Garder la compatibilité ascendante : si providerOptions.zai.thinking
est fourni pour un modèle GLM, le comportement actuel ne doit pas changer.

PR 4 — Combler l'écart de fidélité restant qui ne peut pas être comblé par
un simple mapping de paramètre
Pour le comptage de tokens (countTextTokens) : soit émuler un calcul
approximatif documenté comme approximatif quand le modèle est servi par un
agrégateur, soit exposer explicitement dans la réponse (providerMetadata ou
un champ dédié) que le compte est absent/estimé plutôt que de laisser
l'appelant croire à une précision qu'il n'a pas.
Pour les erreurs structurées : si l'agrégateur relaie le payload d'erreur
natif du provider sous-jacent (à vérifier au cas par cas), extraire et
remonter ces champs plutôt que de se contenter du texte brut de la réponse.

Pour chaque PR : tests unitaires par famille de modèle et par provider,
au moins un test qui échoue si un champ providerOptions destiné à une famille
non supportée par le provider choisi est silencieusement ignoré plutôt que
signalé (fail loud, pas fail silent — cohérent avec la philosophie fail-closed
du reste de l'écosystème LXP). Mettre à jour la doc du provider-sdk si le
contrat LlmProviderAdapter évolue.

Ne pas toucher aux adaptateurs natifs (provider-anthropic, provider-openai,
provider-xai) sauf si un changement de contrat partagé l'exige — ils sont déjà
au niveau de référence.

## Décisions et état d'implémentation

- La détection est indépendante du transport pour `anthropic-claude`,
  `openai-reasoning`, `xai-grok` et `zai-glm`.
- La compatibilité est une table explicite dans `domain`; l'absence d'une entrée
  signifie refus, jamais suppression silencieuse.
- OpenRouter reçoit `reasoning`. NanoGPT reçoit `reasoning.effort` pour les
  familles documentées et conserve le payload GLM `thinking` historique.
- Un budget Claude exact est relayé par OpenRouter mais refusé par NanoGPT Chat
  Completions, qui ne documente pas d'équivalent exact.
- Le comptage pré-exécution des agrégateurs est marqué `unavailable`; les tokens
  retournés après exécution restent identifiés comme rapportés par le provider.
- Les erreurs extraient les identifiants, codes, types et provider amont
  disponibles, puis les propagent dans l'enveloppe 502 normalisée.

Les documentations officielles sont citées dans ADR-014. Aucun appel payant n'a
été exécuté: `NANOGPT_API_KEY` et `OPENROUTER_API_KEY` étaient absentes. La
validation réelle demeure requise avant d'élargir la matrice.
