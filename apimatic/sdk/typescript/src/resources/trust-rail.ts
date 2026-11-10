import type { AuthSchemes } from "../auth-schemes.js";
import { ApiError, type Declared, type Undeclared } from "../core/api-error.js";
import type { ApiPromise } from "../core/api-promise.js";
import type { RequestOptions } from "../core/api-request.js";
import { anyAuth } from "../core/auth/schemes.js";
import type { RawClient } from "../core/raw-client.js";
import type { ErrorDecoders } from "../core/response-decoder.js";
import * as s from "../core/validation/index.js";
import { apiErrorModelSchema, type ApiErrorModel } from "../models/api-error-model.js";
import {
  certificateVerificationDtoSchema,
  type CertificateVerificationDto,
} from "../models/certificate-verification-dto.js";
import {
  mandateUpdateResponseSchema,
  type MandateUpdateResponse,
} from "../models/mandate-update-response.js";
import {
  mandatesCurrentResponseSchema,
  type MandatesCurrentResponse,
} from "../models/mandates-current-response.js";
import { spendMandateInputSchema, type SpendMandateInput } from "../models/spend-mandate-input.js";
import { xRequestedWithSchema, type XRequestedWith } from "../models/xrequested-with.js";
import type { Servers } from "../servers.js";

/**
 * TrustRail
 */
export class TrustRail {
  readonly #rawClient: RawClient;
  readonly #servers: Servers;
  readonly #auth: AuthSchemes;

  constructor(rawClient: RawClient, servers: Servers, auth: AuthSchemes) {
    this.#rawClient = rawClient;
    this.#servers = servers;
    this.#auth = auth;
  }

  /**
   * Active Spend Mandate and weekly budget
   *
   * @remarks
   * Active Spend Mandate and weekly budget.
   *
   * @returns Active Spend Mandate and weekly budget
   *
   * @throws {@link TrustRail.GetSpendMandateError} when the API answers with an error status —
   * narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  getSpendMandate(
    options?: RequestOptions,
  ): ApiPromise<MandatesCurrentResponse, TrustRail.GetSpendMandateError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/mandates/current"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: mandatesCurrentResponseSchema },
        errorFactory: TrustRail.GetSpendMandateError,
      },
      options,
    );
  }

  /**
   * Publish a new mandate version (revokes approvals if tightened)
   *
   * @remarks
   * Publish a new mandate version (revokes approvals if tightened). Requires the OWNER role.
   * Idempotent: send an `Idempotency-Key`.
   *
   * @returns Publish a new mandate version (revokes approvals if tightened)
   *
   * @throws {@link TrustRail.UpdateSpendMandateError} when the API answers with an error status —
   * narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  updateSpendMandate(
    request: TrustRail.UpdateSpendMandateRequest,
    options?: RequestOptions,
  ): ApiPromise<MandateUpdateResponse, TrustRail.UpdateSpendMandateError> {
    return this.#rawClient.execute(
      {
        method: "PUT",
        urlTemplate: this.#servers.default("/mandates/current"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [],
        query: [],
        headers: [
          { name: "X-Requested-With", value: request.xRequestedWith, schema: xRequestedWithSchema },
          { name: "Idempotency-Key", value: request.idempotencyKey, schema: s.string() },
        ],
        body: { kind: "json", value: request.body, schema: spendMandateInputSchema },
      },
      {
        success: { kind: "json", schema: mandateUpdateResponseSchema },
        errorFactory: TrustRail.UpdateSpendMandateError,
      },
      options,
    );
  }

  /**
   * Verify an Intent Certificate against the live cart
   *
   * @remarks
   * Verify an Intent Certificate against the live cart.
   *
   * @returns Verify an Intent Certificate against the live cart
   *
   * @throws {@link TrustRail.VerifyIntentCertificateError} when the API answers with an error
   * status — narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  verifyIntentCertificate(
    request: TrustRail.VerifyIntentCertificateRequest,
    options?: RequestOptions,
  ): ApiPromise<CertificateVerificationDto, TrustRail.VerifyIntentCertificateError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/intents/{id}/verify"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [{ name: "id", value: request.id, schema: s.string() }],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: certificateVerificationDtoSchema },
        errorFactory: TrustRail.VerifyIntentCertificateError,
      },
      options,
    );
  }
}

export namespace TrustRail {
  export class GetSpendMandateError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<GetSpendMandateError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type UpdateSpendMandateRequest = {
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
    /** A unique key per user action; retries with the same key return the first result. */
    idempotencyKey: string;
    /** A new Spend Mandate version (optimistic concurrency on `expected_version`). */
    body: SpendMandateInput;
  };

  export class UpdateSpendMandateError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Declared<"apiErrorModel6", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<UpdateSpendMandateError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 422, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel6", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type VerifyIntentCertificateRequest = {
    /** Resource id (UUID). */
    id: string;
  };

  export class VerifyIntentCertificateError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<VerifyIntentCertificateError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 404, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }
}
