# Active Spend Mandate and weekly budget (/api/openapi/trustrail/getSpendMandate)

`GET /mandates/current`

Active Spend Mandate and weekly budget.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /mandates/current:
    get:
      operationId: getSpendMandate
      summary: Active Spend Mandate and weekly budget
      description: Active Spend Mandate and weekly budget.
      tags:
        - TrustRail
      parameters: []
      security:
        - secureSession: []
        - session: []
      responses:
        "200":
          description: Active Spend Mandate and weekly budget
          content:
            application/json:
              schema:
                type: object
                properties:
                  mandate:
                    $ref: "#/components/schemas/SpendMandateDto"
                  budget:
                    $ref: "#/components/schemas/BudgetDto"
                required:
                  - mandate
                  - budget
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
                  response = client.trust_rail.get_spend_mandate()
                  # TODO: Handle 'response' of type
                  # MandatesCurrentResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # GetSpendMandateErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.trustRail.getSpendMandate();
                // TODO: Handle 'response' of type MandatesCurrentResponse
              } catch (err) {
                // TODO: Handle 'err' of type TrustRail.GetSpendMandateError, discriminated with 'err.payload.kind'
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
    SpendMandateDto:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        version:
          type: integer
          description: Version number.
          example: 1
        status:
          type: string
          enum:
            - ACTIVE
            - SUPERSEDED
          description: Current status.
          example: ACTIVE
        currency:
          type: string
          description: ISO 4217 currency code.
          example: USD
        weekly_budget_minor:
          type: integer
          description: Weekly budget, in minor units (cents).
          example: 17320
        per_order_limit_minor:
          type: integer
          description: Per order limit, in minor units (cents).
          example: 17320
        auto_approval_limit_minor:
          type: integer
          description: Auto approval limit, in minor units (cents).
          example: 17320
        human_approval_required:
          type: boolean
          description: An owner must approve every purchase (always true). Always true.
          example: true
        approved_supplier_ids:
          type: array
          items:
            type: string
          description: Suppliers the owner has approved for payment.
        allowed_categories:
          type: array
          items:
            $ref: "#/components/schemas/ProductCategory"
          description: Product categories purchases may contain.
        max_market_price_premium_pct:
          type: integer
          description: Max market price premium, in percent.
          example: 1
        market_price_action:
          type: string
          enum:
            - REVIEW
            - BLOCK
          description: "What happens when a price exceeds the market premium: REVIEW or
            BLOCK."
          example: REVIEW
        duplicate_window_hours:
          type: integer
          description: Duplicate window, in hours.
          example: 1
        duplicate_action:
          type: string
          enum:
            - REVIEW
            - BLOCK
          description: "What happens to a likely duplicate order: REVIEW or BLOCK."
          example: REVIEW
        subscriptions_allowed:
          type: boolean
          description: Whether recurring purchases are allowed.
          example: true
        certificate_ttl_minutes:
          type: integer
          description: Certificate ttl, in minutes.
          example: 1
        max_quantity_multiple_of_need:
          type: number
          example: 1
        created_by:
          type: string
        created_at:
          type: string
          description: When created happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
      required:
        - id
        - version
        - status
        - currency
        - weekly_budget_minor
        - per_order_limit_minor
        - auto_approval_limit_minor
        - human_approval_required
        - approved_supplier_ids
        - allowed_categories
        - max_market_price_premium_pct
        - market_price_action
        - duplicate_window_hours
        - duplicate_action
        - subscriptions_allowed
        - certificate_ttl_minutes
        - max_quantity_multiple_of_need
        - created_by
        - created_at
      additionalProperties: false
      description: "The owner's Spend Mandate: what the business permits across purchases."
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
    ProductCategory:
      type: string
      enum:
        - food_packaging
        - cleaning_supplies
        - cooking_ingredients
        - beverages
        - kitchen_equipment
        - alcohol
        - gift_cards
        - services
      description: Product category used by the Spend Mandate's category rules.
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