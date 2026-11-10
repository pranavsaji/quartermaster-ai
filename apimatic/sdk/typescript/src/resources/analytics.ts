import type { AuthSchemes } from "../auth-schemes.js";
import { ApiError, type Declared, type Undeclared } from "../core/api-error.js";
import type { ApiPromise } from "../core/api-promise.js";
import type { RequestOptions } from "../core/api-request.js";
import { anyAuth } from "../core/auth/schemes.js";
import type { RawClient } from "../core/raw-client.js";
import type { ErrorDecoders } from "../core/response-decoder.js";
import { analyticsSummaryDtoSchema, type AnalyticsSummaryDto } from "../models/analytics-summary-dto.js";
import { apiErrorModelSchema, type ApiErrorModel } from "../models/api-error-model.js";
import type { Servers } from "../servers.js";

/**
 * Spend, budget and security outcomes.
 */
export class Analytics {
  readonly #rawClient: RawClient;
  readonly #servers: Servers;
  readonly #auth: AuthSchemes;

  constructor(rawClient: RawClient, servers: Servers, auth: AuthSchemes) {
    this.#rawClient = rawClient;
    this.#servers = servers;
    this.#auth = auth;
  }

  /**
   * Business and security outcomes
   *
   * @remarks
   * Business and security outcomes.
   *
   * @returns Business and security outcomes
   *
   * @throws {@link Analytics.GetAnalyticsSummaryError} when the API answers with an error status —
   * narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  getAnalyticsSummary(
    options?: RequestOptions,
  ): ApiPromise<AnalyticsSummaryDto, Analytics.GetAnalyticsSummaryError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/analytics/summary"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: analyticsSummaryDtoSchema },
        errorFactory: Analytics.GetAnalyticsSummaryError,
      },
      options,
    );
  }
}

export namespace Analytics {
  export class GetAnalyticsSummaryError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<GetAnalyticsSummaryError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }
}
