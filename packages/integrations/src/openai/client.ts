import { z } from "zod";
import { redactSecrets } from "../redact";

/**
 * Minimal OpenAI Chat Completions client for strict structured outputs. The model never
 * receives tools that move money. The response envelope is validated here; callers pass an
 * `output` schema to validate the model's JSON too, and must still sanitise it before use.
 */

export interface OpenAIConfig {
  apiKey: string | null;
  model: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
  /** Structured logger for failures and fallbacks. Never receives prompts, outputs or keys. */
  log?: (event: string, data: Record<string, unknown>) => void;
}

export interface StructuredCallParams<T = unknown> {
  name: string;
  system: string;
  user: string;
  schema: Record<string, unknown>;
  maxOutputTokens?: number;
  /** Validates the parsed model output; a mismatch raises OpenAIError("invalid_output"). */
  output?: z.ZodType<T>;
  /** Aborts the request early (e.g. the agent run's deadline), on top of the client timeout. */
  signal?: AbortSignal;
}

export interface StructuredResult<T> {
  data: T;
  usage: { input_tokens: number; output_tokens: number };
  model: string;
}

export type OpenAIFailure =
  | "not_configured"
  | "http"
  | "refused"
  | "truncated"
  | "empty"
  | "invalid_json"
  | "invalid_output"
  | "invalid_response"
  | "aborted"
  | "network";

/**
 * `message` is for logs only: it may carry a short, redacted provider reason. Client-facing text
 * must be derived from `kind` and `status`, never from `message`.
 */
export class OpenAIError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    /** Machine-readable reason, safe to log (carries no prompt or output text). */
    readonly kind: OpenAIFailure = "network",
  ) {
    super(message);
    this.name = "OpenAIError";
  }
}

const Envelope = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().nullish(), refusal: z.string().nullish() }).nullish(),
        finish_reason: z.string().nullish(),
      }),
    )
    .nullish(),
  usage: z
    .object({ prompt_tokens: z.number().int().nonnegative().nullish(), completion_tokens: z.number().int().nonnegative().nullish() })
    .nullish(),
});

const ErrorBody = z.object({ error: z.object({ message: z.string().nullish() }).nullish() });

/** Models whose completion budget includes hidden reasoning tokens (gpt-5 family, o-series). */
export function isReasoningModel(model: string): boolean {
  return /^(gpt-5|o\d)/i.test(model);
}
const REASONING_ALLOWANCE = 2_000;

export class OpenAIClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private tokensUsed = 0;

  constructor(private readonly config: OpenAIConfig) {
    this.baseUrl = config.baseUrl ?? "https://api.openai.com/v1";
    this.fetchImpl = config.fetch ?? fetch;
    this.timeoutMs = config.timeoutMs ?? 20_000;
  }

  get enabled(): boolean {
    return Boolean(this.config.apiKey);
  }

  get model(): string {
    return this.config.model;
  }

  get totalTokens(): number {
    return this.tokensUsed;
  }

  /** Records that a caller fell back to deterministic behaviour (no prompt content). */
  reportFallback(name: string, reason: string): void {
    this.config.log?.("openai.fallback", { name, reason: reason.slice(0, 200) });
  }

  async structured<T>(params: StructuredCallParams<T>): Promise<StructuredResult<T>> {
    try {
      return await this.call(params);
    } catch (err) {
      const e =
        err instanceof OpenAIError
          ? err
          : params.signal?.aborted
            ? new OpenAIError("OpenAI request aborted", null, "aborted")
            : new OpenAIError(`OpenAI request failed: ${redactSecrets(err instanceof Error ? err.message : String(err))}`, null, "network");
      this.config.log?.("openai.request_failed", { name: params.name, kind: e.kind, status: e.status });
      throw e;
    }
  }

  private async call<T>(params: StructuredCallParams<T>): Promise<StructuredResult<T>> {
    if (!this.config.apiKey) throw new OpenAIError("OpenAI is not configured (OPENAI_API_KEY).", null, "not_configured");
    if (params.signal?.aborted) throw new OpenAIError("OpenAI request aborted", null, "aborted");
    const timeout = AbortSignal.timeout(this.timeoutMs);
    const signal = params.signal ? AbortSignal.any([timeout, params.signal]) : timeout;
    const res = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: "system", content: params.system },
          { role: "user", content: params.user },
        ],
        response_format: { type: "json_schema", json_schema: { name: params.name, strict: true, schema: params.schema } },
        // Reasoning models count hidden reasoning tokens against this limit, so they get an
        // allowance on top of the visible-output budget and are asked to reason minimally.
        max_completion_tokens: (params.maxOutputTokens ?? 1200) + (isReasoningModel(this.config.model) ? REASONING_ALLOWANCE : 0),
        ...(isReasoningModel(this.config.model) ? { reasoning_effort: "minimal" } : {}),
      }),
      signal,
    });
    const raw: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const message = ErrorBody.safeParse(raw).data?.error?.message ?? "unknown error";
      // Provider error text can quote the credential it rejected ("Incorrect API key provided: sk-…").
      throw new OpenAIError(`OpenAI request failed (HTTP ${res.status}): ${redactSecrets(message)}`, res.status, "http");
    }
    const envelope = Envelope.safeParse(raw);
    if (!envelope.success) throw new OpenAIError("OpenAI returned an unexpected response", res.status, "invalid_response");
    const body = envelope.data;
    const choice = body.choices?.[0];
    if (choice?.message?.refusal) throw new OpenAIError(`Model refused: ${redactSecrets(choice.message.refusal)}`, res.status, "refused");
    if (choice?.finish_reason === "length") throw new OpenAIError("Model output truncated", res.status, "truncated");
    const content = choice?.message?.content;
    if (!content) throw new OpenAIError("Model returned no content", res.status, "empty");
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new OpenAIError("Model returned invalid JSON", res.status, "invalid_json");
    }
    // Usage is counted once the model has produced output, even if that output is then rejected.
    const usage = { input_tokens: body.usage?.prompt_tokens ?? 0, output_tokens: body.usage?.completion_tokens ?? 0 };
    this.tokensUsed += usage.input_tokens + usage.output_tokens;
    let data: T;
    if (params.output) {
      const checked = params.output.safeParse(parsed);
      if (!checked.success) throw new OpenAIError("Model output failed schema validation", res.status, "invalid_output");
      data = checked.data;
    } else {
      data = parsed as T;
    }
    return { data, usage, model: this.config.model };
  }
}
