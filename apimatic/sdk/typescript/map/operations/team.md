<!-- Generated file — do not edit; regenerated with the SDK. -->

# Team — operations

Accessor: `client.team` · Source: `src/resources/team.ts` · 8 operations · Request and error types: namespace `Team`

**Type sources**: every type an operation names, with the file that declares it and the schema value exported beside it. Import every name from `quartermaster-ai-trust-rail-api`; the `Source` path is where to **read** the shape, never what to import. `ApiError`, the runtime error family and the file vocabulary are excluded — see sdk-map.md.

### acceptInvitation

- **Signature**: `acceptInvitation(request: Team.AcceptInvitationRequestParams, options?: RequestOptions): ApiPromise<InvitationsAcceptResponse, Team.AcceptInvitationError>`
- **Wire**: `POST /invitations/accept`
- **Auth**: none — public; no credential is sent
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `InvitationsAcceptResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Team.AcceptInvitationError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [409] `ApiErrorModel` · `"apiErrorModel3"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Team.AcceptInvitationRequestParams` (2):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |
| `body` | `body` | — | `AcceptInvitationRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `AcceptInvitationRequest` | `acceptInvitationRequestSchema` | `src/models/accept-invitation-request.ts` |
| `InvitationsAcceptResponse` | `invitationsAcceptResponseSchema` | `src/models/invitations-accept-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### inviteMember

- **Signature**: `inviteMember(request: Team.InviteMemberRequest, options?: RequestOptions): ApiPromise<InvitationCreatedResponse, Team.InviteMemberError>`
- **Wire**: `POST /members/invitations`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `InvitationCreatedResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Team.InviteMemberError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [409] `ApiErrorModel` · `"apiErrorModel5"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Team.InviteMemberRequest` (2):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |
| `body` | `body` | — | `CreateInvitationRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `CreateInvitationRequest` | `createInvitationRequestSchema` | `src/models/create-invitation-request.ts` |
| `InvitationCreatedResponse` | `invitationCreatedResponseSchema` | `src/models/invitation-created-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### issueMemberResetLink

- **Signature**: `issueMemberResetLink(request: Team.IssueMemberResetLinkRequest, options?: RequestOptions): ApiPromise<ResetLinkResponse, Team.IssueMemberResetLinkError>`
- **Wire**: `POST /members/{id}/password-reset`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `ResetLinkResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Team.IssueMemberResetLinkError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [401] `ApiErrorModel` · `"apiErrorModel2"` [403] `ApiErrorModel` · `"apiErrorModel3"` [404] `ApiErrorModel` · `"apiErrorModel4"` [409] `ApiErrorModel` · `"apiErrorModel5"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Team.IssueMemberResetLinkRequest` (2):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `id` | `path` | — | `string` | yes |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `ResetLinkResponse` | `resetLinkResponseSchema` | `src/models/reset-link-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### listMembers

- **Signature**: `listMembers(options?: RequestOptions): ApiPromise<MembersResponse, Team.ListMembersError>`
- **Wire**: `GET /members`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `MembersResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Team.ListMembersError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

| Type | Schema value | Source |
| --- | --- | --- |
| `MembersResponse` | `membersResponseSchema` | `src/models/members-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### lookupInvitation

- **Signature**: `lookupInvitation(request: Team.LookupInvitationRequest, options?: RequestOptions): ApiPromise<InvitationsLookupResponse, Team.LookupInvitationError>`
- **Wire**: `POST /invitations/lookup`
- **Auth**: none — public; no credential is sent
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `InvitationsLookupResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Team.LookupInvitationError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [409] `ApiErrorModel` · `"apiErrorModel3"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Team.LookupInvitationRequest` (2):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |
| `body` | `body` | — | `InvitationTokenRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `InvitationTokenRequest` | `invitationTokenRequestSchema` | `src/models/invitation-token-request.ts` |
| `InvitationsLookupResponse` | `invitationsLookupResponseSchema` | `src/models/invitations-lookup-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### removeMember

- **Signature**: `removeMember(request: Team.RemoveMemberRequest, options?: RequestOptions): ApiPromise<undefined, Team.RemoveMemberError>`
- **Wire**: `POST /members/{id}/remove`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `undefined` — the operation resolves to nothing
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Team.RemoveMemberError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [401] `ApiErrorModel` · `"apiErrorModel2"` [403] `ApiErrorModel` · `"apiErrorModel3"` [404] `ApiErrorModel` · `"apiErrorModel4"` [409] `ApiErrorModel` · `"apiErrorModel5"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Team.RemoveMemberRequest` (2):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `id` | `path` | — | `string` | yes |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### revokeInvitation

- **Signature**: `revokeInvitation(request: Team.RevokeInvitationRequest, options?: RequestOptions): ApiPromise<MembersInvitationsRevokeResponse, Team.RevokeInvitationError>`
- **Wire**: `POST /members/invitations/{id}/revoke`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: none — no `Content-Type` header is sent
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `MembersInvitationsRevokeResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Team.RevokeInvitationError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [401] `ApiErrorModel` · `"apiErrorModel2"` [403] `ApiErrorModel` · `"apiErrorModel3"` [404] `ApiErrorModel` · `"apiErrorModel4"` [409] `ApiErrorModel` · `"apiErrorModel5"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Team.RevokeInvitationRequest` (2):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `id` | `path` | — | `string` | yes |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `MembersInvitationsRevokeResponse` | `membersInvitationsRevokeResponseSchema` | `src/models/members-invitations-revoke-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

### updateMemberRole

- **Signature**: `updateMemberRole(request: Team.UpdateMemberRoleRequestParams, options?: RequestOptions): ApiPromise<MembersRoleResponse, Team.UpdateMemberRoleError>`
- **Wire**: `PUT /members/{id}/role`
- **Auth**: any of `secureSession`, `session` — the first one configured is sent
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `MembersRoleResponse`
- **Error**: `QuartermasterAiTrustRailApiError` with `kind: "api"`, an instance of `Team.UpdateMemberRoleError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"apiErrorModel"` [400] `ApiErrorModel` · `"apiErrorModel2"` [401] `ApiErrorModel` · `"apiErrorModel3"` [403] `ApiErrorModel` · `"apiErrorModel4"` [404] `ApiErrorModel` · `"apiErrorModel5"` [409] `ApiErrorModel` · `"apiErrorModel6"` [429] `ApiErrorModel` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Team.UpdateMemberRoleRequestParams` (3):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `id` | `path` | — | `string` | yes |
| `xRequestedWith` | `header` | `X-Requested-With` | `XRequestedWith` | yes |
| `body` | `body` | — | `UpdateMemberRoleRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `XRequestedWith` | `xRequestedWithSchema` | `src/models/xrequested-with.ts` |
| `UpdateMemberRoleRequest` | `updateMemberRoleRequestSchema` | `src/models/update-member-role-request.ts` |
| `MembersRoleResponse` | `membersRoleResponseSchema` | `src/models/members-role-response.ts` |
| `ApiErrorModel` | `apiErrorModelSchema` | `src/models/api-error-model.ts` |

