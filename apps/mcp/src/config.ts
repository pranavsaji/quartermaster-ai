/** Configuration for the Quartermaster MCP server, read from the environment. */
export interface McpConfig {
  /** API origin, e.g. http://localhost:4000 (requests go to `${apiUrl}/api/v1`). */
  apiUrl: string;
  /** Web app origin for approval links, e.g. http://localhost:3000; null gives app-relative paths. */
  appUrl: string | null;
  email: string;
  password: string;
  /** Per-request timeout; research can take a while when it calls real market data and models. */
  timeoutMs: number;
}

export class ConfigError extends Error {
  override name = "ConfigError";
}

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/**
 * Parses an origin, refusing plain HTTP to anything but this machine: the session cookie and the
 * sign-in password must not cross a network unencrypted.
 */
function origin(name: string, raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ConfigError(`${name} must be an absolute URL such as http://localhost:4000.`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new ConfigError(`${name} must use http or https.`);
  if (url.protocol === "http:" && !LOOPBACK.has(url.hostname)) {
    throw new ConfigError(`${name} must use https unless it points at this machine (localhost).`);
  }
  if (url.username || url.password) throw new ConfigError(`${name} must not contain credentials.`);
  // Accept either the origin or the versioned API base.
  const path = url.pathname.replace(/\/+$/, "").replace(/\/api\/v1$/, "");
  return `${url.origin}${path}`;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): McpConfig {
  const apiUrl = env.QM_API_URL?.trim();
  const email = env.QM_EMAIL?.trim();
  const password = env.QM_PASSWORD;
  const missing = [!apiUrl && "QM_API_URL", !email && "QM_EMAIL", !password && "QM_PASSWORD"].filter(Boolean);
  if (missing.length > 0) throw new ConfigError(`Missing environment variables: ${missing.join(", ")}.`);
  const appUrl = env.QM_APP_URL?.trim();
  const timeout = env.QM_TIMEOUT_MS ? Number(env.QM_TIMEOUT_MS) : 180_000;
  if (!Number.isInteger(timeout) || timeout < 1_000 || timeout > 600_000) {
    throw new ConfigError("QM_TIMEOUT_MS must be a whole number of milliseconds between 1000 and 600000.");
  }
  return {
    apiUrl: origin("QM_API_URL", apiUrl!),
    appUrl: appUrl ? origin("QM_APP_URL", appUrl) : null,
    email: email!,
    password: password!,
    timeoutMs: timeout,
  };
}
