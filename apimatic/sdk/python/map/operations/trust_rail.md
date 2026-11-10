<!-- Generated file — do not edit; regenerated with the SDK. -->

# TrustRail — operations

Accessor: `client.trust_rail` · Source: `quartermaster_ai_trust_rail_api/apis/trust_rail.py` · 3 operations

Each `###` block is one operation and assumes `sdk-map.md` is loaded: blocks omit what its invariants table covers and are otherwise self-contained, so chunk at block level. Signatures are the sync parsed spelling; the async and raw spellings take the same parameters (see sdk-map.md). **Type sources** names the module declaring each type an operation mentions, so resolving a body, return or error payload is a lookup rather than a search; the runtime types `RawError` and `ApiResult` are excluded.

### client.trust_rail.get_spend_mandate

- **Route**: `GET /mandates/current`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def get_spend_mandate(*, request_options: RequestOptionsOrDict | None = None)`
- **Returns (parsed)**: `MandatesCurrentResponse`
- **Returns (raw)**: `ApiResult[MandatesCurrentResponse, GetSpendMandateErrorBody]`
- **Error**: `GetSpendMandateErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `MandatesCurrentResponse` | `quartermaster_ai_trust_rail_api/models/mandates_current_response.py` |
| `GetSpendMandateErrorBody` | `quartermaster_ai_trust_rail_api/errors/get_spend_mandate_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.trust_rail.update_spend_mandate

- **Route**: `PUT /mandates/current`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def update_spend_mandate(x_requested_with: XRequestedWithOrStr, idempotency_key: str, body: SpendMandateInput | SpendMandateInputDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `x_requested_with`, `idempotency_key`, `body`
- **Params**: `x_requested_with` — header `X-Requested-With` · `idempotency_key` — header `Idempotency-Key` · `body` — JSON body
- **Returns (parsed)**: `MandateUpdateResponse`
- **Returns (raw)**: `ApiResult[MandateUpdateResponse, UpdateSpendMandateErrorBody]`
- **Error**: `UpdateSpendMandateErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 409, 422, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `XRequestedWithOrStr` | `quartermaster_ai_trust_rail_api/models/enums/x_requested_with.py` |
| `SpendMandateInput` | `quartermaster_ai_trust_rail_api/models/spend_mandate_input.py` |
| `SpendMandateInputDict` | `quartermaster_ai_trust_rail_api/models/spend_mandate_input.py` |
| `MandateUpdateResponse` | `quartermaster_ai_trust_rail_api/models/mandate_update_response.py` |
| `UpdateSpendMandateErrorBody` | `quartermaster_ai_trust_rail_api/errors/update_spend_mandate_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

### client.trust_rail.verify_intent_certificate

- **Route**: `GET /intents/{id}/verify`
- **Auth**: `secure_session` OR `session`
- **Signature**: `def verify_intent_certificate(id_: UUID, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`
- **Params**: `id_` — path `id`
- **Returns (parsed)**: `CertificateVerificationDto`
- **Returns (raw)**: `ApiResult[CertificateVerificationDto, VerifyIntentCertificateErrorBody]`
- **Error**: `VerifyIntentCertificateErrorBody` — **Case A (typed)**
- **Error arms**: `ApiErrorModel` [400, 401, 403, 404, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `CertificateVerificationDto` | `quartermaster_ai_trust_rail_api/models/certificate_verification_dto.py` |
| `VerifyIntentCertificateErrorBody` | `quartermaster_ai_trust_rail_api/errors/verify_intent_certificate_error.py` |
| `ApiErrorModel` | `quartermaster_ai_trust_rail_api/models/api_error_model.py` |

