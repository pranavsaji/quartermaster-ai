# Business and security outcomes (/api/openapi/analytics/getAnalyticsSummary)

`GET /analytics/summary`

Business and security outcomes.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /analytics/summary:
    get:
      operationId: getAnalyticsSummary
      summary: Business and security outcomes
      description: Business and security outcomes.
      tags:
        - Analytics
      parameters: []
      security:
        - secureSession: []
        - session: []
      responses:
        "200":
          description: Business and security outcomes
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AnalyticsSummaryDto"
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
                  response = client.analytics.get_analytics_summary()
                  # TODO: Handle 'response' of type AnalyticsSummaryDto
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # GetAnalyticsSummaryErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response =
                  await client.analytics.getAnalyticsSummary();
                // TODO: Handle 'response' of type AnalyticsSummaryDto
              } catch (err) {
                // TODO: Handle 'err' of type Analytics.GetAnalyticsSummaryError, discriminated with 'err.payload.kind'
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
    AnalyticsSummaryDto:
      type: object
      properties:
        currency:
          type: string
          description: ISO 4217 currency code.
          example: USD
        budget:
          $ref: "#/components/schemas/BudgetDto"
        totals:
          type: object
          properties:
            approved_spend_minor:
              type: integer
              description: Approved spend, in minor units (cents).
              example: 17320
            captured_spend_minor:
              type: integer
              description: Captured spend, in minor units (cents).
              example: 17320
            refunded_minor:
              type: integer
              description: Refunded, in minor units (cents).
              example: 17320
            orders_paid:
              type: integer
              example: 1
            orders_blocked:
              type: integer
              example: 1
            pending_approvals:
              type: integer
              example: 1
            requests_total:
              type: integer
              description: Number of requests.
              example: 1
          required:
            - approved_spend_minor
            - captured_spend_minor
            - refunded_minor
            - orders_paid
            - orders_blocked
            - pending_approvals
            - requests_total
          additionalProperties: false
        security:
          type: object
          properties:
            findings_total:
              type: integer
              description: Number of findings.
              example: 1
            blocked_attempts:
              type: integer
              example: 1
            prompt_injections_detected:
              type: integer
              example: 1
            duplicate_invoices_flagged:
              type: integer
              example: 1
            duplicate_captures:
              type: integer
              example: 1
          required:
            - findings_total
            - blocked_attempts
            - prompt_injections_detected
            - duplicate_invoices_flagged
            - duplicate_captures
          additionalProperties: false
        inventory:
          type: object
          properties:
            items_low:
              type: integer
              example: 1
            items_critical:
              type: integer
              example: 1
            items_out:
              type: integer
              example: 1
          required:
            - items_low
            - items_critical
            - items_out
          additionalProperties: false
        deliveries:
          type: object
          properties:
            scheduled:
              type: number
              example: 1
            delayed:
              type: number
              example: 1
            delivered:
              type: number
              example: 1
          required:
            - scheduled
            - delayed
            - delivered
          additionalProperties: false
        spend_by_week:
          type: array
          items:
            type: object
            properties:
              week_start:
                type: string
                example: 2026-11-12
              captured_minor:
                type: integer
                description: Captured, in minor units (cents).
                example: 17320
              reserved_minor:
                type: integer
                description: Reserved, in minor units (cents).
                example: 17320
            required:
              - week_start
              - captured_minor
              - reserved_minor
            additionalProperties: false
        spend_by_supplier:
          type: array
          items:
            type: object
            properties:
              supplier:
                type: string
                description: Supplier.
              captured_minor:
                type: integer
                description: Captured, in minor units (cents).
                example: 17320
              orders:
                type: integer
                example: 1
            required:
              - supplier
              - captured_minor
              - orders
            additionalProperties: false
          description: Captured spend net of refunds, per supplier, largest first.
        spend_by_category:
          type: array
          items:
            type: object
            properties:
              category:
                type: string
                description: Product category.
              captured_minor:
                type: integer
                description: Captured, in minor units (cents).
                example: 17320
            required:
              - category
              - captured_minor
            additionalProperties: false
        decisions_by_kind:
          type: array
          items:
            type: object
            properties:
              decision:
                $ref: "#/components/schemas/PolicyDecisionKind"
              count:
                type: integer
                example: 1
            required:
              - decision
              - count
            additionalProperties: false
        findings_by_type:
          type: array
          items:
            type: object
            properties:
              type:
                $ref: "#/components/schemas/FindingType"
              count:
                type: integer
                example: 1
            required:
              - type
              - count
            additionalProperties: false
        procurement_time_ms:
          type: object
          properties:
            median:
              type:
                - number
                - "null"
              example: 1
            p90:
              type:
                - number
                - "null"
              example: 1
          required:
            - median
            - p90
          additionalProperties: false
          description: Procurement time, in milliseconds.
      required:
        - currency
        - budget
        - totals
        - security
        - inventory
        - deliveries
        - spend_by_week
        - spend_by_supplier
        - spend_by_category
        - decisions_by_kind
        - findings_by_type
        - procurement_time_ms
      additionalProperties: false
      description: Spend, budget, procurement and security outcomes for the workspace.
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
    BudgetDto:
      type: object
      properties:
        period_start:
          type: string
        period_end:
          type: string
        currency:
          type: string
          description: ISO 4217 currency code.
          example: USD
        limit_minor:
          type: integer
          description: Limit, in minor units (cents).
          example: 17320
        reserved_minor:
          type: integer
          description: Reserved, in minor units (cents).
          example: 17320
        spent_minor:
          type: integer
          description: Spent, in minor units (cents).
          example: 17320
        remaining_minor:
          type: integer
          description: Remaining, in minor units (cents).
          example: 17320
      required:
        - period_start
        - period_end
        - currency
        - limit_minor
        - reserved_minor
        - spent_minor
        - remaining_minor
      additionalProperties: false
      description: "The current weekly budget: limit, reserved and spent amounts."
    PolicyDecisionKind:
      type: string
      enum:
        - ALLOW
        - REVIEW_REQUIRED
        - BLOCK
      description: TrustRail's verdict on a cart.
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