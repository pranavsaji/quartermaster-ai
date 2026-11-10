import type { AuthSchemes } from "../auth-schemes.js";
import { ApiError, type Declared, type Undeclared } from "../core/api-error.js";
import type { ApiPromise } from "../core/api-promise.js";
import type { RequestOptions } from "../core/api-request.js";
import { anyAuth, noneAuth } from "../core/auth/schemes.js";
import type { RawClient } from "../core/raw-client.js";
import type { ErrorDecoders } from "../core/response-decoder.js";
import { uuid } from "../core/uuid.js";
import * as s from "../core/validation/index.js";
import {
  acceptInvitationRequestSchema,
  type AcceptInvitationRequest,
} from "../models/accept-invitation-request.js";
import { apiErrorModelSchema, type ApiErrorModel } from "../models/api-error-model.js";
import {
  createInvitationRequestSchema,
  type CreateInvitationRequest,
} from "../models/create-invitation-request.js";
import {
  invitationCreatedResponseSchema,
  type InvitationCreatedResponse,
} from "../models/invitation-created-response.js";
import {
  invitationTokenRequestSchema,
  type InvitationTokenRequest,
} from "../models/invitation-token-request.js";
import {
  invitationsAcceptResponseSchema,
  type InvitationsAcceptResponse,
} from "../models/invitations-accept-response.js";
import {
  invitationsLookupResponseSchema,
  type InvitationsLookupResponse,
} from "../models/invitations-lookup-response.js";
import {
  membersInvitationsRevokeResponseSchema,
  type MembersInvitationsRevokeResponse,
} from "../models/members-invitations-revoke-response.js";
import { membersResponseSchema, type MembersResponse } from "../models/members-response.js";
import { membersRoleResponseSchema, type MembersRoleResponse } from "../models/members-role-response.js";
import { resetLinkResponseSchema, type ResetLinkResponse } from "../models/reset-link-response.js";
import {
  updateMemberRoleRequestSchema,
  type UpdateMemberRoleRequest,
} from "../models/update-member-role-request.js";
import { xRequestedWithSchema, type XRequestedWith } from "../models/xrequested-with.js";
import type { Servers } from "../servers.js";

/**
 * Members, roles and one-time invitation links.
 */
export class Team {
  readonly #rawClient: RawClient;
  readonly #servers: Servers;
  readonly #auth: AuthSchemes;

  constructor(rawClient: RawClient, servers: Servers, auth: AuthSchemes) {
    this.#rawClient = rawClient;
    this.#servers = servers;
    this.#auth = auth;
  }

