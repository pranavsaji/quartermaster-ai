# Publish a new mandate version (revokes approvals if tightened) (/api/openapi/trustrail/updateSpendMandate)

`PUT /mandates/current`

Publish a new mandate version (revokes approvals if tightened). Requires the OWNER role. Idempotent: send an `Idempotency-Key`.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /mandates/current:
    put:
      operationId: updateSpendMandate
      summary: Publish a new mandate version (revokes approvals if tightened)
      description: "Publish a new mandate version (revokes approvals if tightened).
        Requires the OWNER role. Idempotent: send an `Idempotency-Key`."
      tags:
        - TrustRail
      parameters:
        - $ref: "#/components/parameters/Csrf"
        - $ref: "#/components/parameters/IdempotencyKey"
      security:
        - secureSession: []
        - session: []
      x-required-role: OWNER
      responses:
        "200":
          description: Publish a new mandate version (revokes approvals if tightened)
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/MandateUpdateResponse"
        "400":
          $ref: "#/components/responses/BadRequest"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"
        "409":
          $ref: "#/components/responses/Conflict"
        "422":
          $ref: "#/components/responses/Unprocessable"
        "429":
          $ref: "#/components/responses/TooManyRequests"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/SpendMandateInput"
        description: A new Spend Mandate version (optimistic concurrency on
          `expected_version`).
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.trust_rail.update_spend_mandate(
                      XRequestedWith.QUARTERMASTER,
                      "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
                      SpendMandateInput(
                          weekly_budget_minor=1,
                          per_order_limit_minor=1,
                          auto_approval_limit_minor=1,
                          human_approval_required=True,
                          approved_supplier_ids=[
                              UUID("00000000-0000-0000-0000-000000000000")
                          ],
                          allowed_categories=[
                              AllowedCategory.FOOD_PACKAGING
                          ],
                          max_market_price_premium_pct=1,
                          market_price_action=MarketPriceAction.REVIEW,
                          duplicate_window_hours=1,
                          duplicate_action=DuplicateAction.REVIEW,
                          subscriptions_allowed=True,
                          certificate_ttl_minutes=1,
                          max_quantity_multiple_of_need=1.5,
                          expected_version=1,
                      ),
                  )
                  # TODO: Handle 'response' of type MandateUpdateResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # UpdateSpendMandateErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response =
                  await client.trustRail.updateSpendMandate({
                    xRequestedWith: XRequestedWith.Quartermaster,
                    idempotencyKey:
                      "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
                    body: {
                      weeklyBudgetMinor: 1,
                      perOrderLimitMinor: 1,
                      autoApprovalLimitMinor: 1,
                      humanApprovalRequired: true,
                      approvedSupplierIds: [
                        "00000000-0000-0000-0000-000000000000",
                      ],
                      allowedCategories: [AllowedCategory.FoodPackaging],
                      maxMarketPricePremiumPct: 1,
                      marketPriceAction: MarketPriceAction.Review,
                      duplicateWindowHours: 1,
                      duplicateAction: DuplicateAction.Review,
                      subscriptionsAllowed: true,
                      certificateTtlMinutes: 1,
                      maxQuantityMultipleOfNeed: 1.5,
                      expectedVersion: 1,
                    },
                  });
                // TODO: Handle 'response' of type MandateUpdateResponse
              } catch (err) {
                // TODO: Handle 'err' of type TrustRail.UpdateSpendMandateError, discriminated with 'err.payload.kind'
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
  parameters:
    Csrf:
      name: X-Requested-With
      in: header
      required: true
      description: "CSRF guard: must be `quartermaster` on every mutation."
      schema:
        type: string
        const: quartermaster
        description: "CSRF guard: must be `quartermaster` on every mutation."
      example: quartermaster
    IdempotencyKey:
      name: Idempotency-Key
      in: header
      required: true
      description: A unique key per user action; retries with the same key return the
        first result.
      schema:
        type: string
        minLength: 8
        maxLength: 128
        description: A unique key per user action; retries with the same key return the
          first result.
      example: 3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22
  schemas:
    MandateUpdateResponse:
      type: object
      properties:
        mandate:
          $ref: "#/components/schemas/SpendMandateDto"
        budget:
          $ref: "#/components/schemas/BudgetDto"
        revoked_certificates:
          type: integer
          description: Active intent certificates revoked because they were signed under
            the previous version.
          example: 1
      required:
        - budget
        - mandate
        - revoked_certificates
      additionalProperties: false
      description: "`PUT /mandates/current`."
    SpendMandateInput:
      type: object
      properties:
        currency:
          type: string
          enum:
            - USD
          description: ISO 4217 currency code.
          example: USD
        weekly_budget_minor:
          type: integer
          minimum: 0
          maximum: 100000000
          description: Weekly budget, in minor units (cents).
          example: 17320
        per_order_limit_minor:
          type: integer
          minimum: 0
          maximum: 100000000
          description: Per order limit, in minor units (cents).
          example: 17320
        auto_approval_limit_minor:
          type: integer
          minimum: 0
          maximum: 100000000
          description: Auto approval limit, in minor units (cents).
          example: 17320
        human_approval_required:
          type: boolean
          description: An owner must approve every purchase (always true). Always true.
          example: true
        approved_supplier_ids:
          maxItems: 200
          type: array
          items:
            type: string
            format: uuid
            pattern: ^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$
          description: Suppliers the owner has approved for payment.
        allowed_categories:
          minItems: 1
          maxItems: 8
          type: array
          items:
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
          description: Product categories purchases may contain.
        max_market_price_premium_pct:
          type: integer
          minimum: 0
          maximum: 500
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
          minimum: 0
          maximum: 720
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
          minimum: 5
          maximum: 60
          description: Certificate ttl, in minutes.
          example: 5
        max_quantity_multiple_of_need:
          type: number
          minimum: 1
          maximum: 10
          example: 1
        expected_version:
          type: integer
          maximum: 9007199254740991
          description: The mandate version being edited (refused if it changed meanwhile).
          example: 1
          minimum: 1
      required:
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
        - expected_version
      description: A new Spend Mandate version (optimistic concurrency on
        `expected_version`).
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
    Conflict:
      description: The request conflicts with current state; see `code`.
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ApiError"
    Unprocessable:
      description: Refused by policy (for example `CAPTURE_REFUSED`); see `code`.
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