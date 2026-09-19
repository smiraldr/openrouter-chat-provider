import { SecretsManager } from './SecretsManager';
import { ReasoningEffort } from './types';
import { toOpenRouterModel } from './openaiModels';
import type { OpenRouter } from '@openrouter/sdk';
import type {
  Model,
  ChatMessages,
  ChatFunctionTool,
  ChatToolChoice,
  ReasoningConfig,
  ChatStreamChunk,
  ChatRequest,
} from '@openrouter/sdk/models';

const HTTP_REFERER = 'https://github.com/ostash/openrouter-chat-provider';
const APP_TITLE = 'OpenRouter Chat Provider for VSCode';
const APP_CATEGORIES = 'ide-extension';

export type ApiDialect = 'openrouter' | 'openai';

export class OpenRouterClient {
  private sdkClient: OpenRouter | null = null;
  private cachedApiKey: string | null = null;
  private cachedBaseUrl: string | null = null;

  constructor(
    private readonly secrets: SecretsManager,
    private readonly baseUrl: string,
    private readonly apiDialect: ApiDialect = 'openrouter',
  ) {}

  private async getClient(): Promise<OpenRouter> {
    const apiKey = await this.secrets.getApiKey();
    if (!apiKey) {
      this.sdkClient = null;
      this.cachedApiKey = null;
      throw new Error('OpenRouter API key is not set. Use ORCP: Set API Key command.');
    }

    // Reset client if API key or base URL has changed
    if (this.sdkClient && (this.cachedApiKey !== apiKey || this.cachedBaseUrl !== this.baseUrl)) {
      this.sdkClient = null;
    }

    if (this.sdkClient) {
      return this.sdkClient;
    }

    const { OpenRouter } = await import('@openrouter/sdk');
    this.sdkClient = new OpenRouter({
      apiKey,
      httpReferer: HTTP_REFERER,
      appTitle: APP_TITLE,
      appCategories: APP_CATEGORIES,
      serverURL: this.baseUrl,
    });
    this.cachedApiKey = apiKey;
    this.cachedBaseUrl = this.baseUrl;
    return this.sdkClient;
  }

  resetClient(): void {
    this.sdkClient = null;
    this.cachedApiKey = null;
  }

  async getApiKey(): Promise<string | undefined> {
    return this.secrets.getApiKey();
  }

  async listModels(): Promise<Model[]> {
    if (this.apiDialect === 'openai') {
      return this.listOpenAIModels();
    }
    const client = await this.getClient();
    const response = await client.models.listForUser(
      { bearer: this.cachedApiKey! },
    );
    return response.data;
  }

  /**
   * Plain OpenAI-compatible listing: GET {base}/models. The response is
   * OpenAI-shaped (id/object/created/owned_by) and is adapted to the
   * OpenRouter model shape, since the endpoint provides no metadata.
   */
  private async listOpenAIModels(): Promise<Model[]> {
    const apiKey = await this.secrets.getApiKey();
    if (!apiKey) {
      throw new Error('API key is not set. Use ORCP: Set API Key command.');
    }
    const base = this.baseUrl.replace(/\/+$/, '');
    const response = await fetch(`${base}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) {
      throw new Error(`GET ${base}/models failed: ${response.status} ${response.statusText}`);
    }
    const payload = (await response.json()) as { data?: Array<{ id?: string }> };
    return (payload.data ?? [])
      .filter(m => typeof m?.id === 'string')
      .map(m => toOpenRouterModel(m.id!));
  }

  async streamChat(
    orModelId: string,
    messages: ChatMessages[],
    opts: {
      effort: ReasoningConfig['effort'];
      toolChoice: ChatToolChoice;
      tools?: ChatFunctionTool[];
      maxTokens?: number;
    },
    signal: AbortSignal,
  ): Promise<AsyncIterable<ChatStreamChunk>> {
    const client = await this.getClient();

    const chatRequest: ChatRequest = {
      model: orModelId,
      messages,
      stream: true,
      streamOptions: { includeUsage: true },
    };

    if (opts.effort) {
      chatRequest.reasoning = { effort: opts.effort };
    }

    if (opts.toolChoice) {
      chatRequest.toolChoice = opts.toolChoice;
    }

    if (opts.tools?.length) {
      chatRequest.tools = opts.tools;
    }

    if (opts.maxTokens) {
      chatRequest.maxTokens = opts.maxTokens;
    }

    const response = await client.chat.send(
      { chatRequest },
      { signal },
    );

    return response as AsyncIterable<ChatStreamChunk>;
  }
}
