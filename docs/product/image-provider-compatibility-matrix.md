# Image Provider Compatibility Matrix

This matrix reflects the image capabilities encoded in the current provider image catalogs:

- [packages/provider-google/src/image/catalog.ts](/C:/Data/Workspace/TypeScript/lxp-llm-gateway/packages/provider-google/src/image/catalog.ts)
- [packages/provider-nanogpt/src/image/catalog.ts](/C:/Data/Workspace/TypeScript/lxp-llm-gateway/packages/provider-nanogpt/src/image/catalog.ts)
- [packages/provider-openai/src/image/catalog.ts](/C:/Data/Workspace/TypeScript/lxp-llm-gateway/packages/provider-openai/src/image/catalog.ts)
- [packages/provider-xai/src/image/catalog.ts](/C:/Data/Workspace/TypeScript/lxp-llm-gateway/packages/provider-xai/src/image/catalog.ts)

Scope notes:

- This page covers image providers and image models only.
- It is intentionally code-first: if the code and this page diverge, the code wins and this document should be updated.
- `NanoGPT` is partly dynamic at runtime. The rows below cover the explicit capability families and overrides currently implemented in its `catalog.ts`.
- Providers without an image `catalog.ts` are not included here.

QA legend:

- `Tested (QA)` means the development team has exercised the model or family in `lxp-llm-gateway` and confirmed it currently works as implemented.
- `Not yet QA'd` means the model or family is documented in code, but has not yet been formally exercised by the development team. It may still work, but it should be treated as potentially unstable until verified.

## Summary

| Provider | Image models/families documented in code | Generation | Editing | Notes |
|---|---|---:|---:|---|
| `OpenAI` | 5 | Yes | Yes | GPT Image capability set with background, quality, moderation, output format, and compression |
| `Google Gemini` | 3 | Yes | Yes | `Nano Banana` family with aspect ratio support |
| `xAI Grok` | 2 | Yes | Yes | `Grok Imagine` family with aspect ratio support |
| `NanoGPT` | Multiple known families | Yes | Mixed by model | Dynamic catalog with family-specific overrides for OpenAI-, Gemini-, BytePlus-, Alibaba-, and Qwen-aligned models |

## OpenAI

| Model | QA status | Lifecycle | Gen | Edit | Response format | Resolution | Max outputs | Max refs | Notable options |
|---|---|---|---:|---:|---|---|---:|---:|---|
| `gpt-image-2` | Tested (QA) | `active` | Yes | Yes | `b64_json` | `auto`, `1024x1024`, `1536x1024`, `1024x1536` | 10 | 16 | `background`, `quality`, `moderation`, `outputFormat`, `outputCompression` |
| `gpt-image-1.5` | Tested (QA) | `active` | Yes | Yes | `b64_json` | `auto`, `1024x1024`, `1536x1024`, `1024x1536` | 10 | 16 | `background`, `quality`, `moderation`, `outputFormat`, `outputCompression` |
| `gpt-image-1` | Tested (QA) | `active` | Yes | Yes | `b64_json` | `auto`, `1024x1024`, `1536x1024`, `1024x1536` | 10 | 16 | Same as above plus `inputFidelity` |
| `gpt-image-1-mini` | Not yet QA'd | `preview` | Yes | Yes | `b64_json` | `auto`, `1024x1024`, `1536x1024`, `1024x1536` | 10 | 16 | `background`, `quality`, `moderation`, `outputFormat`, `outputCompression` |
| `chatgpt-image-latest` | Not yet QA'd | `active` | Yes | Yes | `b64_json` | `auto`, `1024x1024`, `1536x1024`, `1024x1536` | 10 | 16 | `background`, `quality`, `moderation`, `outputFormat`, `outputCompression` |

## Google Gemini

