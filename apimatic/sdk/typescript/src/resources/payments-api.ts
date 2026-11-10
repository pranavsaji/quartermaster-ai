import type { AuthSchemes } from "../auth-schemes.js";
import { ApiError, type Declared, type Undeclared } from "../core/api-error.js";
import type { ApiPromise } from "../core/api-promise.js";
import type { RequestOptions } from "../core/api-request.js";
import { anyAuth, noneAuth } from "../core/auth/schemes.js";
import type { RawClient } from "../core/raw-client.js";
import type { ErrorDecoders } from "../core/response-decoder.js";
import { uuid } from "../core/uuid.js";
import * as s from "../core/validation/index.js";
import { apiErrorModelSchema, type ApiErrorModel } from "../models/api-error-model.js";
import {
  capturePaymentRequestSchema,
  type CapturePaymentRequest,
} from "../models/capture-payment-request.js";
import { payPalOrderResponseSchema, type PayPalOrderResponse } from "../models/pay-pal-order-response.js";
import { paymentDtoSchema, type PaymentDto } from "../models/payment-dto.js";
import {
  paymentsCaptureResponseSchema,
  type PaymentsCaptureResponse,
} from "../models/payments-capture-response.js";
import {
  paymentsRefundResponseSchema,
  type PaymentsRefundResponse,
} from "../models/payments-refund-response.js";
import { refundRequestSchema, type RefundRequest } from "../models/refund-request.js";
import { webhookAckResponseSchema, type WebhookAckResponse } from "../models/webhook-ack-response.js";
import { xRequestedWithSchema, type XRequestedWith } from "../models/xrequested-with.js";
import type { Servers } from "../servers.js";

/**
 * Intent Certificates and PayPal (sandbox) orders, captures and refunds.
 */
export class PaymentsApi {
  readonly #rawClient: RawClient;
  readonly #servers: Servers;
  readonly #auth: AuthSchemes;

  constructor(rawClient: RawClient, servers: Servers, auth: AuthSchemes) {
    this.#rawClient = rawClient;
    this.#servers = servers;
    this.#auth = auth;
  }

