# Email a password reset link (always 202) (/api/openapi/accounts/requestPasswordReset)

`POST /auth/password/forgot`

Email a password reset link (always 202).

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /auth/password/forgot:
    post:
      operationId: requestPasswordReset
      summary: Email a password reset link (always 202)
      description: Email a password reset link (always 202).
      tags:
        - Accounts
      parameters:
        - $ref: "#/components/parameters/Csrf"
      security: []
      responses:
        "202":
          description: Email a password reset link (always 202)
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    const: sent
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
              $ref: "#/components/schemas/ForgotPasswordRequest"
            example:
              email: ada@example.com
        description: Request a password reset email.
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.accounts_api.request_password_reset(
                      XRequestedWith.QUARTERMASTER,
                      ForgotPasswordRequest(email="ada@example.com"),
                  )
                  # TODO: Handle 'response' of type
                  # AuthPasswordForgotResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # RequestPasswordResetErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response =
                  await client.accountsApi.requestPasswordReset({
                    xRequestedWith: XRequestedWith.Quartermaster,
                    body: { email: "ada@example.com" },
                  });
                // TODO: Handle 'response' of type AuthPasswordForgotResponse
              } catch (err) {
                // TODO: Handle 'err' of type AccountsApi.RequestPasswordResetError, discriminated with 'err.payload.kind'
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
    ForgotPasswordRequest:
      type: object
      properties:
        email:
          type: string
          maxLength: 254
          format: email
          pattern: ^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$
          description: Email address.
          example: owner@example.com
      required:
        - email
      description: Request a password reset email.
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