  /**
   * Accept an invitation, create the account and sign in
   *
   * @remarks
   * Accept an invitation, create the account and sign in.
   *
   * @returns Accept an invitation, create the account and sign in
   *
   * @throws {@link Team.AcceptInvitationError} when the API answers with an error status — narrow
   * on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  acceptInvitation(
    request: Team.AcceptInvitationRequestParams,
    options?: RequestOptions,
  ): ApiPromise<InvitationsAcceptResponse, Team.AcceptInvitationError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/invitations/accept"),
        auth: noneAuth,
        pathParams: [],
        query: [],
        headers: [
          { name: "X-Requested-With", value: request.xRequestedWith, schema: xRequestedWithSchema },
          { name: "Idempotency-Key", value: uuid(), schema: s.string() },
        ],
        body: { kind: "json", value: request.body, schema: acceptInvitationRequestSchema },
      },
      {
        success: { kind: "json", schema: invitationsAcceptResponseSchema },
        errorFactory: Team.AcceptInvitationError,
      },
      options,
    );
  }

  /**
   * Invite someone (returns the one-time link; emailed when email is configured)
   *
   * @remarks
   * Invite someone (returns the one-time link; emailed when email is configured). Requires the
   * OWNER role.
   *
   * @returns Invite someone (returns the one-time link; emailed when email is configured)
   *
   * @throws {@link Team.InviteMemberError} when the API answers with an error status — narrow on
   * `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  inviteMember(
    request: Team.InviteMemberRequest,
    options?: RequestOptions,
  ): ApiPromise<InvitationCreatedResponse, Team.InviteMemberError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/members/invitations"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [],
        query: [],
        headers: [
          { name: "X-Requested-With", value: request.xRequestedWith, schema: xRequestedWithSchema },
          { name: "Idempotency-Key", value: uuid(), schema: s.string() },
        ],
        body: { kind: "json", value: request.body, schema: createInvitationRequestSchema },
      },
      {
        success: { kind: "json", schema: invitationCreatedResponseSchema },
        errorFactory: Team.InviteMemberError,
      },
      options,
    );
  }

  /**
   * Issue a one-time password reset link for a member
   *
   * @remarks
   * Issue a one-time password reset link for a member. Requires the OWNER role.
   *
   * @returns Issue a one-time password reset link for a member
   *
   * @throws {@link Team.IssueMemberResetLinkError} when the API answers with an error status —
   * narrow on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  issueMemberResetLink(
    request: Team.IssueMemberResetLinkRequest,
    options?: RequestOptions,
  ): ApiPromise<ResetLinkResponse, Team.IssueMemberResetLinkError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/members/{id}/password-reset"),
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
        success: { kind: "json", schema: resetLinkResponseSchema },
        errorFactory: Team.IssueMemberResetLinkError,
      },
      options,
    );
  }

  /**
   * Members, and open invitations for owners
   *
   * @remarks
   * Members, and open invitations for owners.
   *
   * @returns Members, and open invitations for owners
   *
   * @throws {@link Team.ListMembersError} when the API answers with an error status — narrow on
   * `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  listMembers(options?: RequestOptions): ApiPromise<MembersResponse, Team.ListMembersError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/members"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: membersResponseSchema },
        errorFactory: Team.ListMembersError,
      },
      options,
    );
  }

  /**
   * Preview an invitation from its link token
   *
   * @remarks
   * Preview an invitation from its link token.
   *
   * @returns Preview an invitation from its link token
   *
   * @throws {@link Team.LookupInvitationError} when the API answers with an error status — narrow
   * on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  lookupInvitation(
    request: Team.LookupInvitationRequest,
    options?: RequestOptions,
  ): ApiPromise<InvitationsLookupResponse, Team.LookupInvitationError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/invitations/lookup"),
        auth: noneAuth,
        pathParams: [],
        query: [],
        headers: [
          { name: "X-Requested-With", value: request.xRequestedWith, schema: xRequestedWithSchema },
          { name: "Idempotency-Key", value: uuid(), schema: s.string() },
        ],
        body: { kind: "json", value: request.body, schema: invitationTokenRequestSchema },
      },
      {
        success: { kind: "json", schema: invitationsLookupResponseSchema },
        errorFactory: Team.LookupInvitationError,
      },
      options,
    );
  }

  /**
   * Remove a member
   *
   * @remarks
   * Remove a member. Requires the OWNER role.
   *
   * @returns Done; no content.
   *
   * @throws {@link Team.RemoveMemberError} when the API answers with an error status — narrow on
   * `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  removeMember(
    request: Team.RemoveMemberRequest,
    options?: RequestOptions,
  ): ApiPromise<undefined, Team.RemoveMemberError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/members/{id}/remove"),
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
        success: { kind: "empty" },
        errorFactory: Team.RemoveMemberError,
      },
      options,
    );
  }

  /**
   * Revoke an open invitation
   *
   * @remarks
   * Revoke an open invitation. Requires the OWNER role.
   *
   * @returns Revoke an open invitation
   *
   * @throws {@link Team.RevokeInvitationError} when the API answers with an error status — narrow
   * on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  revokeInvitation(
    request: Team.RevokeInvitationRequest,
    options?: RequestOptions,
  ): ApiPromise<MembersInvitationsRevokeResponse, Team.RevokeInvitationError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/members/invitations/{id}/revoke"),
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
        success: { kind: "json", schema: membersInvitationsRevokeResponseSchema },
        errorFactory: Team.RevokeInvitationError,
      },
      options,
    );
  }

  /**
   * Change a member's role (a workspace keeps at least one owner)
   *
   * @remarks
   * Change a member's role (a workspace keeps at least one owner). Requires the OWNER role.
   *
   * @returns Change a member's role (a workspace keeps at least one owner)
   *
   * @throws {@link Team.UpdateMemberRoleError} when the API answers with an error status — narrow
   * on `err.payload.kind`
   *
   * @throws {@link QuartermasterAiTrustRailApiError} when no usable response was produced: a
   * connection failure, a timeout, a body that would not decode, a value that would not encode, or
   * a credential that could not be obtained
   */
  updateMemberRole(
    request: Team.UpdateMemberRoleRequestParams,
    options?: RequestOptions,
  ): ApiPromise<MembersRoleResponse, Team.UpdateMemberRoleError> {
    return this.#rawClient.execute(
      {
        method: "PUT",
        urlTemplate: this.#servers.default("/members/{id}/role"),
        auth: anyAuth(this.#auth.secureSession, this.#auth.session),
        pathParams: [{ name: "id", value: request.id, schema: s.string() }],
        query: [],
        headers: [
          { name: "X-Requested-With", value: request.xRequestedWith, schema: xRequestedWithSchema },
          { name: "Idempotency-Key", value: uuid(), schema: s.string() },
        ],
        body: { kind: "json", value: request.body, schema: updateMemberRoleRequestSchema },
      },
      {
        success: { kind: "json", schema: membersRoleResponseSchema },
        errorFactory: Team.UpdateMemberRoleError,
      },
      options,
    );
  }
}

