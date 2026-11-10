# Synthetic deliveries (/api/openapi/orders/listDeliveries)

`GET /deliveries`

Synthetic deliveries.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /deliveries:
    get:
      operationId: listDeliveries
      summary: Synthetic deliveries
      description: Synthetic deliveries.
      tags:
        - Orders
      parameters: []
      security:
        - secureSession: []
        - session: []
      responses:
        "200":
          description: Synthetic deliveries
          content:
            application/json:
              schema:
                type: object
                properties:
                  items:
                    type: array
                    items:
                      $ref: "#/components/schemas/DeliveryDto"
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
                  response = client.orders.list_deliveries()
                  # TODO: Handle 'response' of type DeliveriesResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type ListDeliveriesErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.orders.listDeliveries();
                // TODO: Handle 'response' of type DeliveriesResponse
              } catch (err) {
                // TODO: Handle 'err' of type Orders.ListDeliveriesError, discriminated with 'err.payload.kind'
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