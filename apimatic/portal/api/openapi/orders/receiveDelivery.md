# Confirm goods receipt (updates inventory) (/api/openapi/orders/receiveDelivery)

`POST /deliveries/{id}/receive`

Confirm goods receipt (updates inventory). Requires the MANAGER role. Idempotent: send an `Idempotency-Key`.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /deliveries/{id}/receive:
    post:
      operationId: receiveDelivery
      summary: Confirm goods receipt (updates inventory)
      description: "Confirm goods receipt (updates inventory). Requires the MANAGER
        role. Idempotent: send an `Idempotency-Key`."
      tags:
        - Orders
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
          description: Confirm goods receipt (updates inventory)
          content:
            application/json:
              schema:
                type: object
                properties:
                  delivery:
                    $ref: "#/components/schemas/DeliveryDto"
                required:
                  - delivery
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
              $ref: "#/components/schemas/ReceiveDeliveryRequest"
        description: Quantities received per purchase order line.
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.orders.receive_delivery(
                      UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
                      XRequestedWith.QUARTERMASTER,
                      "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
                      ReceiveDeliveryRequest(
                          lines=[
                              Line(
                                  purchase_order_item_id=UUID(
                                      "00000000-0000-0000-0000-000000000000",
                                  ),
                                  quantity_received=1,
                              ),
                          ],
                      ),
                  )
                  # TODO: Handle 'response' of type
                  # DeliveriesReceiveResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # ReceiveDeliveryErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.orders.receiveDelivery({
                  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
                  xRequestedWith: XRequestedWith.Quartermaster,
                  idempotencyKey: "3b8c2c1e-6f6d-4a59-9a43-8f0c2a9e1d22",
                  body: {
                    lines: [
                      {
                        purchaseOrderItemId:
                          "00000000-0000-0000-0000-000000000000",
                        quantityReceived: 1,
                      },
                    ],
                  },
                });
                // TODO: Handle 'response' of type DeliveriesReceiveResponse
              } catch (err) {
                // TODO: Handle 'err' of type Orders.ReceiveDeliveryError, discriminated with 'err.payload.kind'
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
    ReceiveDeliveryRequest:
      type: object
      properties:
        lines:
          minItems: 1
          maxItems: 200
          type: array
          items:
            type: object
            properties:
              purchase_order_item_id:
                type: string
                format: uuid
                pattern: ^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$
                description: Id of the related purchase order item.
                example: 0f8fad5b-d9cb-469f-a165-70867728950e
              quantity_received:
                type: integer
                minimum: 0
                maximum: 1000000
                example: 1
            required:
              - purchase_order_item_id
              - quantity_received
          description: Line items.
        note:
          type: string
          maxLength: 500
          description: Optional note.
      required:
        - lines
      description: Quantities received per purchase order line.
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
    DeliveryStatus:
      type: string
      enum:
        - SCHEDULED
        - IN_TRANSIT
        - DELAYED
        - DELIVERED
        - CANCELLED
      description: Delivery progress.
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