export namespace Team {
  export type AcceptInvitationRequestParams = {
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
    /** Accept an invitation: the invitee's name and new password, with the link token. */
    body: AcceptInvitationRequest;
  };

  export class AcceptInvitationError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<AcceptInvitationError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type InviteMemberRequest = {
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
    /** Invite an email address with a role. */
    body: CreateInvitationRequest;
  };

  export class InviteMemberError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<InviteMemberError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type IssueMemberResetLinkRequest = {
    /** Resource id (UUID). */
    id: string;
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
  };

  export class IssueMemberResetLinkError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<IssueMemberResetLinkError> = [
      { on: 401, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 404, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export class ListMembersError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<ListMembersError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type LookupInvitationRequest = {
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
    /** An invitation link token. */
    body: InvitationTokenRequest;
  };

  export class LookupInvitationError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<LookupInvitationError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type RemoveMemberRequest = {
    /** Resource id (UUID). */
    id: string;
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
  };

  export class RemoveMemberError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<RemoveMemberError> = [
      { on: 401, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 404, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type RevokeInvitationRequest = {
    /** Resource id (UUID). */
    id: string;
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
  };

  export class RevokeInvitationError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<RevokeInvitationError> = [
      { on: 401, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 404, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }

  export type UpdateMemberRoleRequestParams = {
    /** Resource id (UUID). */
    id: string;
    /** CSRF guard: must be `quartermaster` on every mutation. */
    xRequestedWith: XRequestedWith;
    /** A member's new role. */
    body: UpdateMemberRoleRequest;
  };

  export class UpdateMemberRoleError extends ApiError {
    declare readonly payload:
      | Declared<"apiErrorModel", ApiErrorModel>
      | Declared<"apiErrorModel2", ApiErrorModel>
      | Declared<"apiErrorModel3", ApiErrorModel>
      | Declared<"apiErrorModel4", ApiErrorModel>
      | Declared<"apiErrorModel5", ApiErrorModel>
      | Declared<"apiErrorModel6", ApiErrorModel>
      | Undeclared;

    static readonly errors: ErrorDecoders<UpdateMemberRoleError> = [
      { on: 400, kind: "apiErrorModel", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 401, kind: "apiErrorModel2", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 403, kind: "apiErrorModel3", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 404, kind: "apiErrorModel4", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 409, kind: "apiErrorModel5", decode: { kind: "json", schema: apiErrorModelSchema } },
      { on: 429, kind: "apiErrorModel6", decode: { kind: "json", schema: apiErrorModelSchema } },
    ];
  }
}
