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
import {
  createInventoryItemRequestSchema,
  type CreateInventoryItemRequest,
} from "../models/create-inventory-item-request.js";
import { forecastRequestSchema, type ForecastRequest } from "../models/forecast-request.js";
import { forecastRunDtoSchema, type ForecastRunDto } from "../models/forecast-run-dto.js";
import {
  inventoryAdjustmentRequestSchema,
  type InventoryAdjustmentRequest,
} from "../models/inventory-adjustment-request.js";
import {
  inventoryAdjustmentsResponseSchema,
  type InventoryAdjustmentsResponse,
} from "../models/inventory-adjustments-response.js";
import { inventoryItemInputSchema, type InventoryItemInput } from "../models/inventory-item-input.js";
import { inventoryResponseSchema, type InventoryResponse } from "../models/inventory-response.js";
import { inventoryResponse1Schema, type InventoryResponse1 } from "../models/inventory-response1.js";
import { xRequestedWithSchema, type XRequestedWith } from "../models/xrequested-with.js";
import type { Servers } from "../servers.js";

/**
 * Stock levels, adjustments and the reorder forecast.
 */
export class InventoryApi {
  readonly #rawClient: RawClient;
  readonly #servers: Servers;
  readonly #auth: AuthSchemes;

  constructor(rawClient: RawClient, servers: Servers, auth: AuthSchemes) {
    this.#rawClient = rawClient;
    this.#servers = servers;
    this.#auth = auth;
  }

  /**
   * Record an authorized stock change
   *
   * @remarks
   * Record an authorized stock change. Requires the MANAGER role. Idempotent: send an
   * `Idempotency-Key`.
   *
   * @returns Record an authorized stock change
   *
   * @throws {@link InventoryApi.AdjustInventoryItemError} when the API answers with an error status
   * — narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  adjustInventoryItem(
    request: InventoryApi.AdjustInventoryItemRequest,
    options?: RequestOptions,
  ): ApiPromise<InventoryAdjustmentsResponse, InventoryApi.AdjustInventoryItemError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/inventory/{id}/adjustments"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [{ name: "id", value: request.id, schema: s.string() }],
        query: [],
        headers: [
          { name: "X-Requested-With", value: request.xRequestedWith, schema: xRequestedWithSchema },
          { name: "Idempotency-Key", value: request.idempotencyKey, schema: s.string() },
        ],
        body: { kind: "json", value: request.body, schema: inventoryAdjustmentRequestSchema },
      },
      {
        success: { kind: "json", schema: inventoryAdjustmentsResponseSchema },
        errorFactory: InventoryApi.AdjustInventoryItemError,
      },
      options,
    );
  }

  /**
   * Add a stock item
   *
   * @remarks
   * Add a stock item. Requires the MANAGER role.
   *
   * @returns Add a stock item
   *
   * @throws {@link InventoryApi.CreateInventoryItemError} when the API answers with an error status
   * — narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  createInventoryItem(
    request: InventoryApi.CreateInventoryItemRequestParams,
    options?: RequestOptions,
  ): ApiPromise<InventoryResponse1, InventoryApi.CreateInventoryItemError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/inventory"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [],
        query: [],
        headers: [
          { name: "X-Requested-With", value: request.xRequestedWith, schema: xRequestedWithSchema },
          { name: "Idempotency-Key", value: uuid(), schema: s.string() },
        ],
        body: { kind: "json", value: request.body, schema: createInventoryItemRequestSchema },
      },
      {
        success: { kind: "json", schema: inventoryResponse1Schema },
        errorFactory: InventoryApi.CreateInventoryItemError,
      },
      options,
    );
  }

  /**
   * Calculate reorder recommendations
   *
   * @remarks
   * Calculate reorder recommendations. Requires the MANAGER role.
   *
   * @returns Calculate reorder recommendations
   *
   * @throws {@link InventoryApi.ForecastInventoryError} when the API answers with an error status —
   * narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  forecastInventory(
    request: InventoryApi.ForecastInventoryRequest,
    options?: RequestOptions,
  ): ApiPromise<ForecastRunDto, InventoryApi.ForecastInventoryError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/inventory/forecast"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [],
        query: [],
        headers: [
          { name: "X-Requested-With", value: request.xRequestedWith, schema: xRequestedWithSchema },
          { name: "Idempotency-Key", value: uuid(), schema: s.string() },
        ],
        body: { kind: "json", value: request.body, schema: forecastRequestSchema },
      },
      {
        success: { kind: "json", schema: forecastRunDtoSchema },
        errorFactory: InventoryApi.ForecastInventoryError,
      },
      options,
    );
  }

  /**
   * Current stock, usage and alerts
   *
   * @remarks
   * Current stock, usage and alerts.
   *
   * @returns Current stock, usage and alerts
   *
   * @throws {@link InventoryApi.ListInventoryError} when the API answers with an error status —
   * narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  listInventory(options?: RequestOptions): ApiPromise<InventoryResponse, InventoryApi.ListInventoryError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/inventory"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: inventoryResponseSchema },
        errorFactory: InventoryApi.ListInventoryError,
      },
      options,
    );
  }

  /**
   * Update a stock item's details (not its quantity)
   *
   * @remarks
   * Update a stock item's details (not its quantity). Requires the MANAGER role.
   *
   * @returns Update a stock item's details (not its quantity)
   *
   * @throws {@link InventoryApi.UpdateInventoryItemError} when the API answers with an error status
   * — narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  updateInventoryItem(
    request: InventoryApi.UpdateInventoryItemRequest,
    options?: RequestOptions,
  ): ApiPromise<InventoryResponse1, InventoryApi.UpdateInventoryItemError> {
    return this.#rawClient.execute(
      {
        method: "PUT",
        urlTemplate: this.#servers.default("/inventory/{id}"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [{ name: "id", value: request.id, schema: s.string() }],
        query: [],
        headers: [
          { name: "X-Requested-With", value: request.xRequestedWith, schema: xRequestedWithSchema },
          { name: "Idempotency-Key", value: uuid(), schema: s.string() },
        ],
        body: { kind: "json", value: request.body, schema: inventoryItemInputSchema },
      },
      {
        success: { kind: "json", schema: inventoryResponse1Schema },
        errorFactory: InventoryApi.UpdateInventoryItemError,
      },
      options,
    );
  }
}

export namespace InventoryApi {
  export type AdjustInventoryItemRequest = {
    /** Resource id (UUID). */
    id: string;
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
    /** A unique key per user action; retries with the same key return the first result. */
    idempotencyKey: string;
    /** An authorised stock change with a reason. */
    body: InventoryAdjustmentRequest;
  };

  export class AdjustInventoryItemError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Declared<"apiErrorModel6", ApiErrorModel>
      | Declared<"apiErrorModel7", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<AdjustInventoryItemError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 404, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 422, kind: "apiErrorModel6", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel7", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type CreateInventoryItemRequestParams = {
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
    /** A new stock item, including its opening on-hand count. */
    body: CreateInventoryItemRequest;
  };

  export class CreateInventoryItemError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<CreateInventoryItemError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type ForecastInventoryRequest = {
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
    /** Parameters for a reorder forecast. */
    body: ForecastRequest;
  };

  export class ForecastInventoryError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<ForecastInventoryError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export class ListInventoryError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<ListInventoryError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type UpdateInventoryItemRequest = {
    /** Resource id (UUID). */
    id: string;
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
    /** Editable details of a stock item (quantities change through adjustments). */
    body: InventoryItemInput;
  };

  export class UpdateInventoryItemError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Declared<"apiErrorModel6", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<UpdateInventoryItemError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 404, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel6", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }
}
