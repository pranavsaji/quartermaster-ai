# Verify an Intent Certificate against the live cart (/api/openapi/trustrail/verifyIntentCertificate)

`GET /intents/{id}/verify`

Verify an Intent Certificate against the live cart.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /intents/{id}/verify:
    get:
      operationId: verifyIntentCertificate
      summary: Verify an Intent Certificate against the live cart
      description: Verify an Intent Certificate against the live cart.
      tags:
        - TrustRail
      parameters:
        - name: id
          in: path
          required: true
          description: Resource id (UUID).
          schema:
            type: string
            format: uuid
            description: Resource id (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
      security:
        - secureSession: []
        - session: []
      responses:
        "200":
          description: Verify an Intent Certificate against the live cart
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/CertificateVerificationDto"
        "400":
          $ref: "#/components/responses/BadRequest"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"
        "404":
          $ref: "#/components/responses/NotFound"
        "429":
          $ref: "#/components/responses/TooManyRequests"
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.trust_rail.verify_intent_certificate(
                      UUID("0f8fad5b-d9cb-469f-a165-70867728950e")
                  )
                  # TODO: Handle 'response' of type
                  # CertificateVerificationDto
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # VerifyIntentCertificateErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response =
                  await client.trustRail.verifyIntentCertificate({
                    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
                  });
                // TODO: Handle 'response' of type CertificateVerificationDto
              } catch (err) {
                // TODO: Handle 'err' of type TrustRail.VerifyIntentCertificateError, discriminated with 'err.payload.kind'
              }
components:
  securitySchemes:
    session:
      type: apiKey
      in: cookie
      name: qm_session
      description: Session cookie set by sign-in on local development servers.
    secureSession:
      type: apiKey
      in: cookie
      name: __Host-qm_session
      description: Session cookie set by sign-in on HTTPS deployments (the hosted demo).
  schemas:
    CertificateVerificationDto:
      type: object
      properties:
        intent_id:
          type: string
          description: Id of the related intent.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        status:
          $ref: "#/components/schemas/CertificateVerificationStatus"
        valid:
          type: boolean
          description: Whether verification passed.
          example: true
        checks:
          type: array
          items:
            $ref: "#/components/schemas/PolicyCheckDto"
        certificate:
          $ref: "#/components/schemas/IntentCertificateDto"
        verified_at:
          type: string
          description: When verified happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
      required:
        - intent_id
        - status
        - valid
        - checks
        - certificate
        - verified_at
      additionalProperties: false
      description: Result of verifying an Intent Certificate's signature and bindings.
    ApiError:
      type: object
      properties:
        error:
          type: object
          properties:
            code:
              type: string
              description: Stable machine-readable code.
            message:
              type: string
              description: Human-readable message (fixed per code).
            details: {}
            correlation_id:
              type: string
              description: Request correlation id; quote it to support to find the server
                logs.
              example: 0f8fad5b-d9cb-469f-a165-70867728950e
          required:
            - code
            - message
          additionalProperties: false
      required:
        - error
      additionalProperties: false
      description: Error envelope shared by every endpoint. `code` is stable;
        `message` is fixed per code.
    CertificateVerificationStatus:
      type: string
      enum:
        - VALID
        - EXPIRED
        - CART_MODIFIED
        - SIGNATURE_INVALID
        - UNKNOWN_KEY
        - MANDATE_CHANGED
        - REVOKED
        - CONSUMED
        - PAYLOAD_MISMATCH
      description: Outcome of a certificate verification.
    PolicyCheckDto:
      type: object
      properties:
        code:
          type: string
          description: Stable machine-readable code.
        passed:
          type: boolean
          example: true
        detail:
          type: string
      required:
        - code
        - passed
        - detail
      additionalProperties: false
      description: One TrustRail policy check and its result.
    IntentCertificateDto:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        status:
          $ref: "#/components/schemas/CertificateStatus"
        payload:
          $ref: "#/components/schemas/IntentCertificatePayload"
        key_id:
          type: string
          description: Id of the related key.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        signature:
          type: string
        algorithm:
          type: string
          const: Ed25519
          example: Ed25519
        issued_at:
          type: string
          description: When issued happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
        expires_at:
          type: string
          description: When expires happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
      required:
        - id
        - status
        - payload
        - key_id
        - signature
        - algorithm
        - issued_at
        - expires_at
      additionalProperties: false
      description: The owner's signed approval of one exact cart (Ed25519).
    CertificateStatus:
      type: string
      enum:
        - ACTIVE
        - CONSUMED
        - REVOKED
        - EXPIRED
      description: Lifecycle of an Intent Certificate.
    IntentCertificatePayload:
      type: object
      properties:
        certificate_version:
          type: number
          const: 1
          example: 1
        intent_id:
          type: string
          description: Id of the related intent.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        organization_id:
          type: string
          description: Id of the related organization.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        buyer_id:
          type: string
          description: Id of the related buyer.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        purchase_order_id:
          type: string
          description: Id of the related purchase order.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        supplier_id:
          type: string
          description: Id of the related supplier.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        cart_hash:
          type: string
          description: SHA-256 of the canonical cart, bound into the Intent Certificate.
          example: sha256:9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f
        mandate_id:
          type: string
          description: Id of the related mandate.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        mandate_version:
          type: number
          example: 1
        policy_decision_id:
          type: string
          description: Id of the related policy decision.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        currency:
          type: string
          description: ISO 4217 currency code.
          example: USD
        approved_amount_minor:
          type: integer
          description: Approved amount, in minor units (cents).
          example: 17320
        approved_at:
          type: string
          description: When approved happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
        expires_at:
          type: string
          description: When expires happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
        nonce:
          type: string
        key_id:
          type: string
          description: Id of the related key.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
      required:
        - certificate_version
        - intent_id
        - organization_id
        - buyer_id
        - purchase_order_id
        - supplier_id
        - cart_hash
        - mandate_id
        - mandate_version
        - policy_decision_id
        - currency
        - approved_amount_minor
        - approved_at
        - expires_at
        - nonce
        - key_id
      additionalProperties: false
      description: The signed fields of an Intent Certificate.
  responses:
    BadRequest:
      description: The request failed validation (`BAD_REQUEST`, details list each field).
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ApiError"
    Unauthorized:
      description: Not signed in, or the session expired (`UNAUTHENTICATED`).
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ApiError"
    Forbidden:
      description: The signed-in role is too low (`ROLE_REQUIRED`) or the CSRF header
        is missing.
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ApiError"
    NotFound:
      description: No such resource in your workspace.
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ApiError"
    TooManyRequests:
      description: Rate limited (`RATE_LIMITED`).
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ApiError"
info:
  title: Quartermaster AI + TrustRail API
  version: 1.0.0
```