| Model | QA status | Display name | Lifecycle | Gen | Edit | Response format | Aspect ratios | Resolution | Max refs | Notes |
|---|---|---|---|---:|---:|---|---|---|---:|---|
| `gemini-2.5-flash-image` | Tested (QA) | `Nano Banana` | `active` | Yes | Yes | `b64_json` | `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9` | `1K` | not set in catalog | Default `aspectRatio: 1:1` |
| `gemini-3-pro-image-preview` | Tested (QA) | `Nano Banana Pro` | `preview` | Yes | Yes | `b64_json` | Same as above | `1K`, `2K`, `4K` | 14 | Default `aspectRatio: 1:1` |
| `gemini-3.1-flash-image-preview` | Tested (QA) | `Nano Banana 2` | `preview` | Yes | Yes | `b64_json` | Same as above | `512`, `1K`, `2K`, `4K` | 14 | Default `aspectRatio: 1:1` |

## xAI Grok

| Model | QA status | Lifecycle | Gen | Edit | Response formats | Aspect ratios | Resolution | Max outputs | Max refs | Notes |
|---|---|---|---:|---:|---|---|---|---:|---:|---|
| `grok-imagine-image` | Tested (QA) | `active` | Yes | Yes | `url`, `b64_json` | `auto`, `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `3:2`, `2:3`, `2:1`, `1:2`, `19.5:9`, `9:19.5`, `20:9`, `9:20` | `1k`, `2k` | 4 | 5 | Default `aspectRatio: auto`, default response format `url` |
| `grok-imagine-image-pro` | Tested (QA) | `active` | Yes | Yes | `url`, `b64_json` | Same as above | `1k`, `2k` | 4 | 5 | Same capability set as base model |

## NanoGPT

NanoGPT is special in this repository:

- the upstream model list is dynamic
- the local catalog applies explicit family overrides for known models
- some rows below represent normalized families or aliases, not a single exact upstream model id

### NanoGPT families aligned to OpenAI

| NanoGPT family / ids               | QA status    | Source alignment              | Gen | Edit | Response format | Resolution                                    | Max outputs | Max refs | Notable options                                                            |
|------------------------------------|--------------|-------------------------------|-----|------|-----------------|-----------------------------------------------|-------------|----------|----------------------------------------------------------------------------|
| `gpt-image-2`                      | Tested (QA)  | OpenAI `GPT Image 2`          | Yes | Yes  | `b64_json`      | `auto`, `1024x1024`, `1536x1024`, `1024x1536` | 10          | 16       | `background`, `quality`, `moderation`, `outputFormat`, `outputCompression` |
| `gpt-image-1.5` and aliases        | Tested (QA)  | OpenAI `GPT Image 1.5`        | Yes | Yes  | `b64_json`      | Same as above                                 | 10          | 16       | Same as above                                                              |
| `gpt-image-1`                      | Tested (QA)  | OpenAI `GPT Image 1`          | Yes | Yes  | `b64_json`      | Same as above                                 | 10          | 16       | Same as above plus `inputFidelity`                                         |
| `gpt-image-1-mini` and aliases     | Not yet QA'd | OpenAI `GPT Image 1 Mini`     | Yes | Yes  | `b64_json`      | Same as above                                 | 10          | 16       | `background`, `quality`, `moderation`, `outputFormat`, `outputCompression` |
| `chatgpt-image-latest` and aliases | Not yet QA'd | OpenAI `ChatGPT Image Latest` | Yes | Yes  | `b64_json`      | Same as above                                 | 10          | 16       | `background`, `quality`, `moderation`, `outputFormat`, `outputCompression` |

### NanoGPT families aligned to Google Gemini

| NanoGPT family / ids                                               | QA status    | Source alignment           | Gen | Edit | Response format | Aspect ratios                                                           | Resolution              | Max refs | Notes                      |
|--------------------------------------------------------------------|--------------|----------------------------|-----|------|-----------------|-------------------------------------------------------------------------|-------------------------|----------|----------------------------|
| `nano-banana`, `nano-banana-edit`, `gemini-flash-edit`             | Tested (QA)  | Google `Nano Banana`       | Yes | Yes  | `b64_json`      | `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9` | `1K`                    | 5        | Default `aspectRatio: 1:1` |
| `nano-banana-2`, `nano-banana-2-fast`                              | Tested (QA)  | Google `Nano Banana 2`     | Yes | Yes  | `b64_json`      | Same as above                                                           | `512`, `1K`, `2K`, `4K` | 14       | Default resolution `512`   |
| `nano-banana-pro`, `nano-banana-pro-edit`, `nano-banana-pro-ultra` | Tested (QA)  | Google `Nano Banana Pro`   | Yes | Yes  | `b64_json`      | Same as above                                                           | `1K`, `2K`, `4K`        | 14       | Default `aspectRatio: 1:1` |
| `nano-banana-pro-edit-ultra`                                       | Not yet QA'd | Google-like local override | Yes | Yes  | `b64_json`      | Same as above                                                           | `1K`, `2K`, `4K`        | 10       | Local stricter ref limit   |

### NanoGPT BytePlus, Alibaba, and Qwen families

| NanoGPT family / ids                                                                                                        | QA status   | Lifecycle in local catalog | Gen               | Edit              | Response formats  | Resolution                              | Max outputs       | Max refs | Notes                                                                |
|-----------------------------------------------------------------------------------------------------------------------------|-------------|----------------------------|-------------------|-------------------|-------------------|-----------------------------------------|-------------------|----------|----------------------------------------------------------------------|
| `seedream-4-0-250828`, `seedream-4.0`, `seedream-4-5-251128`, `seedream-4.5`, `seedream-5-0-lite-260128`, `seedream-5-lite` | Tested (QA) | dynamic/local override     | Yes               | Yes               | `url`, `b64_json` | `1K`, `2K`, `4K`                        | 15                | 10       | Seedream image-set rule: combined references + outputs limited to 15 |
| `seedream-3-0-t2i-250415`, `seedream-3.0`                                                                                   | Tested (QA) | dynamic/local override     | Yes               | No                | `url`, `b64_json` | `2K`                                    | 1                 | n/a      | Generation-only                                                      |
| `seededit-3-0-i2i-250628`, `seededit-3.0`                                                                                   | Tested (QA) | dynamic/local override     | No                | Yes               | `url`, `b64_json` | inherited/minimal                       | 1                 | 1        | Edit-only                                                            |
| `wan-2.7-image-pro`, `wan2.7-image-pro`, `wan2.7-image-professional-edition`                                                | Tested (QA) | dynamic/local override     | Yes               | Yes               | inherited/default | Gen: `1K`, `2K`, `4K`; Edit: `1K`, `2K` | inherited/dynamic | 9        | Mode-specific resolution policy                                      |
| `wan-2.7-image`, `wan2.7-image`                                                                                             | Tested (QA) | dynamic/local override     | Yes               | Yes               | inherited/default | Gen/Edit: `1K`, `2K`                    | inherited/dynamic | 9        | Mode-specific policy with same current res set in both modes         |
| `qwen-image`, `qwen-image-edit`, `qwen-image-img2img`                                                                       | Tested (QA) | dynamic/local override     | Yes               | Yes               | inherited/default | inherited/default                       | inherited/dynamic | 3        | Reference limit override only                                        |
| `flux-kontext`, `flux-kontext/dev`                                                                                          | Tested (QA) | dynamic/local override     | inherited/dynamic | inherited/dynamic | inherited/default | inherited/default                       | inherited/dynamic | 5        | Reference limit override only                                        |

## Reading the matrix

Use this page as a quick compatibility map for:

- which image providers are explicitly modeled in code
- which image models are currently normalized with provider-specific policies
- where options such as `aspectRatio`, `background`, `quality`, `moderation`, `outputFormat`, `outputCompression`, and `inputFidelity` are expected to appear

If you change any image provider catalog behavior, update this page together with the code.
