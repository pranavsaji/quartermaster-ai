# Recorded invoices (/api/openapi/orders/listInvoices)

`GET /invoices`

Recorded invoices.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /invoices:
    get:
      operationId: listInvoices
      summary: Recorded invoices
      description: Recorded invoices.
      tags:
        - Orders
      parameters: []
      security:
        - secureSession: []
        - session: []
      responses:
        "200":
          description: Recorded invoices
          content:
            application/json:
              schema:
                type: object
                properties:
                  items:
                    type: array
                    items:
                      $ref: "#/components/schemas/InvoiceDto"
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
                  response = client.orders.list_invoices()
                  # TODO: Handle 'response' of type InvoicesResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type ListInvoicesErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.orders.listInvoices();
                // TODO: Handle 'response' of type InvoicesResponse
              } catch (err) {
                // TODO: Handle 'err' of type Orders.ListInvoicesError, discriminated with 'err.payload.kind'
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