# DeepSeek API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate DeepSeek as a first-class AI provider with support for V4 models and OpenAI-compatible API.

**Architecture:** Extend the `UnifiedAIService` to handle `deepseek` requests using its OpenAI-compatible endpoint. Update model registries and settings hooks to include DeepSeek.

**Tech Stack:** TypeScript, React, Vite.

---

### Task 1: Update Type Definitions

**Files:**
- Modify: `src/types/aiService.ts`

- [ ] **Step 1: Add "deepseek" to AIProvider type**

```typescript
export type AIProvider = "openai" | "gemini" | "grok" | "ollama" | "opencode" | "deepseek";
```

- [ ] **Step 2: Define DeepSeekModel and DEEPSEEK_MODELS**

```typescript
export interface DeepSeekModel {
  id: string;
  name: string;
  description: string;
  contextWindow: number;
  maxOutputTokens: number;
  inputPricing: number;
  outputPricing: number;
  capabilities: string[];
}

export const DEEPSEEK_MODELS: Record<string, DeepSeekModel> = {
  "deepseek-v4-flash": {
    id: "deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    description: "Latest flagship flash model with 1M context",
    contextWindow: 1048576,
    maxOutputTokens: 384000,
    inputPricing: 0.14,
    outputPricing: 0.28,
    capabilities: ["text", "code", "function-calling"],
  },
  "deepseek-v4-pro": {
    id: "deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    description: "High-capability flagship pro model with 1M context",
    contextWindow: 1048576,
    maxOutputTokens: 384000,
    inputPricing: 1.74,
    outputPricing: 3.48,
    capabilities: ["text", "code", "reasoning", "function-calling"],
  },
  "deepseek-chat": {
    id: "deepseek-chat",
    name: "DeepSeek Chat",
    description: "Legacy model (maps to v4-flash non-thinking)",
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    inputPricing: 0.14,
    outputPricing: 0.28,
    capabilities: ["text", "code"],
  },
  "deepseek-reasoner": {
    id: "deepseek-reasoner",
    name: "DeepSeek Reasoner",
    description: "Legacy model (maps to v4-flash thinking)",
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    inputPricing: 0.14,
    outputPricing: 0.28,
    capabilities: ["text", "reasoning"],
  },
};
```

- [ ] **Step 3: Update getAllModels to include DeepSeek**

```typescript
  // Add DeepSeek models
  Object.values(DEEPSEEK_MODELS).forEach((model) => {
    models.push({
      id: model.id,
      name: model.name,
      description: model.description,
      provider: "deepseek",
      contextWindow: model.contextWindow,
      maxOutputTokens: model.maxOutputTokens,
      pricing: {
        input: model.inputPricing,
        output: model.outputPricing,
      },
      capabilities: model.capabilities,
    });
  });
```

- [ ] **Step 4: Update DEFAULT_MODELS**

```typescript
export const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai: "gpt-5.4",
  gemini: "gemini-3-flash-preview",
  grok: "grok-4",
  ollama: "llama3.2",
  opencode: "glm-5",
  deepseek: "deepseek-v4-flash",
};
```

- [ ] **Step 5: Commit**

```bash
git add src/types/aiService.ts
git commit -m "types: add deepseek provider and models"
```

---

### Task 2: Implement DeepSeek Service Logic

**Files:**
- Modify: `src/services/aiService.ts`

- [ ] **Step 1: Implement callDeepSeek method**

```typescript
  // DeepSeek API call (OpenAI-compatible)
  private async callDeepSeek(
    config: AIServiceConfig,
    prompt: string
  ): Promise<AIResponse> {
    const model = getModelById(config.model);
    if (!model || model.provider !== "deepseek") {
      throw new Error(`Invalid DeepSeek model: ${config.model}`);
    }

    const request: OpenAIRequest = {
      model: config.model,
      messages: [
        ...(config.systemPrompt
          ? [{ role: "system" as const, content: config.systemPrompt }]
          : []),
        { role: "user" as const, content: prompt },
      ],
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? model.maxOutputTokens,
      top_p: config.topP ?? 1,
      response_format: config.responseFormat ? { type: config.responseFormat } : undefined,
    };

    const response = await safeFetch(
      config.baseURL || "https://api.deepseek.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
    }

    const data: OpenAIResponse = await response.json();

    return {
      content: data.choices[0]?.message?.content || "",
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      model: config.model,
      provider: "deepseek",
      finishReason: data.choices[0]?.finish_reason,
    };
  }
```

- [ ] **Step 2: Update generateResponse switch statement**

```typescript
        case "deepseek":
          response = await this.callDeepSeek(config, prompt);
          break;
```

- [ ] **Step 3: Update validateApiKey for deepseek**

```typescript
      case "deepseek":
        return apiKey.startsWith("sk-") && apiKey.length > 20;
```

- [ ] **Step 4: Commit**

```bash
git add src/services/aiService.ts
git commit -m "feat: implement deepseek api call in UnifiedAIService"
```

---

### Task 3: Update Settings Hook

**Files:**
- Modify: `src/hooks/useAiSettingsState.ts`

- [ ] **Step 1: Add deepseek to relevant loops and defaults in useAiSettingsState**

Search for `AIProvider` usages and ensure `deepseek` is handled consistently (e.g., adding it to `PROVIDERS` list if it exists, or ensuring the default values are initialized).

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useAiSettingsState.ts
git commit -m "feat: update ai settings hook to support deepseek"
```

---

### Task 4: Add and Run Tests

**Files:**
- Modify: `tests/aiService.test.mjs`

- [ ] **Step 1: Add DeepSeek tests to aiService.test.mjs**

```javascript
  // Test DeepSeek integration
  // (Mocking safeFetch if necessary, follow existing patterns in the file)
```

- [ ] **Step 2: Run tests and verify PASS**

Run: `node tests/aiService.test.mjs` (or the appropriate test runner command)
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/aiService.test.mjs
git commit -m "test: add deepseek integration tests"
```
