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
import { authLoginResponseSchema, type AuthLoginResponse } from "../models/auth-login-response.js";
import { authMeResponseSchema, type AuthMeResponse } from "../models/auth-me-response.js";
import {
  authPasswordChangeResponseSchema,
  type AuthPasswordChangeResponse,
} from "../models/auth-password-change-response.js";
import {
  authPasswordForgotResponseSchema,
  type AuthPasswordForgotResponse,
} from "../models/auth-password-forgot-response.js";
import {
  authPasswordResetResponseSchema,
  type AuthPasswordResetResponse,
} from "../models/auth-password-reset-response.js";
import { authSignupResponseSchema, type AuthSignupResponse } from "../models/auth-signup-response.js";
import {
  changePasswordRequestSchema,
  type ChangePasswordRequest,
} from "../models/change-password-request.js";
import {
  forgotPasswordRequestSchema,
  type ForgotPasswordRequest,
} from "../models/forgot-password-request.js";
import { loginRequestSchema, type LoginRequest } from "../models/login-request.js";
import { resetPasswordRequestSchema, type ResetPasswordRequest } from "../models/reset-password-request.js";
import { signupRequestSchema, type SignupRequest } from "../models/signup-request.js";
import { xRequestedWithSchema, type XRequestedWith } from "../models/xrequested-with.js";
import type { Servers } from "../servers.js";

/**
 * Sign-up, sign-in (httpOnly session cookie), password reset and change.
 */
export class AccountsApi {
  readonly #rawClient: RawClient;
  readonly #servers: Servers;
  readonly #auth: AuthSchemes;

  constructor(rawClient: RawClient, servers: Servers, auth: AuthSchemes) {
    this.#rawClient = rawClient;
    this.#servers = servers;
    this.#auth = auth;
  }

