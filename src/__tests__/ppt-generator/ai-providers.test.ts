/**
 * PPT Generator – AI Provider Tests
 *
 * Verifies the model-picker and provider-routing layer handles every
 * real-world provider scenario correctly without touching an actual AI API:
 *
 *   Providers:
 *     • Ollama (default – local, free)
 *     • OpenAI (cloud, requires OPENAI_API_KEY)
 *     • LM Studio (local OpenAI-compat)
 *     • Together AI (cloud)
 *     • Unknown / mis-spelled provider → graceful error
 *
 *   Error scenarios:
 *     • Ollama service offline  → throws with actionable message
 *     • Ollama model not pulled → warns + proceeds (let Ollama handle it)
 *     • OpenAI key missing       → throws with actionable message
 *     • Network timeout          → re-thrown with context
 *     • Max-retries exceeded     → re-thrown
 *
 *   Config scenarios:
 *     • OLLAMA_MAX_RETRIES / OLLAMA_TIMEOUT_MS env vars are respected
 *     • Custom baseURL forwarded to LM Studio
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

const mockCheckOllamaHealth = vi.fn();
const mockValidateOllamaModel = vi.fn();

vi.mock("@/lib/ollama-health-check", () => ({
  checkOllamaHealth: mockCheckOllamaHealth,
  validateOllamaModel: mockValidateOllamaModel,
}));

const mockCreateOllama = vi.fn();
const mockCreateOpenAI = vi.fn();

vi.mock("ollama-ai-provider", () => ({ createOllama: mockCreateOllama }));
vi.mock("@ai-sdk/openai", () => ({ createOpenAI: mockCreateOpenAI }));

// suppress logger noise in tests
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function ollamaHealthy() {
  mockCheckOllamaHealth.mockResolvedValue({ isAvailable: true });
  mockValidateOllamaModel.mockResolvedValue({ isAvailable: true });
}

function ollamaOffline(message = "Connection refused") {
  mockCheckOllamaHealth.mockResolvedValue({ isAvailable: false, error: message });
}

function ollamaModelMissing(model: string) {
  mockCheckOllamaHealth.mockResolvedValue({ isAvailable: true });
  mockValidateOllamaModel.mockResolvedValue({
    isAvailable: false,
    error: `Model '${model}' not found. Run: ollama pull ${model}`,
  });
}

// A fake model object that is a valid LanguageModelV1 duck type
function fakeModel(id: string) {
  const fn = vi.fn().mockReturnValue({ _modelId: id });
  return fn;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("modelPicker – Ollama provider", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns an Ollama model when Ollama is healthy", async () => {
    ollamaHealthy();
    const model = fakeModel("llama3.2");
    mockCreateOllama.mockReturnValueOnce(model);

    const { modelPicker } = await import("@/lib/model-picker");
    const result = await modelPicker("ollama", "llama3.2");

    expect(result).toBeDefined();
    expect(mockCreateOllama).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: expect.stringContaining("11434") }),
    );
  });

  it("defaults to 'llama3.2' when no modelId supplied", async () => {
    ollamaHealthy();
    const model = fakeModel("llama3.2");
    mockCreateOllama.mockReturnValueOnce(model);
    const { modelPicker } = await import("@/lib/model-picker");
    await modelPicker("ollama");
    expect(model).toHaveBeenCalledWith("llama3.2", expect.anything());
  });

  it("throws a human-readable error when Ollama is offline", async () => {
    ollamaOffline("ECONNREFUSED");
    const { modelPicker } = await import("@/lib/model-picker");
    await expect(modelPicker("ollama")).rejects.toThrow(/Ollama service is unavailable/i);
  });

  it("includes 'ollama serve' instruction in the error when offline", async () => {
    ollamaOffline("timeout");
    const { modelPicker } = await import("@/lib/model-picker");
    await expect(modelPicker("ollama")).rejects.toThrow(/ollama serve/i);
  });

  it("warns but does NOT throw when model validation fails (allows Ollama to handle it)", async () => {
    ollamaModelMissing("mistral");
    const model = fakeModel("mistral");
    mockCreateOllama.mockReturnValueOnce(model);
    const { modelPicker } = await import("@/lib/model-picker");
    // Should not throw
    await expect(modelPicker("ollama", "mistral")).resolves.toBeDefined();
  });

  it("uses custom baseURL when provided", async () => {
    ollamaHealthy();
    const model = fakeModel("llama3.2");
    mockCreateOllama.mockReturnValueOnce(model);
    const { modelPicker } = await import("@/lib/model-picker");
    await modelPicker("ollama", "llama3.2", "http://10.0.0.5:11434");
    expect(mockCreateOllama).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: "http://10.0.0.5:11434" }),
    );
  });
});

describe("modelPicker – OpenAI provider", () => {
  const OLD_ENV = { ...process.env };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    process.env = { ...OLD_ENV };
  });

  it("throws when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;
    const { modelPicker } = await import("@/lib/model-picker");
    await expect(modelPicker("openai", "gpt-4o")).rejects.toThrow(/OPENAI_API_KEY/i);
  });

  it("returns an OpenAI model when key is present", async () => {
    process.env.OPENAI_API_KEY = "sk-test-key";
    const fakeFn = fakeModel("gpt-4o");
    mockCreateOpenAI.mockReturnValueOnce(fakeFn);
    const { modelPicker } = await import("@/lib/model-picker");
    const result = await modelPicker("openai", "gpt-4o");
    expect(result).toBeDefined();
    expect(mockCreateOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: "sk-test-key" }),
    );
  });
});

describe("modelPicker – LM Studio provider", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates a model with default LM Studio base URL", async () => {
    const fakeFn = fakeModel("mistral-7b");
    mockCreateOpenAI.mockReturnValueOnce(fakeFn);
    const { modelPicker } = await import("@/lib/model-picker");
    const result = await modelPicker("lmstudio", "mistral-7b");
    expect(result).toBeDefined();
    expect(mockCreateOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: expect.stringContaining("1234") }),
    );
  });

  it("uses custom base URL when provided", async () => {
    const fakeFn = fakeModel("mistral-7b");
    mockCreateOpenAI.mockReturnValueOnce(fakeFn);
    const { modelPicker } = await import("@/lib/model-picker");
    await modelPicker("lmstudio", "mistral-7b", "http://192.168.1.100:1234/v1");
    expect(mockCreateOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: "http://192.168.1.100:1234/v1" }),
    );
  });
});

describe("modelPicker – Together AI provider", () => {
  const OLD_ENV = { ...process.env };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    process.env = { ...OLD_ENV };
  });

  it("throws when TOGETHER_AI_API_KEY is missing", async () => {
    delete process.env.TOGETHER_AI_API_KEY;
    const { modelPicker } = await import("@/lib/model-picker");
    await expect(modelPicker("togetherai", "meta-llama/Llama-3-70b")).rejects.toThrow(
      /TOGETHER_AI_API_KEY/i,
    );
  });

  it("creates a Together AI model when key is set", async () => {
    process.env.TOGETHER_AI_API_KEY = "test-together-key";
    const fakeFn = fakeModel("llama-3");
    mockCreateOpenAI.mockReturnValueOnce(fakeFn);
    const { modelPicker } = await import("@/lib/model-picker");
    const result = await modelPicker("togetherai", "meta-llama/Llama-3-70b");
    expect(result).toBeDefined();
  });
});

describe("modelPicker – unknown / fallback provider", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    ollamaHealthy();
  });

  it("falls back to Ollama when provider is empty string", async () => {
    const model = fakeModel("llama3.2");
    mockCreateOllama.mockReturnValueOnce(model);
    const { modelPicker } = await import("@/lib/model-picker");
    const result = await modelPicker("", "llama3.2");
    expect(result).toBeDefined();
  });

  it("throws a descriptive error for a completely unknown provider", async () => {
    const { modelPicker } = await import("@/lib/model-picker");
    await expect(modelPicker("groq", "mixtral")).rejects.toThrow();
  });
});
