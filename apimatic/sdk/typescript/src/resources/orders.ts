import type { AuthSchemes } from "../auth-schemes.js";
import { ApiError, type Declared, type Undeclared } from "../core/api-error.js";
import type { ApiPromise } from "../core/api-promise.js";
import type { RequestOptions } from "../core/api-request.js";
import { anyAuth } from "../core/auth/schemes.js";
import type { RawClient } from "../core/raw-client.js";
import type { ErrorDecoders } from "../core/response-decoder.js";
import { uuid } from "../core/uuid.js";
import * as s from "../core/validation/index.js";
import {
  analyzeInvoiceRequestSchema,
  type AnalyzeInvoiceRequest,
} from "../models/analyze-invoice-request.js";
import { apiErrorModelSchema, type ApiErrorModel } from "../models/api-error-model.js";
import { delayDeliveryRequestSchema, type DelayDeliveryRequest } from "../models/delay-delivery-request.js";
import {
  deliveriesDelayResponseSchema,
  type DeliveriesDelayResponse,
} from "../models/deliveries-delay-response.js";
import {
  deliveriesReceiveResponseSchema,
  type DeliveriesReceiveResponse,
} from "../models/deliveries-receive-response.js";
import { deliveriesResponseSchema, type DeliveriesResponse } from "../models/deliveries-response.js";
import { invoiceDtoSchema, type InvoiceDto } from "../models/invoice-dto.js";
import { invoicesResponseSchema, type InvoicesResponse } from "../models/invoices-response.js";
import { purchaseOrderDtoSchema, type PurchaseOrderDto } from "../models/purchase-order-dto.js";
import {
  purchaseOrdersResponseSchema,
  type PurchaseOrdersResponse,
} from "../models/purchase-orders-response.js";
import {
  receiveDeliveryRequestSchema,
  type ReceiveDeliveryRequest,
} from "../models/receive-delivery-request.js";
import { xRequestedWithSchema, type XRequestedWith } from "../models/xrequested-with.js";
import type { Servers } from "../servers.js";

/**
 * Purchase orders, deliveries and invoices.
 */
export class Orders {
  readonly #rawClient: RawClient;
  readonly #servers: Servers;
  readonly #auth: AuthSchemes;

  constructor(rawClient: RawClient, servers: Servers, auth: AuthSchemes) {
    this.#rawClient = rawClient;
    this.#servers = servers;
    this.#auth = auth;
  }

