# Whether PayPal's signed notifications are arriving (/api/openapi/security/getPayPalNotificationStatus)

`GET /security/paypal-notifications`

Whether PayPal's signed notifications are arriving.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /security/paypal-notifications:
    get:
      operationId: getPayPalNotificationStatus
      summary: Whether PayPal's signed notifications are arriving
      description: Whether PayPal's signed notifications are arriving.
      tags:
        - Security
      parameters: []
      security:
        - secureSession: []
        - session: []
      responses:
        "200":
          description: Whether PayPal's signed notifications are arriving
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    $ref: "#/components/schemas/PayPalNotificationStatusDto"
                required:
                  - status
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
            Example: >-
              try:
                  response = client.security_api.get_pay_pal_notification_status()
                  # TODO: Handle 'response' of type
                  # SecurityPaypalNotificationsResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # GetPayPalNotificationStatusErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response =
                  await client.securityApi.getPayPalNotificationStatus();
                // TODO: Handle 'response' of type SecurityPaypalNotificationsResponse
              } catch (err) {
                // TODO: Handle 'err' of type SecurityApi.GetPayPalNotificationStatusError, discriminated with 'err.payload.kind'
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
    PayPalNotificationStatusDto:
      type: object
      properties:
        configured:
          type: boolean
          example: true
        last_received_at:
          type:
            - string
            - "null"
          description: When last received happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
        last_event_type:
          type:
            - string
            - "null"
        received_24h:
          type: integer
          example: 1
        unconfirmed_captures_7d:
          type: integer
          description: Completed captures in the last 7 days with no verified PayPal
            notification.
          example: 1
        rejected_signatures_24h:
          type: integer
          example: 1
      required:
        - configured
        - last_received_at
        - last_event_type
        - received_24h
        - unconfirmed_captures_7d
        - rejected_signatures_24h
      additionalProperties: false
      description: Whether PayPal's signed notifications (webhooks) are reaching this
        deployment for an organisation.
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