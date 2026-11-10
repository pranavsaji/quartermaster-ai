import type { AuthSchemes } from "../auth-schemes.js";
import { ApiError, type Declared, type Undeclared } from "../core/api-error.js";
import type { ApiPromise } from "../core/api-promise.js";
import type { RequestOptions } from "../core/api-request.js";
import { anyAuth } from "../core/auth/schemes.js";
import type { RawClient } from "../core/raw-client.js";
import type { ErrorDecoders } from "../core/response-decoder.js";
import { uuid } from "../core/uuid.js";
import * as s from "../core/validation/index.js";
import { apiErrorModelSchema, type ApiErrorModel } from "../models/api-error-model.js";
import { approveRequestSchema, type ApproveRequest } from "../models/approve-request.js";
import {
  createProcurementRequestSchema,
  type CreateProcurementRequest,
} from "../models/create-procurement-request.js";
import {
  procurementRequestDtoSchema,
  type ProcurementRequestDto,
} from "../models/procurement-request-dto.js";
import {
  procurementRequestsApproveResponseSchema,
  type ProcurementRequestsApproveResponse,
} from "../models/procurement-requests-approve-response.js";
import {
  procurementRequestsResponseSchema,
  type ProcurementRequestsResponse,
} from "../models/procurement-requests-response.js";
import { rejectRequestSchema, type RejectRequest } from "../models/reject-request.js";
import { xRequestedWithSchema, type XRequestedWith } from "../models/xrequested-with.js";
import type { Servers } from "../servers.js";

/**
 * Natural-language requests, agent research, TrustRail evaluation and owner approval.
 */
export class Procurement {
  readonly #rawClient: RawClient;
  readonly #servers: Servers;
  readonly #auth: AuthSchemes;

  constructor(rawClient: RawClient, servers: Servers, auth: AuthSchemes) {
    this.#rawClient = rawClient;
    this.#servers = servers;
    this.#auth = auth;
  }

