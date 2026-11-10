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
import { catalogItemInputSchema, type CatalogItemInput } from "../models/catalog-item-input.js";
import { supplierInputSchema, type SupplierInput } from "../models/supplier-input.js";
import {
  suppliersCatalogResponseSchema,
  type SuppliersCatalogResponse,
} from "../models/suppliers-catalog-response.js";
import { suppliersResponseSchema, type SuppliersResponse } from "../models/suppliers-response.js";
import { suppliersResponse1Schema, type SuppliersResponse1 } from "../models/suppliers-response1.js";
import { xRequestedWithSchema, type XRequestedWith } from "../models/xrequested-with.js";
import type { Servers } from "../servers.js";

/**
 * Suppliers, their fee terms and catalog listings (screened for prompt injection).
 */
export class Suppliers {
  readonly #rawClient: RawClient;
  readonly #servers: Servers;
  readonly #auth: AuthSchemes;

  constructor(rawClient: RawClient, servers: Servers, auth: AuthSchemes) {
    this.#rawClient = rawClient;
    this.#servers = servers;
    this.#auth = auth;
  }

  /**
   * Add a catalog listing (screened for prompt injection)
   *
   * @remarks
   * Add a catalog listing (screened for prompt injection). Requires the MANAGER role.
   *
   * @returns Add a catalog listing (screened for prompt injection)
   *
   * @throws {@link Suppliers.CreateCatalogItemError} when the API answers with an error status —
   * narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  createCatalogItem(
    request: Suppliers.CreateCatalogItemRequest,
    options?: RequestOptions,
  ): ApiPromise<SuppliersCatalogResponse, Suppliers.CreateCatalogItemError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/suppliers/{id}/catalog"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [{ name: "id", value: request.id, schema: s.string() }],
        query: [],
        headers: [
          { name: "X-Requested-With", value: request.xRequestedWith, schema: xRequestedWithSchema },
          { name: "Idempotency-Key", value: uuid(), schema: s.string() },
        ],
        body: { kind: "json", value: request.body, schema: catalogItemInputSchema },
      },
      {
        success: { kind: "json", schema: suppliersCatalogResponseSchema },
        errorFactory: Suppliers.CreateCatalogItemError,
      },
      options,
    );
  }

  /**
   * Add a supplier (owners approve it in the Spend Mandate)
   *
   * @remarks
   * Add a supplier (owners approve it in the Spend Mandate). Requires the MANAGER role.
   *
   * @returns Add a supplier (owners approve it in the Spend Mandate)
   *
   * @throws {@link Suppliers.CreateSupplierError} when the API answers with an error status —
   * narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  createSupplier(
    request: Suppliers.CreateSupplierRequest,
    options?: RequestOptions,
  ): ApiPromise<SuppliersResponse1, Suppliers.CreateSupplierError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/suppliers"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [],
        query: [],
        headers: [
          { name: "X-Requested-With", value: request.xRequestedWith, schema: xRequestedWithSchema },
          { name: "Idempotency-Key", value: uuid(), schema: s.string() },
        ],
        body: { kind: "json", value: request.body, schema: supplierInputSchema },
      },
      {
        success: { kind: "json", schema: suppliersResponse1Schema },
        errorFactory: Suppliers.CreateSupplierError,
      },
      options,
    );
  }

  /**
   * Supplier with its catalog
   *
   * @remarks
   * Supplier with its catalog.
   *
   * @returns Supplier with its catalog
   *
   * @throws {@link Suppliers.GetSupplierError} when the API answers with an error status — narrow
   * on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  getSupplier(
    request: Suppliers.GetSupplierRequest,
    options?: RequestOptions,
  ): ApiPromise<SuppliersResponse1, Suppliers.GetSupplierError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/suppliers/{id}"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [{ name: "id", value: request.id, schema: s.string() }],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: suppliersResponse1Schema },
        errorFactory: Suppliers.GetSupplierError,
      },
      options,
    );
  }

  /**
   * Suppliers with mandate approval and catalog size
   *
   * @remarks
   * Suppliers with mandate approval and catalog size.
   *
   * @returns Suppliers with mandate approval and catalog size
   *
   * @throws {@link Suppliers.ListSuppliersError} when the API answers with an error status — narrow
   * on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  listSuppliers(options?: RequestOptions): ApiPromise<SuppliersResponse, Suppliers.ListSuppliersError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/suppliers"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: suppliersResponseSchema },
        errorFactory: Suppliers.ListSuppliersError,
      },
      options,
    );
  }

  /**
   * Update a catalog listing
   *
   * @remarks
   * Update a catalog listing. Requires the MANAGER role.
   *
   * @returns Update a catalog listing
   *
   * @throws {@link Suppliers.UpdateCatalogItemError} when the API answers with an error status —
   * narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  updateCatalogItem(
    request: Suppliers.UpdateCatalogItemRequest,
    options?: RequestOptions,
  ): ApiPromise<SuppliersCatalogResponse, Suppliers.UpdateCatalogItemError> {
    return this.#rawClient.execute(
      {
        method: "PUT",
        urlTemplate: this.#servers.default("/suppliers/{id}/catalog/{itemId}"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [
          { name: "id", value: request.id, schema: s.string() },
          { name: "itemId", value: request.itemId, schema: s.string() },
        ],
        query: [],
        headers: [
          { name: "X-Requested-With", value: request.xRequestedWith, schema: xRequestedWithSchema },
          { name: "Idempotency-Key", value: uuid(), schema: s.string() },
        ],
        body: { kind: "json", value: request.body, schema: catalogItemInputSchema },
      },
      {
        success: { kind: "json", schema: suppliersCatalogResponseSchema },
        errorFactory: Suppliers.UpdateCatalogItemError,
      },
      options,
    );
  }

  /**
   * Update a supplier
   *
   * @remarks
   * Update a supplier. Requires the MANAGER role.
   *
   * @returns Update a supplier
   *
   * @throws {@link Suppliers.UpdateSupplierError} when the API answers with an error status —
   * narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  updateSupplier(
    request: Suppliers.UpdateSupplierRequest,
    options?: RequestOptions,
  ): ApiPromise<SuppliersResponse1, Suppliers.UpdateSupplierError> {
    return this.#rawClient.execute(
      {
        method: "PUT",
        urlTemplate: this.#servers.default("/suppliers/{id}"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [{ name: "id", value: request.id, schema: s.string() }],
        query: [],
        headers: [
          { name: "X-Requested-With", value: request.xRequestedWith, schema: xRequestedWithSchema },
          { name: "Idempotency-Key", value: uuid(), schema: s.string() },
        ],
        body: { kind: "json", value: request.body, schema: supplierInputSchema },
      },
      {
        success: { kind: "json", schema: suppliersResponse1Schema },
        errorFactory: Suppliers.UpdateSupplierError,
      },
      options,
    );
  }
}

export namespace Suppliers {
  export type CreateCatalogItemRequest = {
    /** Resource id (UUID). */
    id: string;
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
    /** Fields for creating or updating a catalog listing. */
    body: CatalogItemInput;
  };

  export class CreateCatalogItemError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Declared<"apiErrorModel6", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<CreateCatalogItemError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 404, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel6", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type CreateSupplierRequest = {
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
    /** Fields for creating or updating a supplier. */
    body: SupplierInput;
  };

  export class CreateSupplierError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<CreateSupplierError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type GetSupplierRequest = {
    /** Resource id (UUID). */
    id: string;
  };

  export class GetSupplierError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<GetSupplierError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 404, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export class ListSuppliersError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<ListSuppliersError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type UpdateCatalogItemRequest = {
    /** Resource id (UUID). */
    id: string;
    /** itemId id (UUID). */
    itemId: string;
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
    /** Fields for creating or updating a catalog listing. */
    body: CatalogItemInput;
  };

  export class UpdateCatalogItemError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Declared<"apiErrorModel6", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<UpdateCatalogItemError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 404, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel6", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type UpdateSupplierRequest = {
    /** Resource id (UUID). */
    id: string;
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
    /** Fields for creating or updating a supplier. */
    body: SupplierInput;
  };

  export class UpdateSupplierError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Declared<"apiErrorModel6", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<UpdateSupplierError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 404, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel6", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }
}
