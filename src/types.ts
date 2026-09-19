import type * as vscode from 'vscode';
import type { ReasoningEffort } from '@openrouter/sdk/models';

export type { ReasoningEffort } from '@openrouter/sdk/models';

export interface ModelEntry extends vscode.LanguageModelChatInformation {
  readonly orModelId: string;
  readonly effort: ReasoningEffort | null;
}

export interface ModelConfig {
  enabled: boolean;
  effortLevels: ReasoningEffort[];
  /** Overrides the context window reported for this model (useful with orcp.apiDialect "openai"). */
  contextLength?: number;
  /** Overrides the max output tokens reported for this model (useful with orcp.apiDialect "openai"). */
  maxOutputTokens?: number;
  /** Disables tool calling for this model, for endpoints whose models cannot call tools. */
  toolCalling?: boolean;
}

export interface TurnRecord {
  generationId: string;
  orModelId: string;
  promptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  costUSD?: number;
}

export interface SessionSummary {
  turns: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalReasoningTokens: number;
  totalCostUSD: number;
}
