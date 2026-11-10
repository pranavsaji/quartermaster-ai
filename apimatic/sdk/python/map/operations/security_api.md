<!-- Generated file — do not edit; regenerated with the SDK. -->

# SecurityApi — operations

Accessor: `client.security_api` · Source: `quartermaster_ai_trust_rail_api/apis/security_api.py` · 5 operations

Each `###` block is one operation and assumes `sdk-map.md` is loaded: blocks omit what its invariants table covers and are otherwise self-contained, so chunk at block level. Signatures are the sync parsed spelling; the async and raw spellings take the same parameters (see sdk-map.md). **Type sources** names the module declaring each type an operation mentions, so resolving a body, return or error payload is a lookup rather than a search; the runtime types `RawError` and `ApiResult` are excluded.

### client.security_api.get_pay_pal_notification_status

- **Route**: `GET /security/paypal-notifications`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def get_pay_pal_notification_status(*, request_options: RequestOptionsOrDict | None = None)`
- **Returns (parsed)**: `SecurityPaypalNotificationsResponse`
- **Returns (raw)**: `ApiResult[SecurityPaypalNotificationsResponse, GetPayPalNotificationStatusErrorBody]`
- **Error**: `GetPayPalNotificationStatusErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `SecurityPaypalNotificationsResponse` | `quartermaster_ai_trust_rail_api/models/security_paypal_notifications_response.py` |
| `GetPayPalNotificationStatusErrorBody` | `quartermaster_ai_trust_rail_api/errors/get_pay_pal_notification_status_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.security_api.list_audit_events

- **Route**: `GET /security/audit`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def list_audit_events(*, request_options: RequestOptionsOrDict | None = None)`
- **Returns (parsed)**: `SecurityAuditResponse`
- **Returns (raw)**: `ApiResult[SecurityAuditResponse, ListAuditEventsErrorBody]`
- **Error**: `ListAuditEventsErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `SecurityAuditResponse` | `quartermaster_ai_trust_rail_api/models/security_audit_response.py` |
| `ListAuditEventsErrorBody` | `quartermaster_ai_trust_rail_api/errors/list_audit_events_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.security_api.list_policy_decisions

- **Route**: `GET /security/decisions`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def list_policy_decisions(*, request_options: RequestOptionsOrDict | None = None)`
- **Returns (parsed)**: `SecurityDecisionsResponse`
- **Returns (raw)**: `ApiResult[SecurityDecisionsResponse, ListPolicyDecisionsErrorBody]`
- **Error**: `ListPolicyDecisionsErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `SecurityDecisionsResponse` | `quartermaster_ai_trust_rail_api/models/security_decisions_response.py` |
| `ListPolicyDecisionsErrorBody` | `quartermaster_ai_trust_rail_api/errors/list_policy_decisions_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.security_api.list_security_findings

- **Route**: `GET /security/events`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def list_security_findings(*, request_options: RequestOptionsOrDict | None = None)`
- **Returns (parsed)**: `SecurityEventsResponse`
- **Returns (raw)**: `ApiResult[SecurityEventsResponse, ListSecurityFindingsErrorBody]`
- **Error**: `ListSecurityFindingsErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `SecurityEventsResponse` | `quartermaster_ai_trust_rail_api/models/security_events_response.py` |
| `ListSecurityFindingsErrorBody` | `quartermaster_ai_trust_rail_api/errors/list_security_findings_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.security_api.verify_audit_chain

- **Route**: `GET /security/audit/verify`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def verify_audit_chain(*, request_options: RequestOptionsOrDict | None = None)`
- **Returns (parsed)**: `AuditChainVerificationDto`
- **Returns (raw)**: `ApiResult[AuditChainVerificationDto, VerifyAuditChainErrorBody]`
- **Error**: `VerifyAuditChainErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `AuditChainVerificationDto` | `quartermaster_ai_trust_rail_api/models/audit_chain_verification_dto.py` |
| `VerifyAuditChainErrorBody` | `quartermaster_ai_trust_rail_api/errors/verify_audit_chain_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

