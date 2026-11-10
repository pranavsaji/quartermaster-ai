# Record a supplier delay (/api/openapi/orders/delayDelivery)

`POST /deliveries/{id}/delay`

Record a supplier delay. Requires the MANAGER role.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /deliveries/{id}/delay:
    post:
      operationId: delayDelivery
      summary: Record a supplier delay
      description: Record a supplier delay. Requires the MANAGER role.
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
      security:
        - secureSession: []
        - session: []
      x-required-role: MANAGER
      responses:
        "200":
          description: Record a supplier delay
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
        "429":
          $ref: "#/components/responses/TooManyRequests"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/DelayDeliveryRequest"
            example:
              new_expected_date: 2026-11-15
              reason: Carrier delay
        description: Move a delivery's expected date, with a reason.
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.orders.delay_delivery(
                      UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
                      XRequestedWith.QUARTERMASTER,
                      DelayDeliveryRequest(
                          new_expected_date="2026-11-15",
                          reason="Carrier delay",
                      ),
                  )
                  # TODO: Handle 'response' of type
                  # DeliveriesDelayResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type DelayDeliveryErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.orders.delayDelivery({
                  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
                  xRequestedWith: XRequestedWith.Quartermaster,
                  body: {
                    newExpectedDate: "2026-11-15",
                    reason: "Carrier delay",
                  },
                });
                // TODO: Handle 'response' of type DeliveriesDelayResponse
              } catch (err) {
                // TODO: Handle 'err' of type Orders.DelayDeliveryError, discriminated with 'err.payload.kind'
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
    DelayDeliveryRequest:
      type: object
      properties:
        new_expected_date:
          type: string
          pattern: ^\d{4}-\d{2}-\d{2}$
          description: New expected date (YYYY-MM-DD).
          example: 2026-11-12
        reason:
          type: string
          minLength: 1
          maxLength: 255
          description: Reason given by the person making the change.
      required:
        - new_expected_date
        - reason
      description: Move a delivery's expected date, with a reason.
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