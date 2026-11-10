# TypeScript SDK (/sdks/typescript)

[Download SDK](/__downloads/sdk/typescript.zip)

## Intro [#intro]

The Quartermaster AI + TrustRail API SDK provides access to the Quartermaster AI + TrustRail API REST APIs.

Autonomous procurement secured by TrustRail. Amounts are integer minor units (cents). Sign in with `POST /auth/login` (or `/auth/signup`): the API sets an httpOnly session cookie. Every mutation requires the header `X-Requested-With: quartermaster`; routes marked idempotent also require an `Idempotency-Key`. Errors share one shape (`ApiError`) with a stable `code`.

## Installation [#installation]

The SDK compiles to `dist/` before it can be referenced — run its `build` script once in the SDK folder, then add it to your project by path:

```bash
npm install <path-to-sdk>
```

## Quick Start [#quick-start]

Create one client and reuse it. Configure its behaviour through `ClientOptions`.

```ts
import { QuartermasterAiTrustRailApiClient, ServerEnvironment } from "quartermaster-ai-trust-rail-api";

const client = new QuartermasterAiTrustRailApiClient({
  serverEnvironment: ServerEnvironment.Hosted,
  session: "YOUR_API_KEY",
  secureSession: "YOUR_API_KEY",
});
```

Nothing in `ClientOptions` is required — `new QuartermasterAiTrustRailApiClient()` compiles — and each option left out falls back to its default. `serverEnvironment` is spelled out above so the environment a call reaches is visible where the client is built rather than inherited silently.

### From CommonJS [#from-commonjs]

The package ships both dialects from a single entry, so `require` works with full types. In a TypeScript CommonJS file use the `import ... = require(...)` form — a plain destructuring `require` runs fine but gives you `any`.

```ts
import sdk = require("quartermaster-ai-trust-rail-api");

const client = new sdk.QuartermasterAiTrustRailApiClient({
  serverEnvironment: sdk.ServerEnvironment.Hosted,
  session: "YOUR_API_KEY",
  secureSession: "YOUR_API_KEY",
});
```