  /**
   * Change your password (signs out other sessions)
   *
   * @remarks
   * Change your password (signs out other sessions).
   *
   * @returns Change your password (signs out other sessions)
   *
   * @throws {@link AccountsApi.ChangePasswordError} when the API answers with an error status —
   * narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  changePassword(
    request: AccountsApi.ChangePasswordRequestParams,
    options?: RequestOptions,
  ): ApiPromise<AuthPasswordChangeResponse, AccountsApi.ChangePasswordError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/auth/password/change"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [],
        query: [],
        headers: [
          { name: "X-Requested-With", value: request.xRequestedWith, schema: xRequestedWithSchema },
          { name: "Idempotency-Key", value: uuid(), schema: s.string() },
        ],
        body: { kind: "json", value: request.body, schema: changePasswordRequestSchema },
      },
      {
        success: { kind: "json", schema: authPasswordChangeResponseSchema },
        errorFactory: AccountsApi.ChangePasswordError,
      },
      options,
    );
  }

  /**
   * Current user and organization
   *
   * @remarks
   * Current user and organization.
   *
   * @returns Current user and organization
   *
   * @throws {@link AccountsApi.GetCurrentUserError} when the API answers with an error status —
   * narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  getCurrentUser(options?: RequestOptions): ApiPromise<AuthMeResponse, AccountsApi.GetCurrentUserError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/auth/me"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: authMeResponseSchema },
        errorFactory: AccountsApi.GetCurrentUserError,
      },
      options,
    );
  }

  /**
   * Sign in (sets httpOnly session cookie)
   *
   * @remarks
   * Sign in (sets httpOnly session cookie).
   *
   * @returns Sign in (sets httpOnly session cookie)
   *
   * @throws {@link AccountsApi.LoginError} when the API answers with an error status — narrow on
   * `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  login(
    request: AccountsApi.LoginRequestParams,
    options?: RequestOptions,
  ): ApiPromise<AuthLoginResponse, AccountsApi.LoginError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/auth/login"),
        auth: noneAuth,
        pathParams: [],
        query: [],
        headers: [
          { name: "X-Requested-With", value: request.xRequestedWith, schema: xRequestedWithSchema },
          { name: "Idempotency-Key", value: uuid(), schema: s.string() },
        ],
        body: { kind: "json", value: request.body, schema: loginRequestSchema },
      },
      {
        success: { kind: "json", schema: authLoginResponseSchema },
        errorFactory: AccountsApi.LoginError,
      },
      options,
    );
  }

  /**
   * Sign out
   *
   * @remarks
   * Sign out.
   *
   * @returns Done; no content.
   *
   * @throws {@link AccountsApi.LogoutError} when the API answers with an error status — narrow on
   * `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  logout(
    request: AccountsApi.LogoutRequest,
    options?: RequestOptions,
  ): ApiPromise<undefined, AccountsApi.LogoutError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/auth/logout"),
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
        success: { kind: "empty" },
        errorFactory: AccountsApi.LogoutError,
      },
      options,
    );
  }

  /**
   * Email a password reset link (always 202)
   *
   * @remarks
   * Email a password reset link (always 202).
   *
   * @returns Email a password reset link (always 202)
   *
   * @throws {@link AccountsApi.RequestPasswordResetError} when the API answers with an error status
   * — narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  requestPasswordReset(
    request: AccountsApi.RequestPasswordResetRequest,
    options?: RequestOptions,
  ): ApiPromise<AuthPasswordForgotResponse, AccountsApi.RequestPasswordResetError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/auth/password/forgot"),
        auth: noneAuth,
        pathParams: [],
        query: [],
        headers: [
          { name: "X-Requested-With", value: request.xRequestedWith, schema: xRequestedWithSchema },
          { name: "Idempotency-Key", value: uuid(), schema: s.string() },
        ],
        body: { kind: "json", value: request.body, schema: forgotPasswordRequestSchema },
      },
      {
        success: { kind: "json", schema: authPasswordForgotResponseSchema },
        errorFactory: AccountsApi.RequestPasswordResetError,
      },
      options,
    );
  }

  /**
   * Set a new password from a one-time link
   *
   * @remarks
   * Set a new password from a one-time link.
   *
   * @returns Set a new password from a one-time link
   *
   * @throws {@link AccountsApi.ResetPasswordError} when the API answers with an error status —
   * narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  resetPassword(
    request: AccountsApi.ResetPasswordRequestParams,
    options?: RequestOptions,
  ): ApiPromise<AuthPasswordResetResponse, AccountsApi.ResetPasswordError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/auth/password/reset"),
        auth: noneAuth,
        pathParams: [],
        query: [],
        headers: [
          { name: "X-Requested-With", value: request.xRequestedWith, schema: xRequestedWithSchema },
          { name: "Idempotency-Key", value: uuid(), schema: s.string() },
        ],
        body: { kind: "json", value: request.body, schema: resetPasswordRequestSchema },
      },
      {
        success: { kind: "json", schema: authPasswordResetResponseSchema },
        errorFactory: AccountsApi.ResetPasswordError,
      },
      options,
    );
  }

  /**
   * Create a workspace and its owner (sets session cookie)
   *
   * @remarks
   * Create a workspace and its owner (sets session cookie).
   *
   * @returns Create a workspace and its owner (sets session cookie)
   *
   * @throws {@link AccountsApi.SignupError} when the API answers with an error status — narrow on
   * `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  signup(
    request: AccountsApi.SignupRequestParams,
    options?: RequestOptions,
  ): ApiPromise<AuthSignupResponse, AccountsApi.SignupError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/auth/signup"),
        auth: noneAuth,
        pathParams: [],
        query: [],
        headers: [
          { name: "X-Requested-With", value: request.xRequestedWith, schema: xRequestedWithSchema },
          { name: "Idempotency-Key", value: uuid(), schema: s.string() },
        ],
        body: { kind: "json", value: request.body, schema: signupRequestSchema },
      },
      {
        success: { kind: "json", schema: authSignupResponseSchema },
        errorFactory: AccountsApi.SignupError,
      },
      options,
    );
  }
}

export namespace AccountsApi {
  export type ChangePasswordRequestParams = {
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
    /** Change the signed-in user's password. */
    body: ChangePasswordRequest;
  };

  export class ChangePasswordError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<ChangePasswordError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export class GetCurrentUserError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<GetCurrentUserError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type LoginRequestParams = {
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
    /** Email and password sign-in. */
    body: LoginRequest;
  };

  export class LoginError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<LoginError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type LogoutRequest = {
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
  };

  export class LogoutError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<LogoutError> = [
      { on: 401, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type RequestPasswordResetRequest = {
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
    /** Request a password reset email. */
    body: ForgotPasswordRequest;
  };

  export class RequestPasswordResetError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<RequestPasswordResetError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type ResetPasswordRequestParams = {
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
    /** Set a new password from a one-time reset link. */
    body: ResetPasswordRequest;
  };

  export class ResetPasswordError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<ResetPasswordError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type SignupRequestParams = {
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
    /** Create a workspace and its first owner. */
    body: SignupRequest;
  };

  export class SignupError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<SignupError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }
}
