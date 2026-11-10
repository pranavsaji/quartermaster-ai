import type { AuthSchemes } from "../auth-schemes.js";
import { ApiError, type Declared, type Undeclared } from "../core/api-error.js";
import type { ApiPromise } from "../core/api-promise.js";
import type { RequestOptions } from "../core/api-request.js";
import { anyAuth } from "../core/auth/schemes.js";
import type { RawClient } from "../core/raw-client.js";
import type { ErrorDecoders } from "../core/response-decoder.js";
import { uuid } from "../core/uuid.js";
import * as s from "../core/validation/index.js";
import { alertTestResponseSchema, type AlertTestResponse } from "../models/alert-test-response.js";
import { apiErrorModelSchema, type ApiErrorModel } from "../models/api-error-model.js";
import {
  opsErrorsResolveResponseSchema,
  type OpsErrorsResolveResponse,
} from "../models/ops-errors-resolve-response.js";
import { opsErrorsResponseSchema, type OpsErrorsResponse } from "../models/ops-errors-response.js";
import { opsHealthDtoSchema, type OpsHealthDto } from "../models/ops-health-dto.js";
import { xRequestedWithSchema, type XRequestedWith } from "../models/xrequested-with.js";
import type { Servers } from "../servers.js";

/**
 * Platform health and error tracking (operators only).
 */
export class Operations {
  readonly #rawClient: RawClient;
  readonly #servers: Servers;
  readonly #auth: AuthSchemes;

  constructor(rawClient: RawClient, servers: Servers, auth: AuthSchemes) {
    this.#rawClient = rawClient;
    this.#servers = servers;
    this.#auth = auth;
  }

  /**
   * Platform health (operators)
   *
   * @remarks
   * Platform health (operators).
   *
   * @returns Platform health (operators)
   *
   * @throws {@link Operations.GetPlatformHealthError} when the API answers with an error status —
   * narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  getPlatformHealth(options?: RequestOptions): ApiPromise<OpsHealthDto, Operations.GetPlatformHealthError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/ops/health"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: opsHealthDtoSchema },
        errorFactory: Operations.GetPlatformHealthError,
      },
      options,
    );
  }

  /**
   * Tracked error groups (operators)
   *
   * @remarks
   * Tracked error groups (operators).
   *
   * @returns Tracked error groups (operators)
   *
   * @throws {@link Operations.ListTrackedErrorsError} when the API answers with an error status —
   * narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  listTrackedErrors(
    options?: RequestOptions,
  ): ApiPromise<OpsErrorsResponse, Operations.ListTrackedErrorsError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/ops/errors"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: opsErrorsResponseSchema },
        errorFactory: Operations.ListTrackedErrorsError,
      },
      options,
    );
  }

  /**
   * Resolve an error group; it reopens and alerts if it recurs
   *
   * @remarks
   * Resolve an error group; it reopens and alerts if it recurs.
   *
   * @returns Resolve an error group; it reopens and alerts if it recurs
   *
   * @throws {@link Operations.ResolveTrackedErrorError} when the API answers with an error status —
   * narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  resolveTrackedError(
    request: Operations.ResolveTrackedErrorRequest,
    options?: RequestOptions,
  ): ApiPromise<OpsErrorsResolveResponse, Operations.ResolveTrackedErrorError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/ops/errors/{id}/resolve"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [{ name: "id", value: request.id, schema: s.string() }],
        query: [],
        headers: [
          { name: "X-Requested-With", value: request.xRequestedWith, schema: xRequestedWithSchema },
          { name: "Idempotency-Key", value: uuid(), schema: s.string() },
        ],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: opsErrorsResolveResponseSchema },
        errorFactory: Operations.ResolveTrackedErrorError,
      },
      options,
    );
  }

  /**
   * Send a test alert to every configured channel
   *
   * @remarks
   * Send a test alert to every configured channel.
   *
   * @returns Send a test alert to every configured channel
   *
   * @throws {@link Operations.SendTestAlertError} when the API answers with an error status —
   * narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  sendTestAlert(
    request: Operations.SendTestAlertRequest,
    options?: RequestOptions,
  ): ApiPromise<AlertTestResponse, Operations.SendTestAlertError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/ops/alerts/test"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [],
        query: [],
        headers: [
          { name: "X-Requested-With", value: request.xRequestedWith, schema: xRequestedWithSchema },
          { name: "Idempotency-Key", value: uuid(), schema: s.string() },
        ],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: alertTestResponseSchema },
        errorFactory: Operations.SendTestAlertError,
      },
      options,
    );
  }
}

export namespace Operations {
  export class GetPlatformHealthError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<GetPlatformHealthError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export class ListTrackedErrorsError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<ListTrackedErrorsError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type ResolveTrackedErrorRequest = {
    /** Resource id (UUID). */
    id: string;
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
  };

  export class ResolveTrackedErrorError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<ResolveTrackedErrorError> = [
      { on: 401, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 404, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type SendTestAlertRequest = {
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
  };

  export class SendTestAlertError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<SendTestAlertError> = [
      { on: 401, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }
}
