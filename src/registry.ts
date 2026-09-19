import vscode from 'vscode';
import { SecretsManager } from './SecretsManager';
import { OpenRouterClient, type ApiDialect } from './OpenRouterClient';
import { ModelRegistry } from './ModelRegistry';
import { SessionTracker } from './SessionTracker';
import { ChatProvider } from './ChatProvider';
import { ModelConfig } from './types';

export interface RegistrationResult extends vscode.Disposable {
  readonly tracker: SessionTracker;
}

export async function registerAll(
  context: vscode.ExtensionContext,
  secrets: SecretsManager,
): Promise<RegistrationResult> {
  const cfg = vscode.workspace.getConfiguration('orcp');
  const baseUrl: string = cfg.get('baseUrl', 'https://openrouter.ai/api/v1');
  const apiDialect: ApiDialect = cfg.get<ApiDialect>('apiDialect', 'openrouter');
  const modelConfigs: Record<string, ModelConfig> = cfg.get('models', {});

  if (apiDialect === 'openai' && baseUrl.replace(/\/+$/, '') === 'https://openrouter.ai/api/v1') {
    vscode.window.showWarningMessage(
      'ORCP: orcp.apiDialect is "openai" but orcp.baseUrl is still the OpenRouter default. ' +
      'Set orcp.baseUrl to your OpenAI-compatible endpoint.',
    );
  }

  const client = new OpenRouterClient(secrets, baseUrl, apiDialect);
  const registry = new ModelRegistry();
  const tracker = new SessionTracker();
  const provider = new ChatProvider(registry, client, tracker);

  try {
    const rawModels = await client.listModels();
    registry.rebuild(rawModels, modelConfigs);
  } catch (err) {
    if (err instanceof Error && err.message.includes('API key')) {
      const choice = await vscode.window.showErrorMessage(
        'ORCP: No API key configured. Models will not appear in the picker.',
        'Set API Key',
      );
      if (choice === 'Set API Key') {
        await secrets.promptAndSave();
      }
    } else {
      vscode.window.showErrorMessage(`ORCP: Failed to load models. ${String(err)}`);
    }
  }

  const providerDisposable = vscode.lm.registerLanguageModelChatProvider(
    'ostash.openrouter',
    provider,
  );

  return {
    tracker,
    dispose() {
      providerDisposable.dispose();
      registry.dispose();
      tracker.dispose();
    },
  };
}
