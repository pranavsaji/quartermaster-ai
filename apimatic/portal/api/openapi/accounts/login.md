# Sign in (sets httpOnly session cookie) (/api/openapi/accounts/login)

`POST /auth/login`

Sign in (sets httpOnly session cookie).

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /auth/login:
    post:
      operationId: login
      summary: Sign in (sets httpOnly session cookie)
      description: Sign in (sets httpOnly session cookie).
      tags:
        - Accounts
      parameters:
        - $ref: "#/components/parameters/Csrf"
      security: []
      responses:
        "200":
          description: Sign in (sets httpOnly session cookie)
          content:
            application/json:
              schema:
                type: object
                properties:
                  user:
                    $ref: "#/components/schemas/SessionUser"
                required:
                  - user
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
              $ref: "#/components/schemas/LoginRequest"
            example:
              email: owner@demo.quartermaster.dev
              password: correct-horse-battery-staple
        description: Email and password sign-in.
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.accounts_api.login(
                      XRequestedWith.QUARTERMASTER,
                      LoginRequest(
                          email="owner@demo.quartermaster.dev",
                          password="correct-horse-battery-staple",
                      ),
                  )
                  # TODO: Handle 'response' of type AuthLoginResponse
              except ApiError as e:
                  ...  # TODO: Handle 'e.error' of type LoginErrorBody
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.accountsApi.login({
                  xRequestedWith: XRequestedWith.Quartermaster,
                  body: {
                    email: "owner@demo.quartermaster.dev",
                    password: "correct-horse-battery-staple",
                  },
                });
                // TODO: Handle 'response' of type AuthLoginResponse
              } catch (err) {
                // TODO: Handle 'err' of type AccountsApi.LoginError, discriminated with 'err.payload.kind'
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
    SessionUser:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        email:
          type: string
          description: Email address.
          example: owner@example.com
        name:
          type: string
          description: Display name.
          example: Harbor Restaurant Supply
        role:
          $ref: "#/components/schemas/Role"
        organization:
          type: object
          properties:
            id:
              type: string
              description: Unique identifier (UUID).
              example: 0f8fad5b-d9cb-469f-a165-70867728950e
            name:
              type: string
              description: Display name.
              example: Harbor Restaurant Supply
            timezone:
              type: string
              description: IANA time zone of the workspace.
              example: America/Los_Angeles
            currency:
              type: string
              description: ISO 4217 currency code.
              example: USD
          required:
            - id
            - name
            - timezone
            - currency
          additionalProperties: false
          description: The user's workspace.
        operator:
          type: boolean
          description: "Platform operator (OPERATOR_EMAILS): may see system-wide error
            tracking."
          example: true
      required:
        - id
        - email
        - name
        - role
        - organization
        - operator
      additionalProperties: false
      description: The signed-in user and their workspace.
    LoginRequest:
      type: object
      properties:
        email:
          type: string
          maxLength: 254
          format: email
          pattern: ^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$
          description: Email address.
          example: owner@example.com
        password:
          type: string
          minLength: 8
          maxLength: 200
          description: Password (never returned by the API).
          example: correct-horse-battery-staple
      required:
        - email
        - password
      description: Email and password sign-in.
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
    Role:
      type: string
      enum:
        - OWNER
        - MANAGER
        - VIEWER
      description: "Workspace role: owners approve and pay, managers request, viewers read."
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
info:
  title: Quartermaster AI + TrustRail API
  version: 1.0.0
```