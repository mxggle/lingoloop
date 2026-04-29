# Design Spec: DeepSeek API Integration

## Overview
This specification outlines the integration of DeepSeek AI as a first-class provider within the `UnifiedAIService`. DeepSeek offers a highly efficient, OpenAI-compatible API with massive context windows (1M tokens) and competitive pricing, particularly with the new V4 series models.

## Goals
- Add DeepSeek as a supported `AIProvider`.
- Support the latest DeepSeek V4 models (`deepseek-v4-flash`, `deepseek-v4-pro`).
- Provide accurate metadata for context windows and pricing.
- Ensure seamless integration with the existing settings and playback workflows.

## Proposed Changes

### 1. Type Definitions (`src/types/aiService.ts`)
- Extend `AIProvider` union: `| "deepseek"`.
- Define `DeepSeekModel` interface (identical to `OpenAIModel`).
- Implement `DEEPSEEK_MODELS` registry with the following models:
    - `deepseek-v4-flash`: 1M context, $0.14/$0.28 pricing.
    - `deepseek-v4-pro`: 1M context, $1.74/$3.48 pricing (pre-discount).
    - `deepseek-chat`: Legacy, maps to non-thinking flash.
    - `deepseek-reasoner`: Legacy, maps to thinking flash.
- Update `getAllModels` and `DEFAULT_MODELS`.

### 2. AI Service Implementation (`src/services/aiService.ts`)
- Implement `callDeepSeek(config: AIServiceConfig, prompt: string)` method.
- Base URL: `https://api.deepseek.com/v1` (or `https://api.deepseek.com` if `/v1` is not required).
- Use `OpenAIRequest` and `OpenAIResponse` structures for compatibility.
- Update `generateResponse` switch statement.
- Update `validateApiKey` to support DeepSeek key formats (typically starting with `sk-`).

### 3. Settings & Hooks (`src/hooks/useAiSettingsState.ts`)
- Ensure the settings state handles the new provider.
- Add DeepSeek to the provider selection list.
- Configure default models and API key storage for DeepSeek.

## Testing Strategy
- **Unit Tests:** Add tests to `tests/aiService.test.mjs` to verify DeepSeek request construction and response parsing.
- **Manual Verification:** Use the "Test Connection" feature in the settings UI with a valid DeepSeek API key.

## Rollback Plan
- Revert changes to `UnifiedAIService` and model registries.
- No database migrations are required as settings are stored in `localStorage` or `configStore`.
