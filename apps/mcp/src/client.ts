import { randomUUID } from "node:crypto";

/**
 * Minimal HTTP client for the Quartermaster v1 API, signed in as one workspace member. It keeps
 * the session cookie in memory, sends the CSRF header the web app sends, signs in again once when
 * the session has expired, and turns every failure into an {@link ApiError} with fixed text.
 * The password and cookies are never logged or included in errors.
 */

export class ApiError extends Error {
  override name = "ApiError";
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export interface ClientOptions {
  apiUrl: string;
  email: string;
  password: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export interface RequestOptions {
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** Sent as Idempotency-Key; the API requires one on proposal creation. */
  idempotencyKey?: string;
}

const CODE = /^[A-Z][A-Z0-9_]{1,63}$/;

/** Fixed text for failures whose API message is not shown (or that never reached the API). */
const FIXED: Record<number, string> = {
  400: "The Quartermaster API rejected the request as malformed.",
  401: "The Quartermaster session is not valid and signing in again did not help.",
  403: "This Quartermaster account's role does not allow that action.",
  404: "Not found in this Quartermaster workspace.",
  409: "The request conflicts with the current state in Quartermaster.",
  422: "The Quartermaster API could not process the request.",
  429: "Quartermaster is rate limiting this account. Wait a few minutes and try again.",
};

export class QuartermasterClient {
  private readonly cookies = new Map<string, string>();
  private signingIn: Promise<void> | null = null;
  private readonly fetchImpl: typeof fetch;
  private readonly base: string;

  constructor(private readonly opts: ClientOptions) {
    this.fetchImpl = opts.fetch ?? fetch;
    this.base = `${opts.apiUrl.replace(/\/+$/, "")}/api/v1`;
  }

  get<T>(path: string, query?: RequestOptions["query"]): Promise<T> {
    return this.request<T>("GET", path, { query });
  }

  post<T>(path: string, body?: unknown, opts: Omit<RequestOptions, "body"> = {}): Promise<T> {
    return this.request<T>("POST", path, { ...opts, body: body ?? {} });
  }

  /** Signs in (or reuses an in-flight sign-in) and stores the session cookie. */
  signIn(): Promise<void> {
    this.signingIn ??= this.doSignIn().finally(() => {
      this.signingIn = null;
    });
    return this.signingIn;
  }

  async request<T>(method: "GET" | "POST", path: string, opts: RequestOptions = {}): Promise<T> {
    if (this.cookies.size === 0) await this.signIn();
    let res = await this.send(method, path, opts);
    if (res.status === 401) {
      // The session expired or was revoked: sign in again once, then retry the same request
      // (with the same Idempotency-Key, which the API never stored because auth failed first).
      this.cookies.clear();
      await this.signIn();
      res = await this.send(method, path, opts);
    }
    return this.parse<T>(res);
  }

  private async doSignIn(): Promise<void> {
    this.cookies.clear();
    const res = await this.send("POST", "/auth/login", { body: { email: this.opts.email, password: this.opts.password } });
    if (res.status === 200) {
      await res.body?.cancel();
      if (this.cookies.size === 0) throw new ApiError(502, "NO_SESSION", "Quartermaster accepted the sign-in but returned no session.");
      return;
    }
    await res.body?.cancel();
    if (res.status === 429) throw new ApiError(429, "RATE_LIMITED", FIXED[429]!);
    if (res.status === 401 || res.status === 400 || res.status === 403 || res.status === 423) {
      throw new ApiError(401, "SIGN_IN_FAILED", "Quartermaster rejected the MCP server's sign-in. Check QM_EMAIL and QM_PASSWORD.");
    }
    throw new ApiError(502, "SIGN_IN_UNAVAILABLE", "Quartermaster could not complete the sign-in. Try again shortly.");
  }

  private async send(method: "GET" | "POST", path: string, opts: RequestOptions): Promise<Response> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined) url.searchParams.set(k, String(v));
    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "quartermaster-mcp/1.0",
      "X-Correlation-Id": `mcp-${randomUUID()}`,
    };
    if (this.cookies.size > 0) headers.Cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
    if (method !== "GET") {
      // The API's CSRF guard requires this header and a JSON body on every mutation.
      headers["X-Requested-With"] = "quartermaster";
      headers["Content-Type"] = "application/json";
    }
    if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;
    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method,
        headers,
        body: method === "GET" ? undefined : JSON.stringify(opts.body ?? {}),
        redirect: "error",
        signal: AbortSignal.timeout(this.opts.timeoutMs ?? 180_000),
      });
    } catch (err) {
      const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
      throw timedOut
        ? new ApiError(504, "API_TIMEOUT", "The Quartermaster API did not answer in time.")
        : new ApiError(503, "API_UNREACHABLE", `Could not reach the Quartermaster API at ${new URL(this.base).origin}.`);
    }
    this.storeCookies(res);
    return res;
  }

  private storeCookies(res: Response) {
    for (const raw of res.headers.getSetCookie()) {
      const pair = raw.split(";", 1)[0] ?? "";
      const eq = pair.indexOf("=");
      if (eq <= 0) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      const cleared = value === "" || /;\s*max-age=0/i.test(raw) || /;\s*expires=thu, 01 jan 1970/i.test(raw);
      if (cleared) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  private async parse<T>(res: Response): Promise<T> {
    let body: unknown = null;
    const text = await res.text().catch(() => "");
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        throw new ApiError(502, "BAD_RESPONSE", "The Quartermaster API returned an unreadable response.");
      }
    }
    if (res.ok) return body as T;
    const error = (body as { error?: { code?: unknown; message?: unknown } } | null)?.error;
    const code = typeof error?.code === "string" && CODE.test(error.code) ? error.code : `HTTP_${res.status}`;
    // The API's client-facing messages are fixed per error code (raw driver/provider text stays in
    // its logs), so they are safe to relay; anything unexpected falls back to fixed text.
    const apiMessage = typeof error?.message === "string" && error.message.length <= 300 ? error.message : null;
    const message =
      res.status >= 500
        ? "The Quartermaster API hit an internal error. Try again shortly."
        : (apiMessage ?? FIXED[res.status] ?? `The Quartermaster API refused the request (HTTP ${res.status}).`);
    throw new ApiError(res.status, code, message);
  }
}
