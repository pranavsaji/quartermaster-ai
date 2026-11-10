# List procurement requests (/api/openapi/procurement/listProcurementRequests)

`GET /procurement/requests`

List procurement requests.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /procurement/requests:
    get:
      operationId: listProcurementRequests
      summary: List procurement requests
      description: List procurement requests.
      tags:
        - Procurement
      parameters: []
      security:
        - secureSession: []
        - session: []
      responses:
        "200":
          description: List procurement requests
          content:
            application/json:
              schema:
                type: object
                properties:
                  items:
                    type: array
                    items:
                      $ref: "#/components/schemas/ProcurementRequestSummaryDto"
                  next_cursor:
                    type:
                      - string
                      - "null"
                    description: Pass as `cursor` for the next page; null on the last page.
                required:
                  - items
                  - next_cursor
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
                  response = client.procurement.list_procurement_requests()
                  # TODO: Handle 'response' of type
                  # ProcurementRequestsResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # ListProcurementRequestsErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response =
                  await client.procurement.listProcurementRequests();
                // TODO: Handle 'response' of type ProcurementRequestsResponse
              } catch (err) {
                // TODO: Handle 'err' of type Procurement.ListProcurementRequestsError, discriminated with 'err.payload.kind'
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
    ProcurementRequestSummaryDto:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        status:
          $ref: "#/components/schemas/RequestStatus"
        instruction:
          type: string
          description: The natural-language instruction from the restaurant.
        total_minor:
          type:
            - integer
            - "null"
          description: Total, in minor units (cents).
          example: 17320
        currency:
          type: string
          description: ISO 4217 currency code.
          example: USD
        created_at:
          type: string
          description: When created happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
      required:
        - id
        - status
        - instruction
        - total_minor
        - currency
        - created_at
      additionalProperties: false
      description: A procurement request in a list.
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
    RequestStatus:
      type: string
      enum:
        - DRAFT
        - RESEARCHING
        - READY_FOR_REVIEW
        - BLOCKED
        - APPROVED
        - PAYMENT_PENDING
        - PAID
        - FULFILLED
        - REJECTED
        - CANCELLED
        - FAILED
      description: Procurement request lifecycle.
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