# Update a catalog listing (/api/openapi/suppliers/updateCatalogItem)

`PUT /suppliers/{id}/catalog/{itemId}`

Update a catalog listing. Requires the MANAGER role.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /suppliers/{id}/catalog/{itemId}:
    put:
      operationId: updateCatalogItem
      summary: Update a catalog listing
      description: Update a catalog listing. Requires the MANAGER role.
      tags:
        - Suppliers
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
        - name: itemId
          in: path
          required: true
          description: itemId id (UUID).
          schema:
            type: string
            format: uuid
            description: itemId id (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        - $ref: "#/components/parameters/Csrf"
      security:
        - secureSession: []
        - session: []
      x-required-role: MANAGER
      responses:
        "200":
          description: Update a catalog listing
          content:
            application/json:
              schema:
                type: object
                properties:
                  item:
                    $ref: "#/components/schemas/CatalogItemDto"
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
        "429":
          $ref: "#/components/responses/TooManyRequests"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CatalogItemInput"
        description: Fields for creating or updating a catalog listing.
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.suppliers.update_catalog_item(
                      UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
                      UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
                      XRequestedWith.QUARTERMASTER,
                      CatalogItemInput(
                          sku="some example string",
                          title="some example string",
                          category=Category.FOOD_PACKAGING,
                          pack_quantity=1,
                          unit_price_minor=1,
                      ),
                  )
                  # TODO: Handle 'response' of type
                  # SuppliersCatalogResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # UpdateCatalogItemErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.suppliers.updateCatalogItem(
                  {
                    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
                    itemId: "0f8fad5b-d9cb-469f-a165-70867728950e",
                    xRequestedWith: XRequestedWith.Quartermaster,
                    body: {
                      sku: "some example string",
                      title: "some example string",
                      category: Category.FoodPackaging,
                      packQuantity: 1,
                      unitPriceMinor: 1,
                    },
                  },
                );
                // TODO: Handle 'response' of type SuppliersCatalogResponse
              } catch (err) {
                // TODO: Handle 'err' of type Suppliers.UpdateCatalogItemError, discriminated with 'err.payload.kind'
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
    CatalogItemDto:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        supplier_id:
          type: string
          description: Id of the related supplier.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        sku:
          type: string
          description: Stock-keeping unit code.
          example: PKG-TAKEOUT-32
        title:
          type: string
          description: Short title.
        description:
          type: string
          description: Free-text description.
        category:
          $ref: "#/components/schemas/ProductCategory"
        inventory_item_id:
          type:
            - string
            - "null"
          description: Id of the related inventory item.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        pack_quantity:
          type: integer
          description: Units in one pack.
          example: 1
        unit_price_minor:
          type: integer
          description: Unit price, in minor units (cents).
          example: 17320
        currency:
          type: string
          description: ISO 4217 currency code.
          example: USD
        in_stock:
          type: boolean
          description: Whether the supplier currently has it in stock.
          example: true
        recurring:
          type: boolean
          description: A recurring subscription rather than a one-off purchase.
          example: true
        quarantined:
          type: boolean
          description: "Flagged by injection screening: withheld from the agent, and
            TrustRail blocks carts with it."
          example: true
        quarantine_reason:
          type:
            - string
            - "null"
          description: Detection rules that triggered the quarantine.
        updated_at:
          type: string
          description: When updated happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
      required:
        - id
        - supplier_id
        - sku
        - title
        - description
        - category
        - inventory_item_id
        - pack_quantity
        - unit_price_minor
        - currency
        - in_stock
        - recurring
        - quarantined
        - quarantine_reason
        - updated_at
      additionalProperties: false
      description: A supplier catalog listing (product, pack size, price).
    CatalogItemInput:
      type: object
      properties:
        sku:
          type: string
          minLength: 1
          maxLength: 64
          pattern: ^[A-Za-z0-9][\w.\-/]*$
          description: Stock-keeping unit code.
          example: PKG-TAKEOUT-32
        title:
          type: string
          minLength: 2
          maxLength: 200
          description: Short title.
        description:
          default: ""
          type: string
          maxLength: 2000
          description: Free-text description.
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
        inventory_item_id:
          default: null
          description: Id of the related inventory item.
          oneOf:
            - type: string
              format: uuid
              pattern: ^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$
            - type: "null"
        pack_quantity:
          type: integer
          minimum: 1
          maximum: 1000000
          description: Units in one pack.
          example: 1
        unit_price_minor:
          type: integer
          maximum: 100000000
          description: Unit price, in minor units (cents).
          example: 17320
          minimum: 1
        in_stock:
          default: true
          type: boolean
          description: Whether the supplier currently has it in stock.
        recurring:
          default: false
          type: boolean
          description: A recurring subscription rather than a one-off purchase.
      required:
        - sku
        - title
        - category
        - pack_quantity
        - unit_price_minor
      description: Fields for creating or updating a catalog listing.
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