  /**
   * Approve an exact cart, sign an Intent Certificate and reserve budget
   *
   * @remarks
   * Approve an exact cart, sign an Intent Certificate and reserve budget. Requires the OWNER role.
   * Idempotent: send an `Idempotency-Key`.
   *
   * @returns Approve an exact cart, sign an Intent Certificate and reserve budget
   *
   * @throws {@link Procurement.ApproveProcurementRequestError} when the API answers with an error
   * status — narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  approveProcurementRequest(
    request: Procurement.ApproveProcurementRequestRequest,
    options?: RequestOptions,
  ): ApiPromise<ProcurementRequestsApproveResponse, Procurement.ApproveProcurementRequestError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/procurement/requests/{id}/approve"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [{ name: "id", value: request.id, schema: s.string() }],
        query: [],
        headers: [
          { name: "X-Requested-With", value: request.xRequestedWith, schema: xRequestedWithSchema },
          { name: "Idempotency-Key", value: request.idempotencyKey, schema: s.string() },
        ],
        body: { kind: "json", value: request.body, schema: approveRequestSchema },
      },
      {
        success: { kind: "json", schema: procurementRequestsApproveResponseSchema },
        errorFactory: Procurement.ApproveProcurementRequestError,
      },
      options,
    );
  }

  /**
   * Submit a natural-language request
   *
   * @remarks
   * Submit a natural-language request. Requires the MANAGER role. Idempotent: send an
   * `Idempotency-Key`.
   *
   * @returns Submit a natural-language request
   *
   * @throws {@link Procurement.CreateProcurementRequestError} when the API answers with an error
   * status — narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  createProcurementRequest(
    request: Procurement.CreateProcurementRequestRequest,
    options?: RequestOptions,
  ): ApiPromise<ProcurementRequestDto, Procurement.CreateProcurementRequestError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/procurement/requests"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [],
        query: [],
        headers: [
          { name: "X-Requested-With", value: request.xRequestedWith, schema: xRequestedWithSchema },
          { name: "Idempotency-Key", value: request.idempotencyKey, schema: s.string() },
        ],
        body: { kind: "json", value: request.body, schema: createProcurementRequestSchema },
      },
      {
        success: { kind: "json", schema: procurementRequestDtoSchema },
        errorFactory: Procurement.CreateProcurementRequestError,
      },
      options,
    );
  }

  /**
   * Re-run TrustRail on open proposals
   *
   * @remarks
   * Re-run TrustRail on open proposals. Requires the MANAGER role.
   *
   * @returns Re-run TrustRail on open proposals
   *
   * @throws {@link Procurement.EvaluateProcurementRequestError} when the API answers with an error
   * status — narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  evaluateProcurementRequest(
    request: Procurement.EvaluateProcurementRequestRequest,
    options?: RequestOptions,
  ): ApiPromise<ProcurementRequestDto, Procurement.EvaluateProcurementRequestError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/procurement/requests/{id}/evaluate"),
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
        success: { kind: "json", schema: procurementRequestDtoSchema },
        errorFactory: Procurement.EvaluateProcurementRequestError,
      },
      options,
    );
  }

  /**
   * Request with forecast, market evidence, candidates, proposals and TrustRail decisions
   *
   * @remarks
   * Request with forecast, market evidence, candidates, proposals and TrustRail decisions.
   *
   * @returns Request with forecast, market evidence, candidates, proposals and TrustRail decisions
   *
   * @throws {@link Procurement.GetProcurementRequestError} when the API answers with an error
   * status — narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  getProcurementRequest(
    request: Procurement.GetProcurementRequestRequest,
    options?: RequestOptions,
  ): ApiPromise<ProcurementRequestDto, Procurement.GetProcurementRequestError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/procurement/requests/{id}"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [{ name: "id", value: request.id, schema: s.string() }],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: procurementRequestDtoSchema },
        errorFactory: Procurement.GetProcurementRequestError,
      },
      options,
    );
  }

  /**
   * List procurement requests
   *
   * @remarks
   * List procurement requests.
   *
   * @returns List procurement requests
   *
   * @throws {@link Procurement.ListProcurementRequestsError} when the API answers with an error
   * status — narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  listProcurementRequests(
    options?: RequestOptions,
  ): ApiPromise<ProcurementRequestsResponse, Procurement.ListProcurementRequestsError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/procurement/requests"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: procurementRequestsResponseSchema },
        errorFactory: Procurement.ListProcurementRequestsError,
      },
      options,
    );
  }

  /**
   * Reject one proposal (purchase_order_id) or every open proposal
   *
   * @remarks
   * Reject one proposal (purchase_order_id) or every open proposal. Requires the OWNER role.
   *
   * @returns Reject one proposal (purchase_order_id) or every open proposal
   *
   * @throws {@link Procurement.RejectProcurementRequestError} when the API answers with an error
   * status — narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  rejectProcurementRequest(
    request: Procurement.RejectProcurementRequestRequest,
    options?: RequestOptions,
  ): ApiPromise<ProcurementRequestDto, Procurement.RejectProcurementRequestError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/procurement/requests/{id}/reject"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [{ name: "id", value: request.id, schema: s.string() }],
        query: [],
        headers: [
          { name: "X-Requested-With", value: request.xRequestedWith, schema: xRequestedWithSchema },
          { name: "Idempotency-Key", value: uuid(), schema: s.string() },
        ],
        body: { kind: "json", value: request.body, schema: rejectRequestSchema },
      },
      {
        success: { kind: "json", schema: procurementRequestDtoSchema },
        errorFactory: Procurement.RejectProcurementRequestError,
      },
      options,
    );
  }

  /**
   * Run forecasting, Channel3 research, comparison, planning and TrustRail evaluation
   *
   * @remarks
   * Run forecasting, Channel3 research, comparison, planning and TrustRail evaluation. Requires the
   * MANAGER role.
   *
   * @returns Run forecasting, Channel3 research, comparison, planning and TrustRail evaluation
   *
   * @throws {@link Procurement.ResearchProcurementRequestError} when the API answers with an error
   * status — narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  researchProcurementRequest(
    request: Procurement.ResearchProcurementRequestRequest,
    options?: RequestOptions,
  ): ApiPromise<ProcurementRequestDto, Procurement.ResearchProcurementRequestError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/procurement/requests/{id}/research"),
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
        success: { kind: "json", schema: procurementRequestDtoSchema },
        errorFactory: Procurement.ResearchProcurementRequestError,
      },
      options,
    );
  }
}

export namespace Procurement {
  export type ApproveProcurementRequestRequest = {
    /** Resource id (UUID). */
    id: string;
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
    /** A unique key per user action; retries with the same key return the first result. */
    idempotencyKey: string;
    /** The owner's approval of one exact proposal, bound to the cart hash they saw. */
    body: ApproveRequest;
  };

  export class ApproveProcurementRequestError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Declared<"apiErrorModel6", ApiErrorModel>
      | Declared<"apiErrorModel7", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<ApproveProcurementRequestError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 404, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 422, kind: "apiErrorModel6", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel7", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type CreateProcurementRequestRequest = {
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
    /** A unique key per user action; retries with the same key return the first result. */
    idempotencyKey: string;
    /** A natural-language purchasing instruction for the agent. */
    body: CreateProcurementRequest;
  };

  export class CreateProcurementRequestError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Declared<"apiErrorModel6", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<CreateProcurementRequestError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 422, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel6", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type EvaluateProcurementRequestRequest = {
    /** Resource id (UUID). */
    id: string;
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
  };

  export class EvaluateProcurementRequestError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<EvaluateProcurementRequestError> = [
      { on: 401, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 404, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type GetProcurementRequestRequest = {
    /** Resource id (UUID). */
    id: string;
  };

  export class GetProcurementRequestError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<GetProcurementRequestError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 404, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export class ListProcurementRequestsError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<ListProcurementRequestsError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type RejectProcurementRequestRequest = {
    /** Resource id (UUID). */
    id: string;
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
    /** Reject one proposal, or every open proposal on the request. */
    body: RejectRequest;
  };

  export class RejectProcurementRequestError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Declared<"apiErrorModel6", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<RejectProcurementRequestError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 404, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel6", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type ResearchProcurementRequestRequest = {
    /** Resource id (UUID). */
    id: string;
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
  };

  export class ResearchProcurementRequestError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<ResearchProcurementRequestError> = [
      { on: 401, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 404, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }
}
