# Change your password (signs out other sessions) (/api/openapi/accounts/changePassword)

`POST /auth/password/change`

Change your password (signs out other sessions).

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /auth/password/change:
    post:
      operationId: changePassword
      summary: Change your password (signs out other sessions)
      description: Change your password (signs out other sessions).
      tags:
        - Accounts
      parameters:
        - $ref: "#/components/parameters/Csrf"
      security:
        - secureSession: []
        - session: []
      responses:
        "200":
          description: Change your password (signs out other sessions)
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    const: changed
                required:
                  - status
        "400":
          $ref: "#/components/responses/BadRequest"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"
        "409":
          $ref: "#/components/responses/Conflict"
        "429":
          $ref: "#/components/responses/TooManyRequests"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ChangePasswordRequest"
            example:
              current_password: correct-horse-battery-staple
              new_password: a-new-strong-passphrase
        description: Change the signed-in user's password.
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.accounts_api.change_password(
                      XRequestedWith.QUARTERMASTER,
                      ChangePasswordRequest(
                          current_password="correct-horse-battery-staple",
                          new_password="a-new-strong-passphrase",
                      ),
                  )
                  # TODO: Handle 'response' of type
                  # AuthPasswordChangeResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type ChangePasswordErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.accountsApi.changePassword({
                  xRequestedWith: XRequestedWith.Quartermaster,
                  body: {
                    currentPassword: "correct-horse-battery-staple",
                    newPassword: "a-new-strong-passphrase",
                  },
                });
                // TODO: Handle 'response' of type AuthPasswordChangeResponse
              } catch (err) {
                // TODO: Handle 'err' of type AccountsApi.ChangePasswordError, discriminated with 'err.payload.kind'
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
  schemas:
    ChangePasswordRequest:
      type: object
      properties:
        current_password:
          type: string
          minLength: 1
          maxLength: 200
          example: correct-horse-battery-staple
        new_password:
          type: string
          minLength: 12
          maxLength: 200
          example: correct-horse-battery-staple
      required:
        - current_password
        - new_password
      description: Change the signed-in user's password.
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