# Add a supplier (owners approve it in the Spend Mandate) (/api/openapi/suppliers/createSupplier)

`POST /suppliers`

Add a supplier (owners approve it in the Spend Mandate). Requires the MANAGER role.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /suppliers:
    post:
      operationId: createSupplier
      summary: Add a supplier (owners approve it in the Spend Mandate)
      description: Add a supplier (owners approve it in the Spend Mandate). Requires
        the MANAGER role.
      tags:
        - Suppliers
      parameters:
        - $ref: "#/components/parameters/Csrf"
      security:
        - secureSession: []
        - session: []
      x-required-role: MANAGER
      responses:
        "201":
          description: Add a supplier (owners approve it in the Spend Mandate)
          content:
            application/json:
              schema:
                type: object
                properties:
                  supplier:
                    $ref: "#/components/schemas/SupplierDetailDto"
                required:
                  - supplier
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
              $ref: "#/components/schemas/SupplierInput"
            example:
              name: Bayside Beverages
              website: https://bayside.example.com
              description: Local drinks distributor
              lead_time_days: 2
              tax_rate_bps: 825
              fee_terms:
                - code: SHIP_STD
                  label: Delivery
                  kind: SHIPPING
                  amount_minor: 900
                  waived_over_minor: 15000
              active: true
              checkout_eligible: true
        description: Fields for creating or updating a supplier.
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.suppliers.create_supplier(
                      XRequestedWith.QUARTERMASTER,
                      SupplierInput(
                          name="Bayside Beverages",
                          website="https://bayside.example.com",
                          description="Local drinks distributor",
                          lead_time_days=2,
                          tax_rate_bps=825,
                          fee_terms=[
                              FeeTerm(
                                  code="SHIP_STD",
                                  label="Delivery",
                                  kind=Kind1.SHIPPING,
                                  amount_minor=900,
                                  waived_over_minor=15000,
                              ),
                          ],
                          active=True,
                          checkout_eligible=True,
                      ),
                  )
                  # TODO: Handle 'response' of type SuppliersResponse1
              except ApiError as e:
                  # TODO: Handle 'e.error' of type CreateSupplierErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.suppliers.createSupplier({
                  xRequestedWith: XRequestedWith.Quartermaster,
                  body: {
                    name: "Bayside Beverages",
                    website: "https://bayside.example.com",
                    description: "Local drinks distributor",
                    leadTimeDays: 2,
                    taxRateBps: 825,
                    feeTerms: [
                      {
                        code: "SHIP_STD",
                        label: "Delivery",
                        kind: Kind1.Shipping,
                        amountMinor: 900,
                        waivedOverMinor: 15000,
                      },
                    ],
                    active: true,
                    checkoutEligible: true,
                  },
                });
                // TODO: Handle 'response' of type SuppliersResponse1
              } catch (err) {
                // TODO: Handle 'err' of type Suppliers.CreateSupplierError, discriminated with 'err.payload.kind'
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
    SupplierDetailDto:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        name:
          type: string
          description: Display name.
          example: Harbor Restaurant Supply
        approved:
          type: boolean
          description: Approved in the current Spend Mandate.
          example: true
        active:
          type: boolean
          description: Whether the record is in use.
          example: true
        checkout_eligible:
          type: boolean
          description: Whether orders from this supplier can be paid through PayPal
            checkout.
          example: true
        lead_time_days:
          type: integer
          description: Days from order to delivery.
          example: 3
        tax_rate_bps:
          type: integer
          description: Tax rate, in basis points (825 = 8.25%).
          example: 825
        fee_terms:
          type: array
          items:
            $ref: "#/components/schemas/FeeTermDto"
          description: Published fees and shipping terms; any other fee in a quote is
            unauthorised.
        website:
          type:
            - string
            - "null"
          description: Supplier website.
          example: https://example.com
        description:
          type:
            - string
            - "null"
          description: Free-text description.
        quarantined:
          type: boolean
          description: "Flagged by prompt-injection screening: withheld from the agent and
            blocked by TrustRail."
          example: true
        catalog_items:
          type: integer
          example: 1
        data_source:
          $ref: "#/components/schemas/DataSource"
        catalog:
          type: array
          items:
            $ref: "#/components/schemas/CatalogItemDto"
        created_at:
          type: string
          description: When created happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
      required:
        - active
        - approved
        - catalog
        - catalog_items
        - checkout_eligible
        - created_at
        - data_source
        - description
        - fee_terms
        - id
        - lead_time_days
        - name
        - quarantined
        - tax_rate_bps
        - website
      additionalProperties: false
      description: A supplier with its catalog.
    SupplierInput:
      type: object
      properties:
        name:
          type: string
          minLength: 2
          maxLength: 120
          description: Display name.
          example: Harbor Restaurant Supply
        website:
          default: null
          description: Supplier website.
          oneOf:
            - type: string
              maxLength: 300
              format: uri
            - type: "null"
        description:
          default: null
          description: Free-text description.
          oneOf:
            - type: string
              maxLength: 1000
            - type: "null"
        lead_time_days:
          type: integer
          minimum: 0
          maximum: 60
          description: Days from order to delivery.
          example: 3
        tax_rate_bps:
          type: integer
          minimum: 0
          maximum: 3000
          description: Tax rate, in basis points (825 = 8.25%).
          example: 825
        fee_terms:
          default: []
          maxItems: 10
          type: array
          items:
            type: object
            properties:
              code:
                type: string
                minLength: 1
                maxLength: 32
                pattern: ^[A-Z0-9_]+$
                description: Stable machine-readable code.
              label:
                type: string
                minLength: 1
                maxLength: 80
              kind:
                type: string
                enum:
                  - SHIPPING
                  - FEE
                description: Kind of entry.
                example: SHIPPING
              amount_minor:
                type: integer
                minimum: 0
                maximum: 10000000
                description: Amount, in minor units (cents).
                example: 17320
              waived_over_minor:
                description: Waived over, in minor units (cents).
                oneOf:
                  - type: integer
                    minimum: 0
                    maximum: 100000000
                  - type: "null"
            required:
              - code
              - label
              - kind
              - amount_minor
              - waived_over_minor
          description: Published fees and shipping terms; any other fee in a quote is
            unauthorised.
        active:
          default: true
          type: boolean
          description: Whether the record is in use.
        checkout_eligible:
          default: true
          type: boolean
          description: Whether orders from this supplier can be paid through PayPal
            checkout.
      required:
        - name
        - lead_time_days
        - tax_rate_bps
      description: Fields for creating or updating a supplier.
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
    FeeTermDto:
      type: object
      properties:
        code:
          type: string
          description: Stable machine-readable code.
        label:
          type: string
        kind:
          type: string
          enum:
            - SHIPPING
            - FEE
          description: Kind of entry.
          example: SHIPPING
        amount_minor:
          type: integer
          description: Amount, in minor units (cents).
          example: 17320
        waived_over_minor:
          type:
            - integer
            - "null"
          description: Waived over, in minor units (cents).
          example: 17320
      required:
        - code
        - label
        - kind
        - amount_minor
        - waived_over_minor
      additionalProperties: false
      description: A published supplier fee or shipping term; only listed fees are
        authorised.
    DataSource:
      type: string
      enum:
        - CHANNEL3_MARKET
        - SANDBOX_SUPPLIER
        - SYNTHETIC
        - USER_ENTERED
      description: Where a piece of commercial data came from (shown as a label in the UI).
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