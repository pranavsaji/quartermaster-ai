# Three-way match and duplicate detection (/api/openapi/orders/analyzeInvoice)

`POST /invoices/analyze`

Three-way match and duplicate detection. Requires the MANAGER role. Idempotent: send an `Idempotency-Key`.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /invoices/analyze:
    post:
      operationId: analyzeInvoice
      summary: Three-way match and duplicate detection
      description: "Three-way match and duplicate detection. Requires the MANAGER
        role. Idempotent: send an `Idempotency-Key`."
      tags:
        - Orders
      parameters:
        - $ref: "#/components/parameters/Csrf"
        - $ref: "#/components/parameters/IdempotencyKey"
      security:
        - secureSession: []
        - session: []
      x-required-role: MANAGER
      responses:
        "200":
          description: Three-way match and duplicate detection
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/InvoiceDto"
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
              $ref: "#/components/schemas/AnalyzeInvoiceRequest"
        description: A supplier invoice to match against its purchase order and delivery.
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.orders.analyze_invoice(
                      XRequestedWith.QUARTERMASTER,
                      "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
                      AnalyzeInvoiceRequest(
                          supplier_id=UUID(
                              "00000000-0000-0000-0000-000000000000"
                          ),
                          invoice_number="some example string",
                          invoice_date="some example string",
                          lines=[
                              Line1(
                                  description="some example string",
                                  quantity=1,
                                  unit_price_minor=1,
                                  line_total_minor=1,
                              ),
                          ],
                          total_minor=1,
                      ),
                  )
                  # TODO: Handle 'response' of type InvoiceDto
              except ApiError as e:
                  # TODO: Handle 'e.error' of type AnalyzeInvoiceErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.orders.analyzeInvoice({
                  xRequestedWith: XRequestedWith.Quartermaster,
                  idempotencyKey: "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
                  body: {
                    supplierId: "00000000-0000-0000-0000-000000000000",
                    invoiceNumber: "some example string",
                    invoiceDate: "some example string",
                    lines: [
                      {
                        description: "some example string",
                        quantity: 1,
                        unitPriceMinor: 1,
                        lineTotalMinor: 1,
                      },
                    ],
                    totalMinor: 1,
                  },
                });
                // TODO: Handle 'response' of type InvoiceDto
              } catch (err) {
                // TODO: Handle 'err' of type Orders.AnalyzeInvoiceError, discriminated with 'err.payload.kind'
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
    InvoiceDto:
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
        purchase_order_id:
          type:
            - string
            - "null"
          description: Id of the related purchase order.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        invoice_number:
          type: string
        invoice_date:
          type: string
          description: Invoice date (YYYY-MM-DD).
          example: 2026-11-12
        currency:
          type: string
          description: ISO 4217 currency code.
          example: USD
        total_minor:
          type: integer
          description: Total, in minor units (cents).
          example: 17320
        status:
          $ref: "#/components/schemas/InvoiceStatus"
        settlement_allowed:
          type: boolean
          example: true
        matches:
          type: array
          items:
            $ref: "#/components/schemas/InvoiceMatchDto"
        created_at:
          type: string
          description: When created happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
      required:
        - id
        - supplier_id
        - purchase_order_id
        - invoice_number
        - invoice_date
        - currency
        - total_minor
        - status
        - settlement_allowed
        - matches
        - created_at
      additionalProperties: false
      description: A supplier invoice and its three-way match result.
    AnalyzeInvoiceRequest:
      type: object
      properties:
        supplier_id:
          type: string
          format: uuid
          pattern: ^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$
          description: Id of the related supplier.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        purchase_order_id:
          description: Id of the related purchase order.
          oneOf:
            - type: string
              format: uuid
              pattern: ^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$
            - type: "null"
        invoice_number:
          type: string
          minLength: 1
          maxLength: 64
        invoice_date:
          type: string
          pattern: ^\d{4}-\d{2}-\d{2}$
          description: Invoice date (YYYY-MM-DD).
          example: 2026-11-12
        currency:
          type: string
          enum:
            - USD
          description: ISO 4217 currency code.
          example: USD
        lines:
          minItems: 1
          maxItems: 200
          type: array
          items:
            type: object
            properties:
              sku:
                description: Stock-keeping unit code.
                oneOf:
                  - type: string
                    maxLength: 64
                  - type: "null"
              description:
                type: string
                minLength: 1
                maxLength: 500
                description: Free-text description.
              quantity:
                type: integer
                maximum: 1000000
                example: 1
                minimum: 1
              unit_price_minor:
                type: integer
                minimum: 0
                maximum: 9007199254740991
                description: Unit price, in minor units (cents).
                example: 17320
              line_total_minor:
                type: integer
                minimum: 0
                maximum: 9007199254740991
                description: Line total, in minor units (cents).
                example: 17320
            required:
              - description
              - quantity
              - unit_price_minor
              - line_total_minor
          description: Line items.
        total_minor:
          type: integer
          minimum: 0
          maximum: 9007199254740991
          description: Total, in minor units (cents).
          example: 17320
        notes:
          type: string
          maxLength: 5000
      required:
        - supplier_id
        - invoice_number
        - invoice_date
        - currency
        - lines
        - total_minor
      description: A supplier invoice to match against its purchase order and delivery.
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
    InvoiceStatus:
      type: string
      enum:
        - MATCHED
        - DISCREPANCY
        - DUPLICATE
        - UNMATCHED
      description: Invoice match outcome.
    InvoiceMatchDto:
      type: object
      properties:
        check:
          type: string
        passed:
          type: boolean
          example: true
        severity:
          description: Severity.
          oneOf:
            - $ref: "#/components/schemas/Severity"
            - type: "null"
        detail:
          type: string
      required:
        - check
        - passed
        - severity
        - detail
      additionalProperties: false
      description: One check of the invoice match (amounts, quantities, duplicates).
    Severity:
      type: string
      enum:
        - LOW
        - MEDIUM
        - HIGH
        - CRITICAL
      description: Finding severity.
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