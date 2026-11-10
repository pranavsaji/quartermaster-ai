import type { TokenProvider } from "./core/auth/credentials.js";
import type { CoreClientOptions } from "./core/client-options.js";
import { ServerEnvironment } from "./servers.js";

export type ClientOptions = SdkClientOptions & CoreClientOptions;

type SdkClientOptions = ServerOptions & {
  /** Session cookie set by sign-in on local development servers. */
  readonly session?: TokenProvider | undefined;
  /** Session cookie set by sign-in on HTTPS deployments (the hosted demo). */
  readonly secureSession?: TokenProvider | undefined;
};

type ServerOptions =
  | {
      readonly serverEnvironment?: typeof ServerEnvironment.Hosted;
      /** Hosted demo (PayPal sandbox) */
      readonly serverOptions?: {
        baseUrl?: string;
      };
    }
  | {
      readonly serverEnvironment: typeof ServerEnvironment.Local;
      /** Hosted demo (PayPal sandbox) */
      readonly serverOptions?: {
        baseUrl?: string;
      };
    };
