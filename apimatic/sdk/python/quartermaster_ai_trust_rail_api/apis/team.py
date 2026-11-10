from __future__ import annotations

from uuid import UUID, uuid4

from ..auth import AsyncAuthSchemes, AuthSchemes
from ..core import (
    AnySchemes,
    ApiResult,
    AsyncAnySchemes,
    AsyncRawClient,
    RawClient,
    RequestOptionsOrDict,
    SecuredRawResponse,
    async_empty_response,
    async_json_decoder,
    empty_response,
    json_body,
    json_decoder,
    param,
    unwrap,
)
from ..errors.accept_invitation_error import AcceptInvitationErrorBody, accept_invitation_error_mapper
from ..errors.invite_member_error import InviteMemberErrorBody, invite_member_error_mapper
from ..errors.issue_member_reset_link_error import IssueMemberResetLinkErrorBody, issue_member_reset_link_error_mapper
from ..errors.list_members_error import ListMembersErrorBody, list_members_error_mapper
from ..errors.lookup_invitation_error import LookupInvitationErrorBody, lookup_invitation_error_mapper
from ..errors.remove_member_error import RemoveMemberErrorBody, remove_member_error_mapper
from ..errors.revoke_invitation_error import RevokeInvitationErrorBody, revoke_invitation_error_mapper
from ..errors.update_member_role_error import UpdateMemberRoleErrorBody, update_member_role_error_mapper
from ..models.accept_invitation_request import AcceptInvitationRequest, AcceptInvitationRequestDict
from ..models.create_invitation_request import CreateInvitationRequest, CreateInvitationRequestDict
from ..models.enums.x_requested_with import XRequestedWithOrStr
from ..models.invitation_created_response import InvitationCreatedResponse
from ..models.invitation_token_request import InvitationTokenRequest, InvitationTokenRequestDict
from ..models.invitations_accept_response import InvitationsAcceptResponse
from ..models.invitations_lookup_response import InvitationsLookupResponse
from ..models.members_invitations_revoke_response import MembersInvitationsRevokeResponse
from ..models.members_response import MembersResponse
from ..models.members_role_response import MembersRoleResponse
from ..models.reset_link_response import ResetLinkResponse
from ..models.update_member_role_request import UpdateMemberRoleRequest, UpdateMemberRoleRequestDict
from ..server.server import Server


