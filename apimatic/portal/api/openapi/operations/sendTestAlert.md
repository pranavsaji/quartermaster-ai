# Send a test alert to every configured channel (/api/openapi/operations/sendTestAlert)

`POST /ops/alerts/test`

Send a test alert to every configured channel.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /ops/alerts/test:
    post:
      operationId: sendTestAlert
      summary: Send a test alert to every configured channel
      description: Send a test alert to every configured channel.
      tags:
        - Operations
      parameters:
        - $ref: "#/components/parameters/Csrf"
      security:
        - secureSession: []
        - session: []
      responses:
        "200":
          description: Send a test alert to every configured channel
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AlertTestResponse"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"
        "409":
          $ref: "#/components/responses/Conflict"
        "429":
          $ref: "#/components/responses/TooManyRequests"
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.operations.send_test_alert(
                      XRequestedWith.QUARTERMASTER
                  )
                  # TODO: Handle 'response' of type AlertTestResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type SendTestAlertErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.operations.sendTestAlert({
                  xRequestedWith: XRequestedWith.Quartermaster,
                });
                // TODO: Handle 'response' of type AlertTestResponse
              } catch (err) {
                // TODO: Handle 'err' of type Operations.SendTestAlertError, discriminated with 'err.payload.kind'
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
    AlertTestResponse:
      type: object
      properties:
        email_recipients:
          type: integer
          example: 1
        emails_sent:
          type: integer
          example: 1
        webhook_sent:
          type: boolean
          example: true
      required:
        - email_recipients
        - emails_sent
        - webhook_sent
      additionalProperties: false
      description: "`POST /ops/alerts/test`: where the test alert went."
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