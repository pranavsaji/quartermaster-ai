# Policy decisions (/api/openapi/security/listPolicyDecisions)

`GET /security/decisions`

Policy decisions.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /security/decisions:
    get:
      operationId: listPolicyDecisions
      summary: Policy decisions
      description: Policy decisions.
      tags:
        - Security
      parameters: []
      security:
        - secureSession: []
        - session: []
      responses:
        "200":
          description: Policy decisions
          content:
            application/json:
              schema:
                type: object
                properties:
                  items:
                    type: array
                    items:
                      $ref: "#/components/schemas/PolicyDecisionDto"
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
                  response = client.security_api.list_policy_decisions()
                  # TODO: Handle 'response' of type
                  # SecurityDecisionsResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # ListPolicyDecisionsErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response =
                  await client.securityApi.listPolicyDecisions();
                // TODO: Handle 'response' of type SecurityDecisionsResponse
              } catch (err) {
                // TODO: Handle 'err' of type SecurityApi.ListPolicyDecisionsError, discriminated with 'err.payload.kind'
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
    PolicyDecisionDto:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        purchase_order_id:
          type: string
          description: Id of the related purchase order.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        decision:
          $ref: "#/components/schemas/PolicyDecisionKind"
        violations:
          type: array
          items:
            $ref: "#/components/schemas/ViolationDto"
        checks:
          type: array
          items:
            $ref: "#/components/schemas/PolicyCheckDto"
        human_approval_required:
          type: boolean
          description: An owner must approve every purchase (always true).
          example: true
        mandate_version:
          type: number
          example: 1
        policy_version:
          type: string
        input_digest:
          type: string
        evaluated_at:
          type: string
          description: When evaluated happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
      required:
        - id
        - purchase_order_id
        - decision
        - violations
        - checks
        - human_approval_required
        - mandate_version
        - policy_version
        - input_digest
        - evaluated_at
      additionalProperties: false
      description: A recorded TrustRail decision with its checks and violations.
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
    PolicyDecisionKind:
      type: string
      enum:
        - ALLOW
        - REVIEW_REQUIRED
        - BLOCK
      description: TrustRail's verdict on a cart.
    ViolationDto:
      type: object
      properties:
        code:
          $ref: "#/components/schemas/ViolationCode"
        severity:
          type: string
          enum:
            - BLOCK
            - REVIEW
          description: Severity.
          example: BLOCK
        message:
          type: string
          description: Human-readable message (fixed per code).
        evidence:
          type: object
          additionalProperties: true
      required:
        - code
        - severity
        - message
      additionalProperties: false
      description: A policy violation with its severity and explanation.
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
    ViolationCode:
      type: string
      enum:
        - MANDATE_INACTIVE
        - EMPTY_CART
        - CURRENCY_MISMATCH
        - SUPPLIER_NOT_APPROVED
        - SUPPLIER_INACTIVE
        - CATEGORY_NOT_ALLOWED
        - UNAUTHORIZED_LINE_ITEM
        - PRICE_MISMATCH
        - CART_ARITHMETIC_INVALID
        - PER_ORDER_LIMIT_EXCEEDED
        - WEEKLY_BUDGET_EXCEEDED
        - REQUEST_BUDGET_EXCEEDED
        - MARKET_PRICE_PREMIUM_EXCEEDED
        - MARKET_REFERENCE_UNAVAILABLE
        - DUPLICATE_ORDER
        - SUBSCRIPTION_NOT_ALLOWED
        - QUARANTINED_SOURCE
        - QUANTITY_EXCEEDS_NEED
        - POLICY_INPUT_INVALID
      description: Machine-readable TrustRail policy violation.
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