# Platform health (operators) (/api/openapi/operations/getPlatformHealth)

`GET /ops/health`

Platform health (operators).

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /ops/health:
    get:
      operationId: getPlatformHealth
      summary: Platform health (operators)
      description: Platform health (operators).
      tags:
        - Operations
      parameters: []
      security:
        - secureSession: []
        - session: []
      responses:
        "200":
          description: Platform health (operators)
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/OpsHealthDto"
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
                  response = client.operations.get_platform_health()
                  # TODO: Handle 'response' of type OpsHealthDto
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # GetPlatformHealthErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response =
                  await client.operations.getPlatformHealth();
                // TODO: Handle 'response' of type OpsHealthDto
              } catch (err) {
                // TODO: Handle 'err' of type Operations.GetPlatformHealthError, discriminated with 'err.payload.kind'
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
    OpsHealthDto:
      type: object
      properties:
        error_tracking:
          type: object
          properties:
            open_errors:
              type: integer
              example: 1
            sentry:
              type: boolean
              example: true
          required:
            - open_errors
            - sentry
          additionalProperties: false
        alerting:
          type: object
          properties:
            email:
              type: boolean
              description: Email address.
              example: true
            webhook:
              type: boolean
              example: true
            recipients:
              type: integer
              example: 1
          required:
            - email
            - webhook
            - recipients
          additionalProperties: false
        email:
          type: object
          properties:
            enabled:
              type: boolean
              description: Whether the feature is turned on.
              example: true
            provider:
              type: string
              enum:
                - resend
                - webhook
                - none
              description: Provider in use.
              example: resend
          required:
            - enabled
            - provider
          additionalProperties: false
          description: Email address.
        paypal_webhooks:
          type: object
          properties:
            last_received_at:
              type:
                - string
                - "null"
              description: When last received happened (ISO 8601, UTC).
              example: 2026-11-10T18:30:00.000Z
            received_24h:
              type: integer
              example: 1
            rejected_24h:
              type: integer
              example: 1
          required:
            - last_received_at
            - received_24h
            - rejected_24h
          additionalProperties: false
        payments:
          type: object
          properties:
            capture_pending:
              type: integer
              example: 1
            oldest_pending_minutes:
              type:
                - number
                - "null"
              description: Oldest pending, in minutes.
              example: 1
          required:
            - capture_pending
            - oldest_pending_minutes
          additionalProperties: false
      required:
        - error_tracking
        - alerting
        - email
        - paypal_webhooks
        - payments
      additionalProperties: false
      description: "Platform health for operators: error tracking, alerting, email,
        webhooks, payments."
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