  /**
   * Guarded capture of an approved PayPal order
   *
   * @remarks
   * Guarded capture of an approved PayPal order. Requires the OWNER role. Idempotent: send an
   * `Idempotency-Key`.
   *
   * @returns Guarded capture of an approved PayPal order
   *
   * @throws {@link PaymentsApi.CapturePaymentError} when the API answers with an error status —
   * narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  capturePayment(
    request: PaymentsApi.CapturePaymentRequestParams,
    options?: RequestOptions,
  ): ApiPromise<PaymentsCaptureResponse, PaymentsApi.CapturePaymentError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/payments/{id}/capture"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [{ name: "id", value: request.id, schema: s.string() }],
        query: [],
        headers: [
          { name: "X-Requested-With", value: request.xRequestedWith, schema: xRequestedWithSchema },
          { name: "Idempotency-Key", value: request.idempotencyKey, schema: s.string() },
        ],
        body: { kind: "json", value: request.body, schema: capturePaymentRequestSchema },
      },
      {
        success: { kind: "json", schema: paymentsCaptureResponseSchema },
        errorFactory: PaymentsApi.CapturePaymentError,
      },
      options,
    );
  }

  /**
   * Create (or return) the PayPal sandbox order for an intent
   *
   * @remarks
   * Create (or return) the PayPal sandbox order for an intent. Requires the OWNER role. Idempotent:
   * send an `Idempotency-Key`.
   *
   * @returns Create (or return) the PayPal sandbox order for an intent
   *
   * @throws {@link PaymentsApi.CreatePayPalOrderError} when the API answers with an error status —
   * narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  createPayPalOrder(
    request: PaymentsApi.CreatePayPalOrderRequest,
    options?: RequestOptions,
  ): ApiPromise<PayPalOrderResponse, PaymentsApi.CreatePayPalOrderError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/intents/{id}/paypal-order"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [{ name: "id", value: request.id, schema: s.string() }],
        query: [],
        headers: [
          { name: "X-Requested-With", value: request.xRequestedWith, schema: xRequestedWithSchema },
          { name: "Idempotency-Key", value: request.idempotencyKey, schema: s.string() },
        ],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: payPalOrderResponseSchema },
        errorFactory: PaymentsApi.CreatePayPalOrderError,
      },
      options,
    );
  }

  /**
   * Verified payment state
   *
   * @remarks
   * Verified payment state.
   *
   * @returns Verified payment state
   *
   * @throws {@link PaymentsApi.GetPaymentError} when the API answers with an error status — narrow
   * on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  getPayment(
    request: PaymentsApi.GetPaymentRequest,
    options?: RequestOptions,
  ): ApiPromise<PaymentDto, PaymentsApi.GetPaymentError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/payments/{id}"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [{ name: "id", value: request.id, schema: s.string() }],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: paymentDtoSchema },
        errorFactory: PaymentsApi.GetPaymentError,
      },
      options,
    );
  }

  /**
   * PayPal webhook receiver (signature-verified)
   *
   * @remarks
   * PayPal webhook receiver (signature-verified).
   *
   * @returns PayPal webhook receiver (signature-verified)
   *
   * @throws {@link PaymentsApi.ReceivePayPalWebhookError} when the API answers with an error status
   * — narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  receivePayPalWebhook(
    options?: RequestOptions,
  ): ApiPromise<WebhookAckResponse, PaymentsApi.ReceivePayPalWebhookError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/webhooks/paypal"),
        auth: noneAuth,
        pathParams: [],
        query: [],
        headers: [{ name: "Idempotency-Key", value: uuid(), schema: s.string() }],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: webhookAckResponseSchema },
        errorFactory: PaymentsApi.ReceivePayPalWebhookError,
      },
      options,
    );
  }

  /**
   * Owner-authorized refund
   *
   * @remarks
   * Owner-authorized refund. Requires the OWNER role. Idempotent: send an `Idempotency-Key`.
   *
   * @returns Owner-authorized refund
   *
   * @throws {@link PaymentsApi.RefundPaymentError} when the API answers with an error status —
   * narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  refundPayment(
    request: PaymentsApi.RefundPaymentRequest,
    options?: RequestOptions,
  ): ApiPromise<PaymentsRefundResponse, PaymentsApi.RefundPaymentError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/payments/{id}/refund"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [{ name: "id", value: request.id, schema: s.string() }],
        query: [],
        headers: [
          { name: "X-Requested-With", value: request.xRequestedWith, schema: xRequestedWithSchema },
          { name: "Idempotency-Key", value: request.idempotencyKey, schema: s.string() },
        ],
        body: { kind: "json", value: request.body, schema: refundRequestSchema },
      },
      {
        success: { kind: "json", schema: paymentsRefundResponseSchema },
        errorFactory: PaymentsApi.RefundPaymentError,
      },
      options,
    );
  }

  /**
   * Re-read the PayPal order and apply its state (never captures)
   *
   * @remarks
   * Re-read the PayPal order and apply its state (never captures). Requires the OWNER role.
   *
   * @returns Re-read the PayPal order and apply its state (never captures)
   *
   * @throws {@link PaymentsApi.SyncPaymentError} when the API answers with an error status — narrow
   * on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  syncPayment(
    request: PaymentsApi.SyncPaymentRequest,
    options?: RequestOptions,
  ): ApiPromise<PaymentDto, PaymentsApi.SyncPaymentError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/payments/{id}/sync"),
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
        success: { kind: "json", schema: paymentDtoSchema },
        errorFactory: PaymentsApi.SyncPaymentError,
      },
      options,
    );
  }
}

export namespace PaymentsApi {
  export type CapturePaymentRequestParams = {
    /** Resource id (UUID). */
    id: string;
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
    /** A unique key per user action; retries with the same key return the first result. */
    idempotencyKey: string;
    /** Capture a PayPal order the buyer approved. */
    body: CapturePaymentRequest;
  };

  export class CapturePaymentError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Declared<"apiErrorModel6", ApiErrorModel>
      | Declared<"apiErrorModel7", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<CapturePaymentError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 404, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 422, kind: "apiErrorModel6", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel7", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type CreatePayPalOrderRequest = {
    /** Resource id (UUID). */
    id: string;
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
    /** A unique key per user action; retries with the same key return the first result. */
    idempotencyKey: string;
  };

  export class CreatePayPalOrderError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Declared<"apiErrorModel6", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<CreatePayPalOrderError> = [
      { on: 401, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 404, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 422, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel6", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type GetPaymentRequest = {
    /** Resource id (UUID). */
    id: string;
  };

  export class GetPaymentError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<GetPaymentError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 404, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export class ReceivePayPalWebhookError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<ReceivePayPalWebhookError> = [
      { on: 409, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type RefundPaymentRequest = {
    /** Resource id (UUID). */
    id: string;
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
    /** A unique key per user action; retries with the same key return the first result. */
    idempotencyKey: string;
    /** Refund part or all of a captured payment. */
    body: RefundRequest;
  };

  export class RefundPaymentError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Declared<"apiErrorModel6", ApiErrorModel>
      | Declared<"apiErrorModel7", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<RefundPaymentError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 404, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 422, kind: "apiErrorModel6", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel7", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type SyncPaymentRequest = {
    /** Resource id (UUID). */
    id: string;
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
  };

  export class SyncPaymentError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<SyncPaymentError> = [
      { on: 401, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 404, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }
}
