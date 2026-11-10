import { ApiError, type Declared, type Undeclared } from "../core/api-error.js";
import type { ApiPromise } from "../core/api-promise.js";
import type { RequestOptions } from "../core/api-request.js";
import { noneAuth } from "../core/auth/schemes.js";
import type { RawClient } from "../core/raw-client.js";
import type { ErrorDecoders } from "../core/response-decoder.js";
import { uuid } from "../core/uuid.js";
import * as s from "../core/validation/index.js";
import { apiErrorModelSchema, type ApiErrorModel } from "../models/api-error-model.js";
import { clientErrorReportSchema, type ClientErrorReport } from "../models/client-error-report.js";
import { clientErrorsResponseSchema, type ClientErrorsResponse } from "../models/client-errors-response.js";
import { publicConfigSchema, type PublicConfig } from "../models/public-config.js";
import { xRequestedWithSchema, type XRequestedWith } from "../models/xrequested-with.js";
import type { Servers } from "../servers.js";

/**
 * Public configuration and browser error reports.
 */
export class System {
  readonly #rawClient: RawClient;
  readonly #servers: Servers;

  constructor(rawClient: RawClient, servers: Servers) {
    this.#rawClient = rawClient;
    this.#servers = servers;
  }

  /**
   * Feature flags and PayPal client id
   *
   * @remarks
   * Feature flags and PayPal client id.
   *
   * @returns Feature flags and PayPal client id
   *
   * @throws {@link System.GetPublicConfigError} when the API answers with an error status — narrow
   * on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  getPublicConfig(options?: RequestOptions): ApiPromise<PublicConfig, System.GetPublicConfigError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/config/public"),
        auth: noneAuth,
        pathParams: [],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: publicConfigSchema },
        errorFactory: System.GetPublicConfigError,
      },
      options,
    );
  }

  /**
   * Report a browser error to error tracking
   *
   * @remarks
   * Report a browser error to error tracking.
   *
   * @returns Report a browser error to error tracking
   *
   * @throws {@link System.ReportClientErrorError} when the API answers with an error status —
   * narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  reportClientError(
    request: System.ReportClientErrorRequest,
    options?: RequestOptions,
  ): ApiPromise<ClientErrorsResponse, System.ReportClientErrorError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/client-errors"),
        auth: noneAuth,
        pathParams: [],
        query: [],
        headers: [
          { name: "X-Requested-With", value: request.xRequestedWith, schema: xRequestedWithSchema },
          { name: "Idempotency-Key", value: uuid(), schema: s.string() },
        ],
        body: { kind: "json", value: request.body, schema: clientErrorReportSchema },
      },
      {
        success: { kind: "json", schema: clientErrorsResponseSchema },
        errorFactory: System.ReportClientErrorError,
      },
      options,
    );
  }
}

export namespace System {
  export class GetPublicConfigError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<GetPublicConfigError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type ReportClientErrorRequest = {
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
    /** A browser error reported for error tracking. */
    body: ClientErrorReport;
  };

  export class ReportClientErrorError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<ReportClientErrorError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }
}
