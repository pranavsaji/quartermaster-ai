# Suppliers with mandate approval and catalog size (/api/openapi/suppliers/listSuppliers)

`GET /suppliers`

Suppliers with mandate approval and catalog size.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /suppliers:
    get:
      operationId: listSuppliers
      summary: Suppliers with mandate approval and catalog size
      description: Suppliers with mandate approval and catalog size.
      tags:
        - Suppliers
      parameters: []
      security:
        - secureSession: []
        - session: []
      responses:
        "200":
          description: Suppliers with mandate approval and catalog size
          content:
            application/json:
              schema:
                type: object
                properties:
                  items:
                    type: array
                    items:
                      $ref: "#/components/schemas/SupplierDto"
                required:
                  - items
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
                  response = client.suppliers.list_suppliers()
                  # TODO: Handle 'response' of type SuppliersResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type ListSuppliersErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.suppliers.listSuppliers();
                // TODO: Handle 'response' of type SuppliersResponse
              } catch (err) {
                // TODO: Handle 'err' of type Suppliers.ListSuppliersError, discriminated with 'err.payload.kind'
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
    SupplierDto:
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
      required:
        - id
        - name
        - approved
        - active
        - checkout_eligible
        - lead_time_days
        - tax_rate_bps
        - fee_terms
        - website
        - description
        - quarantined
        - catalog_items
        - data_source
      additionalProperties: false
      description: A supplier with its terms and mandate approval.
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