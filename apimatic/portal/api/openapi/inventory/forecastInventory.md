# Calculate reorder recommendations (/api/openapi/inventory/forecastInventory)

`POST /inventory/forecast`

Calculate reorder recommendations. Requires the MANAGER role.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /inventory/forecast:
    post:
      operationId: forecastInventory
      summary: Calculate reorder recommendations
      description: Calculate reorder recommendations. Requires the MANAGER role.
      tags:
        - Inventory
      parameters:
        - $ref: "#/components/parameters/Csrf"
      security:
        - secureSession: []
        - session: []
      x-required-role: MANAGER
      responses:
        "200":
          description: Calculate reorder recommendations
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ForecastRunDto"
        "400":
          $ref: "#/components/responses/BadRequest"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"
        "409":
          $ref: "#/components/responses/Conflict"
        "429":
          $ref: "#/components/responses/TooManyRequests"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ForecastRequest"
            example:
              demand_multiplier: 1.25
        description: Parameters for a reorder forecast.
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.inventory_api.forecast_inventory(
                      XRequestedWith.QUARTERMASTER,
                      ForecastRequest(demand_multiplier=1.25),
                  )
                  # TODO: Handle 'response' of type ForecastRunDto
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # ForecastInventoryErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response =
                  await client.inventoryApi.forecastInventory({
                    xRequestedWith: XRequestedWith.Quartermaster,
                    body: { demandMultiplier: 1.25 },
                  });
                // TODO: Handle 'response' of type ForecastRunDto
              } catch (err) {
                // TODO: Handle 'err' of type InventoryApi.ForecastInventoryError, discriminated with 'err.payload.kind'
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
  schemas:
    ForecastRunDto:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        demand_multiplier:
          type: number
          description: Demand relative to normal (1 = normal, 1.25 = 25% busier).
          example: 1.25
        created_at:
          type: string
          description: When created happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
        method:
          type: string
          const: REORDER_POINT_V1
          example: REORDER_POINT_V1
        lines:
          type: array
          items:
            $ref: "#/components/schemas/ForecastLineDto"
          description: Line items.
      required:
        - id
        - demand_multiplier
        - created_at
        - method
        - lines
      additionalProperties: false
      description: A stored forecast run with its lines.
    ForecastRequest:
      type: object
      properties:
        inventory_item_ids:
          maxItems: 100
          type: array
          items:
            type: string
            format: uuid
            pattern: ^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$
          description: Ids of the related inventory items.
        demand_multiplier:
          default: 1
          type: number
          minimum: 0.25
          maximum: 4
          description: Demand relative to normal (1 = normal, 1.25 = 25% busier).
        horizon_days:
          type: integer
          minimum: 1
          maximum: 30
          description: Horizon, in days.
          example: 3
      description: Parameters for a reorder forecast.
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
    ForecastLineDto:
      type: object
      properties:
        inventory_item_id:
          type: string
          description: Id of the related inventory item.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        sku:
          type: string
          description: Stock-keeping unit code.
          example: PKG-TAKEOUT-32
        name:
          type: string
          description: Display name.
          example: Harbor Restaurant Supply
        unit:
          type: string
          description: Unit of measure (each, liter, case...).
        base_daily_usage:
          type: number
          example: 1
        demand_multiplier:
          type: number
          description: Demand relative to normal (1 = normal, 1.25 = 25% busier).
          example: 1.25
        forecast_daily_usage:
          type: number
          example: 1
        lead_time_days:
          type: integer
          description: Days from order to delivery.
          example: 3
        safety_stock:
          type: integer
          description: Units to keep on hand as a buffer.
          example: 1
        coverage_days:
          type: integer
          description: Days of usage an order should cover.
          example: 3
        on_hand:
          type: integer
          description: Units currently in stock.
          example: 1
        inbound_confirmed:
          type: integer
          example: 1
        committed:
          type: integer
          example: 1
        available:
          type: integer
          example: 1
        reorder_point:
          type: integer
          example: 1
        target_stock:
          type: number
          example: 1
        needs_reorder:
          type: boolean
          example: true
        suggested_quantity:
          type: number
          example: 1
        explanation:
          type: string
      required:
        - inventory_item_id
        - sku
        - name
        - unit
        - base_daily_usage
        - demand_multiplier
        - forecast_daily_usage
        - lead_time_days
        - safety_stock
        - coverage_days
        - on_hand
        - inbound_confirmed
        - committed
        - available
        - reorder_point
        - target_stock
        - needs_reorder
        - suggested_quantity
        - explanation
      additionalProperties: false
      description: Reorder recommendation for one stock item.
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