import type { AIProvider } from "../../types/aiService";

export interface SelectionExplanationResult {
  explanation: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: AIProvider;
}

export interface SelectionExplanationState {
  status: "idle" | "loading" | "completed" | "error";
  result?: SelectionExplanationResult;
  error?: string;
}

export const selectionExplanationStates = new Map<
  string,
  SelectionExplanationState
>();
export const selectionExplanationCache = new Map<
  string,
  SelectionExplanationResult
>();

export const getSelectionExplanationState = (
  key: string
): SelectionExplanationState => {
  return selectionExplanationStates.get(key) || { status: "idle" };
};

export const setSelectionExplanationState = (
  key: string,
  value: SelectionExplanationState
): void => {
  selectionExplanationStates.set(key, value);
};