  /**
   * Three-way match and duplicate detection
   *
   * @remarks
   * Three-way match and duplicate detection. Requires the MANAGER role. Idempotent: send an
   * `Idempotency-Key`.
   *
   * @returns Three-way match and duplicate detection
   *
   * @throws {@link Orders.AnalyzeInvoiceError} when the API answers with an error status — narrow
   * on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  analyzeInvoice(
    request: Orders.AnalyzeInvoiceRequestParams,
    options?: RequestOptions,
  ): ApiPromise<InvoiceDto, Orders.AnalyzeInvoiceError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/invoices/analyze"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [],
        query: [],
        headers: [
          { name: "X-Requested-With", value: request.xRequestedWith, schema: xRequestedWithSchema },
          { name: "Idempotency-Key", value: request.idempotencyKey, schema: s.string() },
        ],
        body: { kind: "json", value: request.body, schema: analyzeInvoiceRequestSchema },
      },
      {
        success: { kind: "json", schema: invoiceDtoSchema },
        errorFactory: Orders.AnalyzeInvoiceError,
      },
      options,
    );
  }

  /**
   * Record a supplier delay
   *
   * @remarks
   * Record a supplier delay. Requires the MANAGER role.
   *
   * @returns Record a supplier delay
   *
   * @throws {@link Orders.DelayDeliveryError} when the API answers with an error status — narrow on
   * `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  delayDelivery(
    request: Orders.DelayDeliveryRequestParams,
    options?: RequestOptions,
  ): ApiPromise<DeliveriesDelayResponse, Orders.DelayDeliveryError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/deliveries/{id}/delay"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [{ name: "id", value: request.id, schema: s.string() }],
        query: [],
        headers: [
          { name: "X-Requested-With", value: request.xRequestedWith, schema: xRequestedWithSchema },
          { name: "Idempotency-Key", value: uuid(), schema: s.string() },
        ],
        body: { kind: "json", value: request.body, schema: delayDeliveryRequestSchema },
      },
      {
        success: { kind: "json", schema: deliveriesDelayResponseSchema },
        errorFactory: Orders.DelayDeliveryError,
      },
      options,
    );
  }

  /**
   * One purchase order
   *
   * @remarks
   * One purchase order.
   *
   * @returns One purchase order
   *
   * @throws {@link Orders.GetPurchaseOrderError} when the API answers with an error status — narrow
   * on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  getPurchaseOrder(
    request: Orders.GetPurchaseOrderRequest,
    options?: RequestOptions,
  ): ApiPromise<PurchaseOrderDto, Orders.GetPurchaseOrderError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/purchase-orders/{id}"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [{ name: "id", value: request.id, schema: s.string() }],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: purchaseOrderDtoSchema },
        errorFactory: Orders.GetPurchaseOrderError,
      },
      options,
    );
  }

  /**
   * Synthetic deliveries
   *
   * @remarks
   * Synthetic deliveries.
   *
   * @returns Synthetic deliveries
   *
   * @throws {@link Orders.ListDeliveriesError} when the API answers with an error status — narrow
   * on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  listDeliveries(options?: RequestOptions): ApiPromise<DeliveriesResponse, Orders.ListDeliveriesError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/deliveries"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: deliveriesResponseSchema },
        errorFactory: Orders.ListDeliveriesError,
      },
      options,
    );
  }

  /**
   * Recorded invoices
   *
   * @remarks
   * Recorded invoices.
   *
   * @returns Recorded invoices
   *
   * @throws {@link Orders.ListInvoicesError} when the API answers with an error status — narrow on
   * `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  listInvoices(options?: RequestOptions): ApiPromise<InvoicesResponse, Orders.ListInvoicesError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/invoices"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: invoicesResponseSchema },
        errorFactory: Orders.ListInvoicesError,
      },
      options,
    );
  }

  /**
   * Purchase order history, optionally filtered by status
   *
   * @remarks
   * Purchase order history, optionally filtered by status.
   *
   * @returns Purchase order history, optionally filtered by status
   *
   * @throws {@link Orders.ListPurchaseOrdersError} when the API answers with an error status —
   * narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  listPurchaseOrders(
    options?: RequestOptions,
  ): ApiPromise<PurchaseOrdersResponse, Orders.ListPurchaseOrdersError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/purchase-orders"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: purchaseOrdersResponseSchema },
        errorFactory: Orders.ListPurchaseOrdersError,
      },
      options,
    );
  }

  /**
   * Confirm goods receipt (updates inventory)
   *
   * @remarks
   * Confirm goods receipt (updates inventory). Requires the MANAGER role. Idempotent: send an
   * `Idempotency-Key`.
   *
   * @returns Confirm goods receipt (updates inventory)
   *
   * @throws {@link Orders.ReceiveDeliveryError} when the API answers with an error status — narrow
   * on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  receiveDelivery(
    request: Orders.ReceiveDeliveryRequestParams,
    options?: RequestOptions,
  ): ApiPromise<DeliveriesReceiveResponse, Orders.ReceiveDeliveryError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/deliveries/{id}/receive"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [{ name: "id", value: request.id, schema: s.string() }],
        query: [],
        headers: [
          { name: "X-Requested-With", value: request.xRequestedWith, schema: xRequestedWithSchema },
          { name: "Idempotency-Key", value: request.idempotencyKey, schema: s.string() },
        ],
        body: { kind: "json", value: request.body, schema: receiveDeliveryRequestSchema },
      },
      {
        success: { kind: "json", schema: deliveriesReceiveResponseSchema },
        errorFactory: Orders.ReceiveDeliveryError,
      },
      options,
    );
  }
}

export namespace Orders {
  export type AnalyzeInvoiceRequestParams = {
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
    /** A unique key per user action; retries with the same key return the first result. */
    idempotencyKey: string;
    /** A supplier invoice to match against its purchase order and delivery. */
    body: AnalyzeInvoiceRequest;
  };

  export class AnalyzeInvoiceError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Declared<"apiErrorModel6", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<AnalyzeInvoiceError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 422, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel6", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type DelayDeliveryRequestParams = {
    /** Resource id (UUID). */
    id: string;
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
    /** Move a delivery's expected date, with a reason. */
    body: DelayDeliveryRequest;
  };

  export class DelayDeliveryError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Declared<"apiErrorModel6", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<DelayDeliveryError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 404, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel6", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type GetPurchaseOrderRequest = {
    /** Resource id (UUID). */
    id: string;
  };

  export class GetPurchaseOrderError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<GetPurchaseOrderError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 404, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export class ListDeliveriesError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<ListDeliveriesError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export class ListInvoicesError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<ListInvoicesError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export class ListPurchaseOrdersError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<ListPurchaseOrdersError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type ReceiveDeliveryRequestParams = {
    /** Resource id (UUID). */
    id: string;
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
    /** A unique key per user action; retries with the same key return the first result. */
    idempotencyKey: string;
    /** Quantities received per purchase order line. */
    body: ReceiveDeliveryRequest;
  };

  export class ReceiveDeliveryError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Declared<"apiErrorModel6", ApiErrorModel>
      | Declared<"apiErrorModel7", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<ReceiveDeliveryError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 404, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 422, kind: "apiErrorModel6", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel7", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }
}
