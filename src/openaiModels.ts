import type { Model } from '@openrouter/sdk/models';

/**
 * Context length reported for models served by plain OpenAI-compatible
 * endpoints, which do not publish context windows in GET /models.
 * Override per model via `orcp.models.<id>.contextLength`.
 */
export const DEFAULT_CONTEXT_LENGTH = 32768;

function displayName(id: string): string {
  const part = id.includes('/') ? id.split('/').pop()! : id;
  return part.replace(/-/g, ' ');
}

/**
 * Adapt a model from a plain OpenAI-compatible GET /models response
 * (id/object/created/owned_by) to the OpenRouter model shape consumed by
 * ModelRegistry: text-to-text chat with tool calling. Reasoning-effort
 * variants are not exposed because the endpoint does not report
 * parameter support.
 */
export function toOpenRouterModel(id: string): Model {
  return {
    id,
    name: displayName(id),
    canonicalSlug: id,
    created: 0,
    contextLength: DEFAULT_CONTEXT_LENGTH,
    defaultParameters: null,
    description: undefined,
    expirationDate: null,
    huggingFaceId: id.includes('/') ? id : null,
    links: { details: '' },
    perRequestLimits: null,
    pricing: { prompt: '-1', completion: '-1' },
    supportedParameters: ['tools'],
    supportedVoices: null,
    topProvider: { isModerated: false },
    architecture: {
      inputModalities: ['text'],
      outputModalities: ['text'],
      modality: null,
      instructType: null,
    },
  };
}
