# Current user and organization (/api/openapi/accounts/getCurrentUser)

`GET /auth/me`

Current user and organization.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /auth/me:
    get:
      operationId: getCurrentUser
      summary: Current user and organization
      description: Current user and organization.
      tags:
        - Accounts
      parameters: []
      security:
        - secureSession: []
        - session: []
      responses:
        "200":
          description: Current user and organization
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
                  response = client.accounts_api.get_current_user()
                  # TODO: Handle 'response' of type AuthMeResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type GetCurrentUserErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response =
                  await client.accountsApi.getCurrentUser();
                // TODO: Handle 'response' of type AuthMeResponse
              } catch (err) {
                // TODO: Handle 'err' of type AccountsApi.GetCurrentUserError, discriminated with 'err.payload.kind'
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