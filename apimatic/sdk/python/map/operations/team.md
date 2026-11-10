<!-- Generated file — do not edit; regenerated with the SDK. -->

# Team — operations

Accessor: `client.team` · Source: `quartermaster_ai_trust_rail_api/apis/team.py` · 8 operations

Each `###` block is one operation and assumes `sdk-map.md` is loaded: blocks omit what its invariants table covers and are otherwise self-contained, so chunk at block level. Signatures are the sync parsed spelling; the async and raw spellings take the same parameters (see sdk-map.md). **Type sources** names the module declaring each type an operation mentions, so resolving a body, return or error payload is a lookup rather than a search; the runtime types `RawError` and `ApiResult` are excluded.

### client.team.accept_invitation

- **Route**: `POST /invitations/accept`
- **Signature**: `def accept_invitation(x_requested_with: XRequestedWithOrStr, body: AcceptInvitationRequest | AcceptInvitationRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `x_requested_with`, `body`
- **Params**: `x_requested_with` — header `X-Requested-With` · `body` — JSON body
- **Returns (parsed)**: `InvitationsAcceptResponse`
- **Returns (raw)**: `ApiResult[InvitationsAcceptResponse, AcceptInvitationErrorBody]`
- **Error**: `AcceptInvitationErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 409, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `AcceptInvitationRequest` | `quartermaster_ai_trust_rail_api/models/accept_invitation_request.py` |
| `AcceptInvitationRequestDict` | `quartermaster_ai_trust_rail_api/models/accept_invitation_request.py` |
| `InvitationsAcceptResponse` | `quartermaster_ai_trust_rail_api/models/invitations_accept_response.py` |
| `AcceptInvitationErrorBody` | `quartermaster_ai_trust_rail_api/errors/accept_invitation_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.team.invite_member

- **Route**: `POST /members/invitations`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def invite_member(x_requested_with: XRequestedWithOrStr, body: CreateInvitationRequest | CreateInvitationRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `x_requested_with`, `body`
- **Params**: `x_requested_with` — header `X-Requested-With` · `body` — JSON body
- **Returns (parsed)**: `InvitationCreatedResponse`
- **Returns (raw)**: `ApiResult[InvitationCreatedResponse, InviteMemberErrorBody]`
- **Error**: `InviteMemberErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 409, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `CreateInvitationRequest` | `quartermaster_ai_trust_rail_api/models/create_invitation_request.py` |
| `CreateInvitationRequestDict` | `quartermaster_ai_trust_rail_api/models/create_invitation_request.py` |
| `InvitationCreatedResponse` | `quartermaster_ai_trust_rail_api/models/invitation_created_response.py` |
| `InviteMemberErrorBody` | `quartermaster_ai_trust_rail_api/errors/invite_member_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.team.issue_member_reset_link

- **Route**: `POST /members/{id}/password-reset`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def issue_member_reset_link(id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`, `x_requested_with`
- **Params**: `id_` — path `id` · `x_requested_with` — header `X-Requested-With`
- **Returns (parsed)**: `ResetLinkResponse`
- **Returns (raw)**: `ApiResult[ResetLinkResponse, IssueMemberResetLinkErrorBody]`
- **Error**: `IssueMemberResetLinkErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [401, 403, 404, 409, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `ResetLinkResponse` | `quartermaster_ai_trust_rail_api/models/reset_link_response.py` |
| `IssueMemberResetLinkErrorBody` | `quartermaster_ai_trust_rail_api/errors/issue_member_reset_link_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.team.list_members

- **Route**: `GET /members`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def list_members(*, request_options: RequestOptionsOrDict | None = None)`
- **Returns (parsed)**: `MembersResponse`
- **Returns (raw)**: `ApiResult[MembersResponse, ListMembersErrorBody]`
- **Error**: `ListMembersErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `MembersResponse` | `quartermaster_ai_trust_rail_api/models/members_response.py` |
| `ListMembersErrorBody` | `quartermaster_ai_trust_rail_api/errors/list_members_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.team.lookup_invitation

- **Route**: `POST /invitations/lookup`
- **Signature**: `def lookup_invitation(x_requested_with: XRequestedWithOrStr, body: InvitationTokenRequest | InvitationTokenRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `x_requested_with`, `body`
- **Params**: `x_requested_with` — header `X-Requested-With` · `body` — JSON body
- **Returns (parsed)**: `InvitationsLookupResponse`
- **Returns (raw)**: `ApiResult[InvitationsLookupResponse, LookupInvitationErrorBody]`
- **Error**: `LookupInvitationErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 409, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `InvitationTokenRequest` | `quartermaster_ai_trust_rail_api/models/invitation_token_request.py` |
| `InvitationTokenRequestDict` | `quartermaster_ai_trust_rail_api/models/invitation_token_request.py` |
| `InvitationsLookupResponse` | `quartermaster_ai_trust_rail_api/models/invitations_lookup_response.py` |
| `LookupInvitationErrorBody` | `quartermaster_ai_trust_rail_api/errors/lookup_invitation_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.team.remove_member

- **Route**: `POST /members/{id}/remove`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def remove_member(id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`, `x_requested_with`
- **Params**: `id_` — path `id` · `x_requested_with` — header `X-Requested-With`
- **Returns (parsed)**: `None`
- **Returns (raw)**: `ApiResult[None, RemoveMemberErrorBody]`
- **Error**: `RemoveMemberErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [401, 403, 404, 409, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `RemoveMemberErrorBody` | `quartermaster_ai_trust_rail_api/errors/remove_member_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.team.revoke_invitation

- **Route**: `POST /members/invitations/{id}/revoke`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def revoke_invitation(id_: UUID, x_requested_with: XRequestedWithOrStr, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`, `x_requested_with`
- **Params**: `id_` — path `id` · `x_requested_with` — header `X-Requested-With`
- **Returns (parsed)**: `MembersInvitationsRevokeResponse`
- **Returns (raw)**: `ApiResult[MembersInvitationsRevokeResponse, RevokeInvitationErrorBody]`
- **Error**: `RevokeInvitationErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [401, 403, 404, 409, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `MembersInvitationsRevokeResponse` | `quartermaster_ai_trust_rail_api/models/members_invitations_revoke_response.py` |
| `RevokeInvitationErrorBody` | `quartermaster_ai_trust_rail_api/errors/revoke_invitation_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.team.update_member_role

- **Route**: `PUT /members/{id}/role`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def update_member_role(id_: UUID, x_requested_with: XRequestedWithOrStr, body: UpdateMemberRoleRequest | UpdateMemberRoleRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`, `x_requested_with`, `body`
- **Params**: `id_` — path `id` · `x_requested_with` — header `X-Requested-With` · `body` — JSON body
- **Returns (parsed)**: `MembersRoleResponse`
- **Returns (raw)**: `ApiResult[MembersRoleResponse, UpdateMemberRoleErrorBody]`
- **Error**: `UpdateMemberRoleErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 404, 409, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `UpdateMemberRoleRequest` | `quartermaster_ai_trust_rail_api/models/update_member_role_request.py` |
| `UpdateMemberRoleRequestDict` | `quartermaster_ai_trust_rail_api/models/update_member_role_request.py` |
| `MembersRoleResponse` | `quartermaster_ai_trust_rail_api/models/members_role_response.py` |
| `UpdateMemberRoleErrorBody` | `quartermaster_ai_trust_rail_api/errors/update_member_role_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

