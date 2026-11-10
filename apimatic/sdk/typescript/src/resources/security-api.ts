import type { AuthSchemes } from "../auth-schemes.js";
import { ApiError, type Declared, type Undeclared } from "../core/api-error.js";
import type { ApiPromise } from "../core/api-promise.js";
import type { RequestOptions } from "../core/api-request.js";
import { anyAuth } from "../core/auth/schemes.js";
import type { RawClient } from "../core/raw-client.js";
import type { ErrorDecoders } from "../core/response-decoder.js";
import { apiErrorModelSchema, type ApiErrorModel } from "../models/api-error-model.js";
import {
  auditChainVerificationDtoSchema,
  type AuditChainVerificationDto,
} from "../models/audit-chain-verification-dto.js";
import {
  securityAuditResponseSchema,
  type SecurityAuditResponse,
} from "../models/security-audit-response.js";
import {
  securityDecisionsResponseSchema,
  type SecurityDecisionsResponse,
} from "../models/security-decisions-response.js";
import {
  securityEventsResponseSchema,
  type SecurityEventsResponse,
} from "../models/security-events-response.js";
import {
  securityPaypalNotificationsResponseSchema,
  type SecurityPaypalNotificationsResponse,
} from "../models/security-paypal-notifications-response.js";
import type { Servers } from "../servers.js";

/**
 * Findings, policy decisions, the hash-chained audit log and PayPal notification health.
 */
export class SecurityApi {
  readonly #rawClient: RawClient;
  readonly #servers: Servers;
  readonly #auth: AuthSchemes;

  constructor(rawClient: RawClient, servers: Servers, auth: AuthSchemes) {
    this.#rawClient = rawClient;
    this.#servers = servers;
    this.#auth = auth;
  }

  /**
   * Whether PayPal's signed notifications are arriving
   *
   * @remarks
   * Whether PayPal's signed notifications are arriving.
   *
   * @returns Whether PayPal's signed notifications are arriving
   *
   * @throws {@link SecurityApi.GetPayPalNotificationStatusError} when the API answers with an error
   * status — narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  getPayPalNotificationStatus(
    options?: RequestOptions,
  ): ApiPromise<SecurityPaypalNotificationsResponse, SecurityApi.GetPayPalNotificationStatusError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/security/paypal-notifications"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: securityPaypalNotificationsResponseSchema },
        errorFactory: SecurityApi.GetPayPalNotificationStatusError,
      },
      options,
    );
  }

  /**
   * Hash-chained audit log
   *
   * @remarks
   * Hash-chained audit log.
   *
   * @returns Hash-chained audit log
   *
   * @throws {@link SecurityApi.ListAuditEventsError} when the API answers with an error status —
   * narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  listAuditEvents(
    options?: RequestOptions,
  ): ApiPromise<SecurityAuditResponse, SecurityApi.ListAuditEventsError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/security/audit"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: securityAuditResponseSchema },
        errorFactory: SecurityApi.ListAuditEventsError,
      },
      options,
    );
  }

  /**
   * Policy decisions
   *
   * @remarks
   * Policy decisions.
   *
   * @returns Policy decisions
   *
   * @throws {@link SecurityApi.ListPolicyDecisionsError} when the API answers with an error status
   * — narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  listPolicyDecisions(
    options?: RequestOptions,
  ): ApiPromise<SecurityDecisionsResponse, SecurityApi.ListPolicyDecisionsError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/security/decisions"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: securityDecisionsResponseSchema },
        errorFactory: SecurityApi.ListPolicyDecisionsError,
      },
      options,
    );
  }

  /**
   * TrustRail findings and evidence
   *
   * @remarks
   * TrustRail findings and evidence.
   *
   * @returns TrustRail findings and evidence
   *
   * @throws {@link SecurityApi.ListSecurityFindingsError} when the API answers with an error status
   * — narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  listSecurityFindings(
    options?: RequestOptions,
  ): ApiPromise<SecurityEventsResponse, SecurityApi.ListSecurityFindingsError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/security/events"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: securityEventsResponseSchema },
        errorFactory: SecurityApi.ListSecurityFindingsError,
      },
      options,
    );
  }

  /**
   * Verify the audit hash chain
   *
   * @remarks
   * Verify the audit hash chain. Requires the MANAGER role.
   *
   * @returns Verify the audit hash chain
   *
   * @throws {@link SecurityApi.VerifyAuditChainError} when the API answers with an error status —
   * narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  verifyAuditChain(
    options?: RequestOptions,
  ): ApiPromise<AuditChainVerificationDto, SecurityApi.VerifyAuditChainError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/security/audit/verify"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: auditChainVerificationDtoSchema },
        errorFactory: SecurityApi.VerifyAuditChainError,
      },
      options,
    );
  }
}

export namespace SecurityApi {
  export class GetPayPalNotificationStatusError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<GetPayPalNotificationStatusError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export class ListAuditEventsError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<ListAuditEventsError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export class ListPolicyDecisionsError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<ListPolicyDecisionsError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export class ListSecurityFindingsError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<ListSecurityFindingsError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export class VerifyAuditChainError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<VerifyAuditChainError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }
}
