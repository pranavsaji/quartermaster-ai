# Record an authorized stock change (/api/openapi/inventory/adjustInventoryItem)

`POST /inventory/{id}/adjustments`

Record an authorized stock change. Requires the MANAGER role. Idempotent: send an `Idempotency-Key`.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /inventory/{id}/adjustments:
    post:
      operationId: adjustInventoryItem
      summary: Record an authorized stock change
      description: "Record an authorized stock change. Requires the MANAGER role.
        Idempotent: send an `Idempotency-Key`."
      tags:
        - Inventory
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
        - $ref: "#/components/parameters/Csrf"
        - $ref: "#/components/parameters/IdempotencyKey"
      security:
        - secureSession: []
        - session: []
      x-required-role: MANAGER
      responses:
        "200":
          description: Record an authorized stock change
          content:
            application/json:
              schema:
                type: object
                properties:
                  item:
                    $ref: "#/components/schemas/InventoryItemDto"
                required:
                  - item
        "400":
          $ref: "#/components/responses/BadRequest"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"
        "404":
          $ref: "#/components/responses/NotFound"
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
              $ref: "#/components/schemas/InventoryAdjustmentRequest"
            example:
              quantity_delta: -20
              reason: WASTE
              note: Damaged sleeve
        description: An authorised stock change with a reason.
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.inventory_api.adjust_inventory_item(
                      UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
                      XRequestedWith.QUARTERMASTER,
                      "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
                      InventoryAdjustmentRequest(
                          quantity_delta=-20,
                          reason=Reason.WASTE,
                          note="Damaged sleeve",
                      ),
                  )
                  # TODO: Handle 'response' of type
                  # InventoryAdjustmentsResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # AdjustInventoryItemErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response =
                  await client.inventoryApi.adjustInventoryItem({
                    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
                    xRequestedWith: XRequestedWith.Quartermaster,
                    idempotencyKey:
                      "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
                    body: {
                      quantityDelta: -20,
                      reason: Reason.Waste,
                      note: "Damaged sleeve",
                    },
                  });
                // TODO: Handle 'response' of type InventoryAdjustmentsResponse
              } catch (err) {
                // TODO: Handle 'err' of type InventoryApi.AdjustInventoryItemError, discriminated with 'err.payload.kind'
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
    InventoryItemDto:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        sku:
          type: string
          description: Stock-keeping unit code.
          example: PKG-TAKEOUT-32
        name:
          type: string
          description: Display name.
          example: Harbor Restaurant Supply
        category:
          $ref: "#/components/schemas/ProductCategory"
        unit:
          type: string
          description: Unit of measure (each, liter, case...).
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
        avg_daily_usage:
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
        reorder_point:
          type: integer
          example: 1
        days_of_cover:
          type:
            - number
            - "null"
          example: 1
        status:
          type: string
          enum:
            - OK
            - LOW
            - CRITICAL
            - OUT
          description: Current status.
          example: OK
        preferred_supplier_id:
          type:
            - string
            - "null"
          description: Id of the related preferred supplier.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        data_source:
          $ref: "#/components/schemas/DataSource"
        search_query:
          type: string
          description: Editable details (PUT /inventory/:id round-trips them). Optional
            until every API build sends them; the edit form treats a missing
            value as blank.
        keywords:
          type: array
          items:
            type: string
          description: Words that identify this item in natural-language requests.
        lead_time_days_override:
          type:
            - number
            - "null"
          description: Lead time for this item, overriding the supplier's (null = use
            supplier's).
          example: 1
      required:
        - id
        - sku
        - name
        - category
        - unit
        - on_hand
        - inbound_confirmed
        - committed
        - available
        - avg_daily_usage
        - lead_time_days
        - safety_stock
        - coverage_days
        - reorder_point
        - days_of_cover
        - status
        - preferred_supplier_id
        - data_source
        - search_query
        - keywords
        - lead_time_days_override
      additionalProperties: false
      description: A stock item with current levels, usage and reorder status.
    InventoryAdjustmentRequest:
      type: object
      properties:
        quantity_delta:
          type: integer
          minimum: -1000000
          maximum: 1000000
          example: 1
        reason:
          type: string
          enum:
            - COUNT_CORRECTION
            - WASTE
            - CONSUMPTION
            - MANUAL_RECEIPT
          description: Reason given by the person making the change.
          example: COUNT_CORRECTION
        note:
          type: string
          maxLength: 500
          description: Optional note.
        expected_on_hand:
          type: integer
          minimum: 0
          maximum: 10000000
          example: 1
      required:
        - quantity_delta
        - reason
      description: An authorised stock change with a reason.
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
    DataSource:
      type: string
      enum:
        - CHANNEL3_MARKET
        - SANDBOX_SUPPLIER
        - SYNTHETIC
        - USER_ENTERED
      description: Where a piece of commercial data came from (shown as a label in the UI).
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