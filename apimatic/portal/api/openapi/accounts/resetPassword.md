# Set a new password from a one-time link (/api/openapi/accounts/resetPassword)

`POST /auth/password/reset`

Set a new password from a one-time link.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /auth/password/reset:
    post:
      operationId: resetPassword
      summary: Set a new password from a one-time link
      description: Set a new password from a one-time link.
      tags:
        - Accounts
      parameters:
        - $ref: "#/components/parameters/Csrf"
      security: []
      responses:
        "200":
          description: Set a new password from a one-time link
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    const: reset
                required:
                  - status
        "400":
          $ref: "#/components/responses/BadRequest"
        "409":
          $ref: "#/components/responses/Conflict"
        "429":
          $ref: "#/components/responses/TooManyRequests"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ResetPasswordRequest"
            example:
              token: 3q2-7wEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
              password: a-new-strong-passphrase
        description: Set a new password from a one-time reset link.
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.accounts_api.reset_password(
                      XRequestedWith.QUARTERMASTER,
                      ResetPasswordRequest(
                          token="3q2-7wEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                          password="a-new-strong-passphrase",
                      ),
                  )
                  # TODO: Handle 'response' of type
                  # AuthPasswordResetResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type ResetPasswordErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.accountsApi.resetPassword({
                  xRequestedWith: XRequestedWith.Quartermaster,
                  body: {
                    token: "3q2-7wEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                    password: "a-new-strong-passphrase",
                  },
                });
                // TODO: Handle 'response' of type AuthPasswordResetResponse
              } catch (err) {
                // TODO: Handle 'err' of type AccountsApi.ResetPasswordError, discriminated with 'err.payload.kind'
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
  responses:
    BadRequest:
      description: The request failed validation (`BAD_REQUEST`, details list each field).
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
  schemas:
    ResetPasswordRequest:
      type: object
      properties:
        token:
          type: string
          minLength: 20
          maxLength: 200
          pattern: ^[\w-]+$
          description: One-time link token from an invitation or reset email.
        password:
          type: string
          minLength: 12
          maxLength: 200
          description: Password (never returned by the API).
          example: correct-horse-battery-staple
      required:
        - token
        - password
      description: Set a new password from a one-time reset link.
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
info:
  title: Quartermaster AI + TrustRail API
  version: 1.0.0
```