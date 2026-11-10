# Guarded capture of an approved PayPal order (/api/openapi/payments/capturePayment)

`POST /payments/{id}/capture`

Guarded capture of an approved PayPal order. Requires the OWNER role. Idempotent: send an `Idempotency-Key`.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /payments/{id}/capture:
    post:
      operationId: capturePayment
      summary: Guarded capture of an approved PayPal order
      description: "Guarded capture of an approved PayPal order. Requires the OWNER
        role. Idempotent: send an `Idempotency-Key`."
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
          description: Guarded capture of an approved PayPal order
          content:
            application/json:
              schema:
                type: object
                properties:
                  payment:
                    $ref: "#/components/schemas/PaymentDto"
                  purchase_order:
                    $ref: "#/components/schemas/PurchaseOrderDto"
                required:
                  - payment
                  - purchase_order
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
              $ref: "#/components/schemas/CapturePaymentRequest"
            example:
              paypal_order_id: 5O190127TN364715T
        description: Capture a PayPal order the buyer approved.
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.payments_api.capture_payment(
                      UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
                      XRequestedWith.QUARTERMASTER,
                      "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
                      CapturePaymentRequest(
                          paypal_order_id="5O190127TN364715T"
                      ),
                  )
                  # TODO: Handle 'response' of type
                  # PaymentsCaptureResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type CapturePaymentErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.paymentsApi.capturePayment({
                  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
                  xRequestedWith: XRequestedWith.Quartermaster,
                  idempotencyKey: "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
                  body: { paypalOrderId: "5O190127TN364715T" },
                });
                // TODO: Handle 'response' of type PaymentsCaptureResponse
              } catch (err) {
                // TODO: Handle 'err' of type PaymentsApi.CapturePaymentError, discriminated with 'err.payload.kind'
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
    PurchaseOrderDto:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        number:
          type: string
        request_id:
          type:
            - string
            - "null"
          description: Id of the related request.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        supplier_id:
          type: string
          description: Id of the related supplier.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        supplier_name:
          type: string
          example: Harbor Restaurant Supply
        status:
          $ref: "#/components/schemas/PurchaseOrderStatus"
        currency:
          type: string
          description: ISO 4217 currency code.
          example: USD
        subtotal_minor:
          type: integer
          description: Subtotal, in minor units (cents).
          example: 17320
        shipping_minor:
          type: integer
          description: Shipping, in minor units (cents).
          example: 17320
        tax_minor:
          type: integer
          description: Tax, in minor units (cents).
          example: 17320
        fees_minor:
          type: integer
          description: Fees, in minor units (cents).
          example: 17320
        total_minor:
          type: integer
          description: Total, in minor units (cents).
          example: 17320
        cart_hash:
          type: string
          description: SHA-256 of the canonical cart, bound into the Intent Certificate.
          example: sha256:9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f
        items:
          type: array
          items:
            $ref: "#/components/schemas/PurchaseOrderItemDto"
          description: The items in this response.
        policy_decision:
          oneOf:
            - $ref: "#/components/schemas/PolicyDecisionDto"
            - type: "null"
        certificate:
          description: Intent Certificate.
          oneOf:
            - $ref: "#/components/schemas/IntentCertificateDto"
            - type: "null"
        payment:
          description: Payment attempt.
          oneOf:
            - $ref: "#/components/schemas/PaymentDto"
            - type: "null"
        delivery:
          description: Delivery.
          oneOf:
            - $ref: "#/components/schemas/DeliveryDto"
            - type: "null"
        created_at:
          type: string
          description: When created happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
      required:
        - id
        - number
        - request_id
        - supplier_id
        - supplier_name
        - status
        - currency
        - subtotal_minor
        - shipping_minor
        - tax_minor
        - fees_minor
        - total_minor
        - cart_hash
        - items
        - policy_decision
        - certificate
        - payment
        - delivery
        - created_at
      additionalProperties: false
      description: A proposed or committed purchase order (immutable once proposed).
    CapturePaymentRequest:
      type: object
      properties:
        paypal_order_id:
          type: string
          minLength: 5
          maxLength: 64
          pattern: ^[A-Z0-9-]+$
          description: PayPal Orders v2 order id.
          example: 5O190127TN364715T
      required:
        - paypal_order_id
      description: Capture a PayPal order the buyer approved.
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
    PurchaseOrderStatus:
      type: string
      enum:
        - PROPOSED
        - BLOCKED
        - SUPERSEDED
        - APPROVED
        - PAYMENT_PENDING
        - PAID
        - FULFILLED
        - REJECTED
        - CANCELLED
        - EXPIRED
      description: Purchase order lifecycle.
    PurchaseOrderItemDto:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        kind:
          $ref: "#/components/schemas/LineKind"
        sku:
          type:
            - string
            - "null"
          description: Stock-keeping unit code.
          example: PKG-TAKEOUT-32
        description:
          type: string
          description: Free-text description.
        category:
          description: Product category.
          oneOf:
            - $ref: "#/components/schemas/ProductCategory"
            - type: "null"
        quantity:
          type: integer
          example: 1
        unit_price_minor:
          type: integer
          description: Unit price, in minor units (cents).
          example: 17320
        line_total_minor:
          type: integer
          description: Line total, in minor units (cents).
          example: 17320
        inventory_item_id:
          type:
            - string
            - "null"
          description: Id of the related inventory item.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        pack_quantity:
          type:
            - integer
            - "null"
          description: Units in one pack.
          example: 1
      required:
        - id
        - kind
        - sku
        - description
        - category
        - quantity
        - unit_price_minor
        - line_total_minor
        - inventory_item_id
        - pack_quantity
      additionalProperties: false
      description: A purchase order line.
    PolicyDecisionDto:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        purchase_order_id:
          type: string
          description: Id of the related purchase order.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        decision:
          $ref: "#/components/schemas/PolicyDecisionKind"
        violations:
          type: array
          items:
            $ref: "#/components/schemas/ViolationDto"
        checks:
          type: array
          items:
            $ref: "#/components/schemas/PolicyCheckDto"
        human_approval_required:
          type: boolean
          description: An owner must approve every purchase (always true).
          example: true
        mandate_version:
          type: number
          example: 1
        policy_version:
          type: string
        input_digest:
          type: string
        evaluated_at:
          type: string
          description: When evaluated happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
      required:
        - id
        - purchase_order_id
        - decision
        - violations
        - checks
        - human_approval_required
        - mandate_version
        - policy_version
        - input_digest
        - evaluated_at
      additionalProperties: false
      description: A recorded TrustRail decision with its checks and violations.
    IntentCertificateDto:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        status:
          $ref: "#/components/schemas/CertificateStatus"
        payload:
          $ref: "#/components/schemas/IntentCertificatePayload"
        key_id:
          type: string
          description: Id of the related key.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        signature:
          type: string
        algorithm:
          type: string
          const: Ed25519
          example: Ed25519
        issued_at:
          type: string
          description: When issued happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
        expires_at:
          type: string
          description: When expires happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
      required:
        - id
        - status
        - payload
        - key_id
        - signature
        - algorithm
        - issued_at
        - expires_at
      additionalProperties: false
      description: The owner's signed approval of one exact cart (Ed25519).
    DeliveryDto:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        purchase_order_id:
          type: string
          description: Id of the related purchase order.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        supplier_id:
          type: string
          description: Id of the related supplier.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        status:
          $ref: "#/components/schemas/DeliveryStatus"
        expected_date:
          type: string
          description: Expected date (YYYY-MM-DD).
          example: 2026-11-12
        original_expected_date:
          type: string
          description: Original expected date (YYYY-MM-DD).
          example: 2026-11-12
        delivered_at:
          type:
            - string
            - "null"
          description: When delivered happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
        delay_reason:
          type:
            - string
            - "null"
        data_source:
          type: string
          const: SYNTHETIC
          description: Where this data came from.
          example: SYNTHETIC
      required:
        - id
        - purchase_order_id
        - supplier_id
        - status
        - expected_date
        - original_expected_date
        - delivered_at
        - delay_reason
        - data_source
      additionalProperties: false
      description: A delivery for a paid purchase order (synthetic in the sandbox).
    DeliveryStatus:
      type: string
      enum:
        - SCHEDULED
        - IN_TRANSIT
        - DELAYED
        - DELIVERED
        - CANCELLED
      description: Delivery progress.
    CertificateStatus:
      type: string
      enum:
        - ACTIVE
        - CONSUMED
        - REVOKED
        - EXPIRED
      description: Lifecycle of an Intent Certificate.
    IntentCertificatePayload:
      type: object
      properties:
        certificate_version:
          type: number
          const: 1
          example: 1
        intent_id:
          type: string
          description: Id of the related intent.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        organization_id:
          type: string
          description: Id of the related organization.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        buyer_id:
          type: string
          description: Id of the related buyer.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        purchase_order_id:
          type: string
          description: Id of the related purchase order.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        supplier_id:
          type: string
          description: Id of the related supplier.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        cart_hash:
          type: string
          description: SHA-256 of the canonical cart, bound into the Intent Certificate.
          example: sha256:9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f
        mandate_id:
          type: string
          description: Id of the related mandate.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        mandate_version:
          type: number
          example: 1
        policy_decision_id:
          type: string
          description: Id of the related policy decision.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        currency:
          type: string
          description: ISO 4217 currency code.
          example: USD
        approved_amount_minor:
          type: integer
          description: Approved amount, in minor units (cents).
          example: 17320
        approved_at:
          type: string
          description: When approved happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
        expires_at:
          type: string
          description: When expires happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
        nonce:
          type: string
        key_id:
          type: string
          description: Id of the related key.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
      required:
        - certificate_version
        - intent_id
        - organization_id
        - buyer_id
        - purchase_order_id
        - supplier_id
        - cart_hash
        - mandate_id
        - mandate_version
        - policy_decision_id
        - currency
        - approved_amount_minor
        - approved_at
        - expires_at
        - nonce
        - key_id
      additionalProperties: false
      description: The signed fields of an Intent Certificate.
    PolicyDecisionKind:
      type: string
      enum:
        - ALLOW
        - REVIEW_REQUIRED
        - BLOCK
      description: TrustRail's verdict on a cart.
    ViolationDto:
      type: object
      properties:
        code:
          $ref: "#/components/schemas/ViolationCode"
        severity:
          type: string
          enum:
            - BLOCK
            - REVIEW
          description: Severity.
          example: BLOCK
        message:
          type: string
          description: Human-readable message (fixed per code).
        evidence:
          type: object
          additionalProperties: true
      required:
        - code
        - severity
        - message
      additionalProperties: false
      description: A policy violation with its severity and explanation.
    PolicyCheckDto:
      type: object
      properties:
        code:
          type: string
          description: Stable machine-readable code.
        passed:
          type: boolean
          example: true
        detail:
          type: string
      required:
        - code
        - passed
        - detail
      additionalProperties: false
      description: One TrustRail policy check and its result.
    ViolationCode:
      type: string
      enum:
        - MANDATE_INACTIVE
        - EMPTY_CART
        - CURRENCY_MISMATCH
        - SUPPLIER_NOT_APPROVED
        - SUPPLIER_INACTIVE
        - CATEGORY_NOT_ALLOWED
        - UNAUTHORIZED_LINE_ITEM
        - PRICE_MISMATCH
        - CART_ARITHMETIC_INVALID
        - PER_ORDER_LIMIT_EXCEEDED
        - WEEKLY_BUDGET_EXCEEDED
        - REQUEST_BUDGET_EXCEEDED
        - MARKET_PRICE_PREMIUM_EXCEEDED
        - MARKET_REFERENCE_UNAVAILABLE
        - DUPLICATE_ORDER
        - SUBSCRIPTION_NOT_ALLOWED
        - QUARANTINED_SOURCE
        - QUANTITY_EXCEEDS_NEED
        - POLICY_INPUT_INVALID
      description: Machine-readable TrustRail policy violation.
    LineKind:
      type: string
      enum:
        - PRODUCT
        - SHIPPING
        - TAX
        - FEE
      description: Kind of cart or invoice line.
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