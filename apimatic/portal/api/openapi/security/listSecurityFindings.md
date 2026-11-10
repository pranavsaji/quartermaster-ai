# TrustRail findings and evidence (/api/openapi/security/listSecurityFindings)

`GET /security/events`

TrustRail findings and evidence.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /security/events:
    get:
      operationId: listSecurityFindings
      summary: TrustRail findings and evidence
      description: TrustRail findings and evidence.
      tags:
        - Security
      parameters: []
      security:
        - secureSession: []
        - session: []
      responses:
        "200":
          description: TrustRail findings and evidence
          content:
            application/json:
              schema:
                type: object
                properties:
                  items:
                    type: array
                    items:
                      $ref: "#/components/schemas/SecurityFindingDto"
                  next_cursor:
                    type:
                      - string
                      - "null"
                    description: Pass as `cursor` for the next page; null on the last page.
                required:
                  - items
                  - next_cursor
        "400":
          $ref: "#/components/responses/BadRequest"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"
        "429":
          $ref: "#/components/responses/TooManyRequests"
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.security_api.list_security_findings()
                  # TODO: Handle 'response' of type SecurityEventsResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # ListSecurityFindingsErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response =
                  await client.securityApi.listSecurityFindings();
                // TODO: Handle 'response' of type SecurityEventsResponse
              } catch (err) {
                // TODO: Handle 'err' of type SecurityApi.ListSecurityFindingsError, discriminated with 'err.payload.kind'
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
    SecurityFindingDto:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        type:
          $ref: "#/components/schemas/FindingType"
        severity:
          $ref: "#/components/schemas/Severity"
        title:
          type: string
          description: Short title.
        description:
          type: string
          description: Free-text description.
        source_kind:
          type: string
        source_id:
          type:
            - string
            - "null"
          description: Id of the related source.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        evidence:
          type: object
          additionalProperties: true
        related_purchase_order_id:
          type:
            - string
            - "null"
          description: Id of the related related purchase order.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        related_request_id:
          type:
            - string
            - "null"
          description: Id of the related related request.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        created_at:
          type: string
          description: When created happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
      required:
        - id
        - type
        - severity
        - title
        - description
        - source_kind
        - source_id
        - evidence
        - related_purchase_order_id
        - related_request_id
        - created_at
      additionalProperties: false
      description: A security finding (prompt injection, unauthorised fee, duplicate,
        signature failure...).
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
    FindingType:
      type: string
      enum:
        - PROMPT_INJECTION
        - UNAUTHORIZED_FEE
        - POLICY_VIOLATION
        - CART_TAMPERING
        - DUPLICATE_INVOICE
        - INVOICE_DISCREPANCY
        - WEBHOOK_SIGNATURE_INVALID
        - CERTIFICATE_VERIFICATION_FAILED
        - PAYMENT_AMOUNT_MISMATCH
        - ACCESS_DENIED
        - PAYMENT_REVERSED
      description: Kind of security finding.
    Severity:
      type: string
      enum:
        - LOW
        - MEDIUM
        - HIGH
        - CRITICAL
      description: Finding severity.
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