# Create (or return) the PayPal sandbox order for an intent (/api/openapi/payments/createPayPalOrder)

`POST /intents/{id}/paypal-order`

Create (or return) the PayPal sandbox order for an intent. Requires the OWNER role. Idempotent: send an `Idempotency-Key`.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /intents/{id}/paypal-order:
    post:
      operationId: createPayPalOrder
      summary: Create (or return) the PayPal sandbox order for an intent
      description: "Create (or return) the PayPal sandbox order for an intent.
        Requires the OWNER role. Idempotent: send an `Idempotency-Key`."
      tags:
        - Payments
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
      x-required-role: OWNER
      responses:
        "200":
          description: Create (or return) the PayPal sandbox order for an intent
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/PayPalOrderResponse"
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
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.payments_api.create_pay_pal_order(
                      UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
                      XRequestedWith.QUARTERMASTER,
                      "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
                  )
                  # TODO: Handle 'response' of type PayPalOrderResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # CreatePayPalOrderErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response =
                  await client.paymentsApi.createPayPalOrder({
                    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
                    xRequestedWith: XRequestedWith.Quartermaster,
                    idempotencyKey:
                      "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
                  });
                // TODO: Handle 'response' of type PayPalOrderResponse
              } catch (err) {
                // TODO: Handle 'err' of type PaymentsApi.CreatePayPalOrderError, discriminated with 'err.payload.kind'
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
    PayPalOrderResponse:
      type: object
      properties:
        payment:
          $ref: "#/components/schemas/PaymentDto"
        paypal_order_id:
          type: string
          description: PayPal Orders v2 order id.
          example: 5O190127TN364715T
      required:
        - payment
        - paypal_order_id
      additionalProperties: false
      description: "`POST /intents/:id/paypal-order`."
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
    PaymentDto:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        intent_id:
          type: string
          description: Id of the related intent.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        purchase_order_id:
          type: string
          description: Id of the related purchase order.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        status:
          $ref: "#/components/schemas/PaymentStatus"
        paypal_order_id:
          type:
            - string
            - "null"
          description: PayPal Orders v2 order id.
          example: 5O190127TN364715T
        paypal_capture_id:
          type:
            - string
            - "null"
          description: PayPal capture id once payment completed.
          example: 3C679366HH908993F
        amount_minor:
          type: integer
          description: Amount, in minor units (cents).
          example: 17320
        currency:
          type: string
          description: ISO 4217 currency code.
          example: USD
        captured_amount_minor:
          type:
            - integer
            - "null"
          description: Captured amount, in minor units (cents).
          example: 17320
        refunded_amount_minor:
          type: integer
          description: Refunded amount, in minor units (cents).
          example: 17320
        failure_code:
          type:
            - string
            - "null"
        failure_message:
          type:
            - string
            - "null"
        created_at:
          type: string
          description: When created happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
        updated_at:
          type: string
          description: When updated happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
        completed_at:
          type:
            - string
            - "null"
          description: When completed happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
      required:
        - id
        - intent_id
        - purchase_order_id
        - status
        - paypal_order_id
        - paypal_capture_id
        - amount_minor
        - currency
        - captured_amount_minor
        - refunded_amount_minor
        - failure_code
        - failure_message
        - created_at
        - updated_at
        - completed_at
      additionalProperties: false
      description: A PayPal payment attempt for a purchase order.
    PaymentStatus:
      type: string
      enum:
        - CREATED
        - ORDER_CREATED
        - PAYER_APPROVED
        - CAPTURE_PENDING
        - COMPLETED
        - FAILED
        - VOIDED
        - REFUNDED
        - PARTIALLY_REFUNDED
      description: Payment attempt lifecycle.
  responses:
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