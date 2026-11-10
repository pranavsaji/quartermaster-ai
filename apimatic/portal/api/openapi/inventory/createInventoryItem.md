# Add a stock item (/api/openapi/inventory/createInventoryItem)

`POST /inventory`

Add a stock item. Requires the MANAGER role.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /inventory:
    post:
      operationId: createInventoryItem
      summary: Add a stock item
      description: Add a stock item. Requires the MANAGER role.
      tags:
        - Inventory
      parameters:
        - $ref: "#/components/parameters/Csrf"
      security:
        - secureSession: []
        - session: []
      x-required-role: MANAGER
      responses:
        "201":
          description: Add a stock item
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
        "409":
          $ref: "#/components/responses/Conflict"
        "429":
          $ref: "#/components/responses/TooManyRequests"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateInventoryItemRequest"
            example:
              sku: BEV-COLA-CAN
              name: Cola cans
              category: beverages
              unit: each
              on_hand: 48
              safety_stock: 24
              coverage_days: 4
              search_query: cola soda cans 24 pack
              keywords:
                - cola
                - soda
        description: A new stock item, including its opening on-hand count.
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.inventory_api.create_inventory_item(
                      XRequestedWith.QUARTERMASTER,
                      CreateInventoryItemRequest(
                          sku="BEV-COLA-CAN",
                          name="Cola cans",
                          category=Category.BEVERAGES,
                          unit="each",
                          safety_stock=24,
                          coverage_days=4,
                          search_query="cola soda cans 24 pack",
                          keywords=["cola", "soda"],
                          on_hand=48,
                      ),
                  )
                  # TODO: Handle 'response' of type InventoryResponse1
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # CreateInventoryItemErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response =
                  await client.inventoryApi.createInventoryItem({
                    xRequestedWith: XRequestedWith.Quartermaster,
                    body: {
                      sku: "BEV-COLA-CAN",
                      name: "Cola cans",
                      category: Category.Beverages,
                      unit: "each",
                      safetyStock: 24,
                      coverageDays: 4,
                      searchQuery: "cola soda cans 24 pack",
                      keywords: ["cola", "soda"],
                      onHand: 48,
                    },
                  });
                // TODO: Handle 'response' of type InventoryResponse1
              } catch (err) {
                // TODO: Handle 'err' of type InventoryApi.CreateInventoryItemError, discriminated with 'err.payload.kind'
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
    CreateInventoryItemRequest:
      type: object
      properties:
        sku:
          type: string
          minLength: 1
          maxLength: 64
          pattern: ^[A-Za-z0-9][\w.\-/]*$
          description: Stock-keeping unit code.
          example: PKG-TAKEOUT-32
        name:
          type: string
          minLength: 1
          maxLength: 120
          description: Display name.
          example: Harbor Restaurant Supply
        category:
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
          description: Product category.
          example: food_packaging
        unit:
          type: string
          minLength: 1
          maxLength: 24
          description: Unit of measure (each, liter, case...).
        safety_stock:
          type: integer
          minimum: 0
          maximum: 10000000
          description: Units to keep on hand as a buffer.
          example: 1
        coverage_days:
          type: integer
          minimum: 1
          maximum: 60
          description: Days of usage an order should cover.
          example: 3
        lead_time_days_override:
          default: null
          description: Lead time for this item, overriding the supplier's (null = use
            supplier's).
          oneOf:
            - type: integer
              minimum: 0
              maximum: 60
            - type: "null"
        preferred_supplier_id:
          default: null
          description: Id of the related preferred supplier.
          oneOf:
            - type: string
              format: uuid
              pattern: ^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$
            - type: "null"
        search_query:
          type: string
          minLength: 2
          maxLength: 200
          description: Phrase used to look up market prices (Channel3).
        keywords:
          default: []
          maxItems: 20
          type: array
          items:
            type: string
            minLength: 1
            maxLength: 40
          description: Words that identify this item in natural-language requests.
        on_hand:
          default: 0
          type: integer
          minimum: 0
          maximum: 10000000
          description: Units currently in stock.
      required:
        - sku
        - name
        - category
        - unit
        - safety_stock
        - coverage_days
        - search_query
      description: A new stock item, including its opening on-hand count.
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