class Team:
    def __init__(self, client: RawClient, server: Server, auth: AuthSchemes) -> None:
        self._with_raw_response = TeamWithRawResponse(client, server, auth)

    def accept_invitation(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: AcceptInvitationRequest | AcceptInvitationRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> InvitationsAcceptResponse:
        """Accept an invitation, create the account and sign in.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Accept an invitation: the invitee's name and new password, with the link token.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Accept an invitation, create the account and sign in

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). The request conflicts
                with current state; see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel |
                RawError``."""
        return unwrap(
            self._with_raw_response.accept_invitation(x_requested_with, body, request_options=request_options)
        )

    def invite_member(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: CreateInvitationRequest | CreateInvitationRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> InvitationCreatedResponse:
        """Invite someone (returns the one-time link; emailed when email is configured). Requires the OWNER role.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Invite an email address with a role.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Invite someone (returns the one-time link; emailed when email is configured)

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. The request conflicts with current state; see ``code``. Rate limited
                (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.invite_member(x_requested_with, body, request_options=request_options))

    def issue_member_reset_link(
        self, id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> ResetLinkResponse:
        """Issue a one-time password reset link for a member. Requires the OWNER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Issue a one-time password reset link for a member

        Raises:
            ApiError: Not signed in, or the session expired (``UNAUTHENTICATED``). The signed-in role is too low
                (``ROLE_REQUIRED``) or the CSRF header is missing. No such resource in your workspace. The request
                conflicts with current state; see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is
                ``ApiErrorModel | RawError``."""
        return unwrap(
            self._with_raw_response.issue_member_reset_link(id_, x_requested_with, request_options=request_options)
        )

    def list_members(self, *, request_options: RequestOptionsOrDict | None = None) -> MembersResponse:
        """Members, and open invitations for owners.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Members, and open invitations for owners

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.list_members(request_options=request_options))

    def lookup_invitation(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: InvitationTokenRequest | InvitationTokenRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> InvitationsLookupResponse:
        """Preview an invitation from its link token.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: An invitation link token.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Preview an invitation from its link token

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). The request conflicts
                with current state; see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel |
                RawError``."""
        return unwrap(
            self._with_raw_response.lookup_invitation(x_requested_with, body, request_options=request_options)
        )

    def remove_member(
        self, id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> None:
        """Remove a member. Requires the OWNER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Done; no content.

        Raises:
            ApiError: Not signed in, or the session expired (``UNAUTHENTICATED``). The signed-in role is too low
                (``ROLE_REQUIRED``) or the CSRF header is missing. No such resource in your workspace. The request
                conflicts with current state; see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is
                ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.remove_member(id_, x_requested_with, request_options=request_options))

    def revoke_invitation(
        self, id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> MembersInvitationsRevokeResponse:
        """Revoke an open invitation. Requires the OWNER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Revoke an open invitation

        Raises:
            ApiError: Not signed in, or the session expired (``UNAUTHENTICATED``). The signed-in role is too low
                (``ROLE_REQUIRED``) or the CSRF header is missing. No such resource in your workspace. The request
                conflicts with current state; see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is
                ``ApiErrorModel | RawError``."""
        return unwrap(self._with_raw_response.revoke_invitation(id_, x_requested_with, request_options=request_options))

    def update_member_role(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        body: UpdateMemberRoleRequest | UpdateMemberRoleRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> MembersRoleResponse:
        """Change a member's role (a workspace keeps at least one owner). Requires the OWNER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: A member's new role.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Change a member's role (a workspace keeps at least one owner)

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. The request conflicts with current state; see
                ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            self._with_raw_response.update_member_role(id_, x_requested_with, body, request_options=request_options)
        )

    @property
    def with_raw_response(self) -> TeamWithRawResponse:
        return self._with_raw_response


class AsyncTeam:
    def __init__(self, client: AsyncRawClient, server: Server, auth: AsyncAuthSchemes) -> None:
        self._with_raw_response = AsyncTeamWithRawResponse(client, server, auth)

    async def accept_invitation(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: AcceptInvitationRequest | AcceptInvitationRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> InvitationsAcceptResponse:
        """Accept an invitation, create the account and sign in.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Accept an invitation: the invitee's name and new password, with the link token.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Accept an invitation, create the account and sign in

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). The request conflicts
                with current state; see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel |
                RawError``."""
        return unwrap(
            await self._with_raw_response.accept_invitation(x_requested_with, body, request_options=request_options)
        )

    async def invite_member(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: CreateInvitationRequest | CreateInvitationRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> InvitationCreatedResponse:
        """Invite someone (returns the one-time link; emailed when email is configured). Requires the OWNER role.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Invite an email address with a role.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Invite someone (returns the one-time link; emailed when email is configured)

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. The request conflicts with current state; see ``code``. Rate limited
                (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            await self._with_raw_response.invite_member(x_requested_with, body, request_options=request_options)
        )

    async def issue_member_reset_link(
        self, id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> ResetLinkResponse:
        """Issue a one-time password reset link for a member. Requires the OWNER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Issue a one-time password reset link for a member

        Raises:
            ApiError: Not signed in, or the session expired (``UNAUTHENTICATED``). The signed-in role is too low
                (``ROLE_REQUIRED``) or the CSRF header is missing. No such resource in your workspace. The request
                conflicts with current state; see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is
                ``ApiErrorModel | RawError``."""
        return unwrap(
            await self._with_raw_response.issue_member_reset_link(
                id_, x_requested_with, request_options=request_options
            ),
        )

    async def list_members(self, *, request_options: RequestOptionsOrDict | None = None) -> MembersResponse:
        """Members, and open invitations for owners.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Members, and open invitations for owners

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(await self._with_raw_response.list_members(request_options=request_options))

    async def lookup_invitation(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: InvitationTokenRequest | InvitationTokenRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> InvitationsLookupResponse:
        """Preview an invitation from its link token.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: An invitation link token.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Preview an invitation from its link token

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). The request conflicts
                with current state; see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel |
                RawError``."""
        return unwrap(
            await self._with_raw_response.lookup_invitation(x_requested_with, body, request_options=request_options)
        )

    async def remove_member(
        self, id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> None:
        """Remove a member. Requires the OWNER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Done; no content.

        Raises:
            ApiError: Not signed in, or the session expired (``UNAUTHENTICATED``). The signed-in role is too low
                (``ROLE_REQUIRED``) or the CSRF header is missing. No such resource in your workspace. The request
                conflicts with current state; see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is
                ``ApiErrorModel | RawError``."""
        return unwrap(
            await self._with_raw_response.remove_member(id_, x_requested_with, request_options=request_options)
        )

    async def revoke_invitation(
        self, id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> MembersInvitationsRevokeResponse:
        """Revoke an open invitation. Requires the OWNER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Revoke an open invitation

        Raises:
            ApiError: Not signed in, or the session expired (``UNAUTHENTICATED``). The signed-in role is too low
                (``ROLE_REQUIRED``) or the CSRF header is missing. No such resource in your workspace. The request
                conflicts with current state; see ``code``. Rate limited (``RATE_LIMITED``). ``error`` is
                ``ApiErrorModel | RawError``."""
        return unwrap(
            await self._with_raw_response.revoke_invitation(id_, x_requested_with, request_options=request_options)
        )

    async def update_member_role(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        body: UpdateMemberRoleRequest | UpdateMemberRoleRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> MembersRoleResponse:
        """Change a member's role (a workspace keeps at least one owner). Requires the OWNER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: A member's new role.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Change a member's role (a workspace keeps at least one owner)

        Raises:
            ApiError: The request failed validation (``BAD_REQUEST``, details list each field). Not signed in, or the
                session expired (``UNAUTHENTICATED``). The signed-in role is too low (``ROLE_REQUIRED``) or the CSRF
                header is missing. No such resource in your workspace. The request conflicts with current state; see
                ``code``. Rate limited (``RATE_LIMITED``). ``error`` is ``ApiErrorModel | RawError``."""
        return unwrap(
            await self._with_raw_response.update_member_role(
                id_, x_requested_with, body, request_options=request_options
            ),
        )

    @property
    def with_raw_response(self) -> AsyncTeamWithRawResponse:
        return self._with_raw_response


class TeamWithRawResponse(SecuredRawResponse[RawClient, Server, AuthSchemes]):
    def accept_invitation(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: AcceptInvitationRequest | AcceptInvitationRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[InvitationsAcceptResponse, AcceptInvitationErrorBody]:
        """Accept an invitation, create the account and sign in.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Accept an invitation: the invitee's name and new password, with the link token.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/invitations/accept"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[AcceptInvitationRequest | AcceptInvitationRequestDict](body),
            decoder=json_decoder[InvitationsAcceptResponse],
            error_mapper=accept_invitation_error_mapper,
            request_options=request_options,
        )

    def invite_member(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: CreateInvitationRequest | CreateInvitationRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[InvitationCreatedResponse, InviteMemberErrorBody]:
        """Invite someone (returns the one-time link; emailed when email is configured). Requires the OWNER role.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Invite an email address with a role.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/members/invitations"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[CreateInvitationRequest | CreateInvitationRequestDict](body),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[InvitationCreatedResponse],
            error_mapper=invite_member_error_mapper,
            request_options=request_options,
        )

    def issue_member_reset_link(
        self, id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[ResetLinkResponse, IssueMemberResetLinkErrorBody]:
        """Issue a one-time password reset link for a member. Requires the OWNER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/members/{id}/password-reset"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[ResetLinkResponse],
            error_mapper=issue_member_reset_link_error_mapper,
            request_options=request_options,
        )

    def list_members(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[MembersResponse, ListMembersErrorBody]:
        """Members, and open invitations for owners.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/members"),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[MembersResponse],
            error_mapper=list_members_error_mapper,
            request_options=request_options,
        )

    def lookup_invitation(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: InvitationTokenRequest | InvitationTokenRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[InvitationsLookupResponse, LookupInvitationErrorBody]:
        """Preview an invitation from its link token.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: An invitation link token.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/invitations/lookup"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[InvitationTokenRequest | InvitationTokenRequestDict](body),
            decoder=json_decoder[InvitationsLookupResponse],
            error_mapper=lookup_invitation_error_mapper,
            request_options=request_options,
        )

    def remove_member(
        self, id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[None, RemoveMemberErrorBody]:
        """Remove a member. Requires the OWNER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/members/{id}/remove"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=empty_response,
            error_mapper=remove_member_error_mapper,
            request_options=request_options,
        )

    def revoke_invitation(
        self, id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[MembersInvitationsRevokeResponse, RevokeInvitationErrorBody]:
        """Revoke an open invitation. Requires the OWNER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/members/invitations/{id}/revoke"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[MembersInvitationsRevokeResponse],
            error_mapper=revoke_invitation_error_mapper,
            request_options=request_options,
        )

    def update_member_role(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        body: UpdateMemberRoleRequest | UpdateMemberRoleRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[MembersRoleResponse, UpdateMemberRoleErrorBody]:
        """Change a member's role (a workspace keeps at least one owner). Requires the OWNER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: A member's new role.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="PUT",
            url_template=self._server.default("/members/{id}/role"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[UpdateMemberRoleRequest | UpdateMemberRoleRequestDict](body),
            auth_scheme=AnySchemes(self._auth.secure_session, self._auth.session),
            decoder=json_decoder[MembersRoleResponse],
            error_mapper=update_member_role_error_mapper,
            request_options=request_options,
        )


class AsyncTeamWithRawResponse(SecuredRawResponse[AsyncRawClient, Server, AsyncAuthSchemes]):
    async def accept_invitation(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: AcceptInvitationRequest | AcceptInvitationRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[InvitationsAcceptResponse, AcceptInvitationErrorBody]:
        """Accept an invitation, create the account and sign in.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Accept an invitation: the invitee's name and new password, with the link token.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/invitations/accept"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[AcceptInvitationRequest | AcceptInvitationRequestDict](body),
            decoder=async_json_decoder[InvitationsAcceptResponse],
            error_mapper=accept_invitation_error_mapper,
            request_options=request_options,
        )

    async def invite_member(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: CreateInvitationRequest | CreateInvitationRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[InvitationCreatedResponse, InviteMemberErrorBody]:
        """Invite someone (returns the one-time link; emailed when email is configured). Requires the OWNER role.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: Invite an email address with a role.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/members/invitations"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[CreateInvitationRequest | CreateInvitationRequestDict](body),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[InvitationCreatedResponse],
            error_mapper=invite_member_error_mapper,
            request_options=request_options,
        )

    async def issue_member_reset_link(
        self, id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[ResetLinkResponse, IssueMemberResetLinkErrorBody]:
        """Issue a one-time password reset link for a member. Requires the OWNER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/members/{id}/password-reset"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[ResetLinkResponse],
            error_mapper=issue_member_reset_link_error_mapper,
            request_options=request_options,
        )

    async def list_members(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[MembersResponse, ListMembersErrorBody]:
        """Members, and open invitations for owners.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/members"),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[MembersResponse],
            error_mapper=list_members_error_mapper,
            request_options=request_options,
        )

    async def lookup_invitation(
        self,
        x_requested_with: XRequestedWithOrStr,
        body: InvitationTokenRequest | InvitationTokenRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[InvitationsLookupResponse, LookupInvitationErrorBody]:
        """Preview an invitation from its link token.

        Args:
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: An invitation link token.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/invitations/lookup"),
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[InvitationTokenRequest | InvitationTokenRequestDict](body),
            decoder=async_json_decoder[InvitationsLookupResponse],
            error_mapper=lookup_invitation_error_mapper,
            request_options=request_options,
        )

    async def remove_member(
        self, id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[None, RemoveMemberErrorBody]:
        """Remove a member. Requires the OWNER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/members/{id}/remove"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_empty_response,
            error_mapper=remove_member_error_mapper,
            request_options=request_options,
        )

    async def revoke_invitation(
        self, id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[MembersInvitationsRevokeResponse, RevokeInvitationErrorBody]:
        """Revoke an open invitation. Requires the OWNER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/members/invitations/{id}/revoke"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[MembersInvitationsRevokeResponse],
            error_mapper=revoke_invitation_error_mapper,
            request_options=request_options,
        )

    async def update_member_role(
        self,
        id_: UUID,
        x_requested_with: XRequestedWithOrStr,
        body: UpdateMemberRoleRequest | UpdateMemberRoleRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[MembersRoleResponse, UpdateMemberRoleErrorBody]:
        """Change a member's role (a workspace keeps at least one owner). Requires the OWNER role.

        Args:
            id_: Resource id (UUID).
            x_requested_with: CSRF guard: must be ``quartermaster`` on every mutation.
            body: A member's new role.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="PUT",
            url_template=self._server.default("/members/{id}/role"),
            path_params=[param[UUID]("id", id_)],
            headers=[
                param[XRequestedWithOrStr]("X-Requested-With", x_requested_with),
                param[UUID]("Idempotency-Key", uuid4()),
            ],
            body=json_body[UpdateMemberRoleRequest | UpdateMemberRoleRequestDict](body),
            auth_scheme=AsyncAnySchemes(self._auth.secure_session, self._auth.session),
            decoder=async_json_decoder[MembersRoleResponse],
            error_mapper=update_member_role_error_mapper,
            request_options=request_options,
        )
