import { buildAuthSchemes, type AuthSchemes } from "./auth-schemes.js";
import type { ClientOptions } from "./client-options.js";
import { buildCoreClientOptions } from "./core/client-options.js";
import { RawClient } from "./core/raw-client.js";
import * as host from "./core/runtime-environment.js";
import * as s from "./core/validation/index.js";
import { AccountsApi } from "./resources/accounts-api.js";
import { Analytics } from "./resources/analytics.js";
import { InventoryApi } from "./resources/inventory-api.js";
import { Operations } from "./resources/operations.js";
import { Orders } from "./resources/orders.js";
import { PaymentsApi } from "./resources/payments-api.js";
import { Procurement } from "./resources/procurement.js";
import { SecurityApi } from "./resources/security-api.js";
import { Suppliers } from "./resources/suppliers.js";
import { System } from "./resources/system.js";
import { Team } from "./resources/team.js";
import { TrustRail } from "./resources/trust-rail.js";
import { buildServers, type Servers } from "./servers.js";

/**
 * Autonomous procurement secured by TrustRail. Amounts are integer minor units (cents). Sign in
 * with `POST /auth/login` (or `/auth/signup`): the API sets an httpOnly session cookie. Every
 * mutation requires the header `X-Requested-With: quartermaster`; routes marked idempotent also
 * require an `Idempotency-Key`. Errors share one shape (`ApiError`) with a stable `code`.
 */
export class QuartermasterAiTrustRailApiClient {
  readonly #rawClient: RawClient;
  readonly #servers: Servers;
  readonly #auth: AuthSchemes;
  #system?: System;
  #accountsApi?: AccountsApi;
  #team?: Team;
  #inventoryApi?: InventoryApi;
  #suppliers?: Suppliers;
  #procurement?: Procurement;
  #trustRail?: TrustRail;
  #paymentsApi?: PaymentsApi;
  #orders?: Orders;
  #securityApi?: SecurityApi;
  #analytics?: Analytics;
  #operations?: Operations;

  constructor(options: ClientOptions = {}) {
    this.#rawClient = new RawClient({
      ...buildCoreClientOptions(options, "QUARTERMASTER_AI_TRUST_RAIL_API_CLIENT_LOG"),
      defaultHeaders: [
        {
          name: "User-Agent",
          value: "QuartermasterAiTrustRailApiClient/1.0.0 TypeScript",
          schema: s.string(),
        },
        { name: "X-APIMatic-Lang", value: "TypeScript", schema: s.string() },
        { name: "X-APIMatic-Package-Version", value: "1.0.0", schema: s.string() },
        { name: "X-APIMatic-Gen-Version", value: "4.0.0", schema: s.string() },
        { name: "X-APIMatic-OS", value: host.operatingSystem(), schema: s.optional(s.string()) },
        { name: "X-APIMatic-Runtime", value: host.runtimeDescription(), schema: s.optional(s.string()) },
      ],
      defaultQuery: [],
      defaultPathParams: [],
    });

    this.#servers = buildServers(options);

    this.#auth = buildAuthSchemes(options);
  }

  /**
   * Public configuration and browser error reports.
   */
  get system(): System {
    return (this.#system ??= new System(this.#rawClient, this.#servers));
  }

  /**
   * Sign-up, sign-in (httpOnly session cookie), password reset and change.
   */
  get accountsApi(): AccountsApi {
    return (this.#accountsApi ??= new AccountsApi(this.#rawClient, this.#servers, this.#auth));
  }

  /**
   * Members, roles and one-time invitation links.
   */
  get team(): Team {
    return (this.#team ??= new Team(this.#rawClient, this.#servers, this.#auth));
  }

  /**
   * Stock levels, adjustments and the reorder forecast.
   */
  get inventoryApi(): InventoryApi {
    return (this.#inventoryApi ??= new InventoryApi(this.#rawClient, this.#servers, this.#auth));
  }

  /**
   * Suppliers, their fee terms and catalog listings (screened for prompt injection).
   */
  get suppliers(): Suppliers {
    return (this.#suppliers ??= new Suppliers(this.#rawClient, this.#servers, this.#auth));
  }

  /**
   * Natural-language requests, agent research, TrustRail evaluation and owner approval.
   */
  get procurement(): Procurement {
    return (this.#procurement ??= new Procurement(this.#rawClient, this.#servers, this.#auth));
  }

  /**
   * TrustRail
   */
  get trustRail(): TrustRail {
    return (this.#trustRail ??= new TrustRail(this.#rawClient, this.#servers, this.#auth));
  }

  /**
   * Intent Certificates and PayPal (sandbox) orders, captures and refunds.
   */
  get paymentsApi(): PaymentsApi {
    return (this.#paymentsApi ??= new PaymentsApi(this.#rawClient, this.#servers, this.#auth));
  }

  /**
   * Purchase orders, deliveries and invoices.
   */
  get orders(): Orders {
    return (this.#orders ??= new Orders(this.#rawClient, this.#servers, this.#auth));
  }

  /**
   * Findings, policy decisions, the hash-chained audit log and PayPal notification health.
   */
  get securityApi(): SecurityApi {
    return (this.#securityApi ??= new SecurityApi(this.#rawClient, this.#servers, this.#auth));
  }

  /**
   * Spend, budget and security outcomes.
   */
  get analytics(): Analytics {
    return (this.#analytics ??= new Analytics(this.#rawClient, this.#servers, this.#auth));
  }

  /**
   * Platform health and error tracking (operators only).
   */
  get operations(): Operations {
    return (this.#operations ??= new Operations(this.#rawClient, this.#servers, this.#auth));
  }
}
