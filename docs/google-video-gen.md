Contexte : monorepo "lxp-llm-gateway" (packages/provider-*). Le package
packages/provider-google/src contient aujourd'hui uniquement un module
image/ (Imagen/Nano Banana). Il faut y ajouter la génération vidéo, avec
deux modèles Google distincts : Veo 3.1 et Gemini Omni Flash.

Documentation officielle à utiliser comme source de vérité (vérifier chaque
paramètre contre ces pages avant de coder — ne rien assumer par analogie
avec un autre provider) :
- Vue d'ensemble : https://ai.google.dev/gemini-api/docs/video
- Veo 3.1 : https://ai.google.dev/gemini-api/docs/veo
- Gemini Omni Flash : https://ai.google.dev/gemini-api/docs/omni

IMPORTANT — ce sont deux API distinctes, pas deux variantes d'une même API :
- Veo 3.1 : `client.models.generateVideos()` / REST
  `POST /v1beta/models/{model}:predictLongRunning`, job asynchrone à poller
  via `operation.done`. Suit le même pattern que
  packages/provider-nanogpt/src/video (api-client + polling d'opération).
- Gemini Omni Flash : `client.interactions.create()` / REST
  `POST /v1beta/interactions`, réponse structurée en `steps[]`, édition
  conversationnelle multi-tours via `previous_interaction_id`, pas de
  polling d'opération au sens Veo. C'est un transport différent — ne pas
  réutiliser l'api-client de Veo en essayant de le faire coller de force.

PR 1 — Ajouter Veo 3.1 dans packages/provider-google
Créer packages/provider-google/src/video/ sur le même plan que
packages/provider-nanogpt/src/video/ (api-client.ts, catalog.ts,
generation-service.ts, request-mapper.ts, response-mapper.ts,
__fixtures__/*.json, tests).

Modèles à exposer (vérifier les IDs exacts contre la page Veo, ils
changent de statut au fil du temps — ex. actuellement) :
- veo-3.1-generate-preview
- veo-3.1-fast-generate-preview
- veo-3.1-lite-generate-preview
- veo-3.0-generate-001 / veo-3.0-fast-generate-001 (dépréciés — décider
  si on les expose quand même ou si on les omet du catalogue)
- veo-2.0-generate-001 (déprécié)

Paramètres à mapper fidèlement selon le tableau "Veo API parameters and
specifications" de la doc (il varie par variante de modèle — ne pas
supposer que toutes les variantes acceptent les mêmes valeurs) :
aspectRatio (16:9/9:16), durationSeconds (4/6/8, contraint par
résolution/extension/référence), resolution (720p/1080p/4k, 4k absent sur
Lite), personGeneration (valeurs différentes selon
text-to-video/image-to-video/référence, et selon la région — EU/UK/CH/
MENA ont des valeurs restreintes, voir section Limitations), image
(image-to-video), lastFrame (interpolation, nécessite image),
referenceImages (jusqu'à 3, Veo 3.1 uniquement), video (extension,
Veo 3.1/3.1 Fast uniquement, pas Lite, contraintes de durée/résolution/
ratio sur la vidéo source, fenêtre de 2 jours de rétention serveur).

Gérer explicitement : latence min 11s / max 6 min en heures de pointe ;
vidéos stockées 2 jours côté serveur puis supprimées ; l'extension réinitialise
ce délai de rétention ; audio natif toujours actif sauf Veo 2 (silencieux) ;
filigrane SynthID (informationnel, pas d'action de code requise).

PR 2 — Ajouter Gemini Omni Flash dans packages/provider-google
Créer un module séparé (ex. packages/provider-google/src/omni-video/ ou
interactions/ — choisir un nom qui ne laisse pas penser que c'est une
variante de video/) puisque le transport est différent.

Modèle : gemini-omni-flash-preview (actuellement en preview — vérifier
s'il faut le marquer comme tel dans le catalogue, cohérent avec la façon
dont provider-openrouter/provider-nanogpt marquent déjà les modèles
preview/stealth).

Fonctionnalités à couvrir, en vérifiant chacune contre la doc :
- Texte → vidéo, avec aspect_ratio (9:16/16:9 seulement — pas de contrôle
  de résolution/durée explicite documenté, contrairement à Veo)
- Image → vidéo, avec le paramètre `task` optionnel
  (text_to_video/image_to_video/reference_to_video/edit) — si omis, le
  modèle infère depuis le prompt
- Édition vidéo conversationnelle multi-tours via `previous_interaction_id`
  (nécessite `store` activé — voir Best Practices : `store=false` désactive
  l'édition en tours suivants)
- Édition d'une vidéo uploadée par l'utilisateur (Files API), avec la
  restriction régionale : non disponible en EEA/UK/CH pour les vidéos
  uploadées (l'édition de vidéos déjà générées par le modèle reste
  disponible partout — distinction importante à respecter dans le code,
  pas seulement documenter)
- Livraison par URI (`response_format.delivery: "uri"`) pour les vidéos
  de plus de 4MB, avec le polling d'état de fichier ACTIVE/FAILED — ce
  polling est différent du polling d'opération Veo, ne pas fusionner la
  logique
- Restriction : upload/édition d'images contenant des mineurs non supporté
  en EEA/CH/UK — restriction séparée de celle sur les vidéos, les deux
  doivent être respectées indépendamment
- Paramètres explicitement NON supportés à ne pas exposer dans le mapping :
  system instructions, temperature, top_p, stop sequences, negative
  prompts (les négatifs vont dans le prompt texte lui-même)

PR 3 — Vérifier et étendre les contrats de domaine si nécessaire
Dans packages/domain/src/media-generation.ts, `VideoGenerationMode`
couvre actuellement : text-to-video, image-to-video,
multi-image-to-video, video-extension, lip-sync. Ni Omni Flash
(reference_to_video à N images, edit conversationnel stateful, edit de
vidéo uploadée) ni l'interpolation first/last frame de Veo 3.1 n'ont de
mode explicitement nommé pour l'instant. Décider si ces cas rentrent
dans les modes existants ou s'il faut étendre le type — ne pas forcer un
mode existant à représenter un comportement qu'il ne décrit pas
fidèlement (le principe qui a causé le bug de reasoning s'applique ici
aussi : ne pas laisser deux comportements différents partager une seule
étiquette).

PR 4 — Câblage catalogue et exposition
Enregistrer les nouveaux modèles dans le registre de provider (suivre le
pattern de packages/provider-nanogpt/src/video/catalog.ts). Si le gateway
ou Chat Lab expose déjà une surface de génération vidéo pour d'autres
providers, y ajouter Veo/Omni de façon cohérente avec ce qui existe —
sinon, se limiter au provider-sdk et au gateway-api pour cette passe.

Pour chaque PR : fixtures JSON réalistes basées sur les schémas de réponse
documentés (le tableau `steps[]` d'Omni et le format `operation.response`
de Veo sont différents — ne pas réutiliser les mêmes fixtures), tests
unitaires par modèle et par mode de génération, gestion d'erreur distincte
pour les cas spécifiques à chaque API (ex. `audio error` de Veo qui bloque
sans facturer, vs `state: FAILED` sur un fichier Omni).

Ne pas commencer par le câblage catalogue (PR 4) avant que les PR 1 et 2
soient testées indépendamment — le risque principal ici n'est pas la
capacité de reasoning (pas concerné par ce domaine), c'est de traiter Veo
et Omni comme interchangeables alors qu'ils ne le sont pas.
