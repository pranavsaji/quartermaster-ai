import type { ClientOptions } from "./client-options.js";
import type { AuthScheme } from "./core/api-request.js";
import { apiKeyCookieAuth } from "./core/auth/schemes.js";

export type AuthSchemes = {
  readonly session: AuthScheme;
  readonly secureSession: AuthScheme;
};

export function buildAuthSchemes(options: ClientOptions): AuthSchemes {
  return {
    session: apiKeyCookieAuth({ name: "qm_session", token: options.session }),
    secureSession: apiKeyCookieAuth({ name: "__Host-qm_session", token: options.secureSession }),
  };
}
