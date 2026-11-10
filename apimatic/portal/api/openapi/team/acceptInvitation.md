# Accept an invitation, create the account and sign in (/api/openapi/team/acceptInvitation)

`POST /invitations/accept`

Accept an invitation, create the account and sign in.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /invitations/accept:
    post:
      operationId: acceptInvitation
      summary: Accept an invitation, create the account and sign in
      description: Accept an invitation, create the account and sign in.
      tags:
        - Team
      parameters:
        - $ref: "#/components/parameters/Csrf"
      security: []
      responses:
        "201":
          description: Accept an invitation, create the account and sign in
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
              $ref: "#/components/schemas/AcceptInvitationRequest"
            example:
              token: Zm9yLWRvY3MtZXhhbXBsZS1vbmx5LW5vdC1hLXRva2Vu
              name: Sam Manager
              password: a-new-strong-passphrase
        description: "Accept an invitation: the invitee's name and new password, with
          the link token."
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.team.accept_invitation(
                      XRequestedWith.QUARTERMASTER,
                      AcceptInvitationRequest(
                          token="Zm9yLWRvY3MtZXhhbXBsZS1vbmx5LW5vdC1hLXRva2Vu",
                          name="Sam Manager",
                          password="a-new-strong-passphrase",
                      ),
                  )
                  # TODO: Handle 'response' of type
                  # InvitationsAcceptResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # AcceptInvitationErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.team.acceptInvitation({
                  xRequestedWith: XRequestedWith.Quartermaster,
                  body: {
                    token: "Zm9yLWRvY3MtZXhhbXBsZS1vbmx5LW5vdC1hLXRva2Vu",
                    name: "Sam Manager",
                    password: "a-new-strong-passphrase",
                  },
                });
                // TODO: Handle 'response' of type InvitationsAcceptResponse
              } catch (err) {
                // TODO: Handle 'err' of type Team.AcceptInvitationError, discriminated with 'err.payload.kind'
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
    AcceptInvitationRequest:
      type: object
      properties:
        token:
          type: string
          minLength: 20
          maxLength: 200
          pattern: ^[\w-]+$
          description: One-time link token from an invitation or reset email.
        name:
          type: string
          minLength: 1
          maxLength: 120
          description: Display name.
          example: Harbor Restaurant Supply
        password:
          type: string
          minLength: 12
          maxLength: 200
          description: Password (never returned by the API).
          example: correct-horse-battery-staple
      required:
        - token
        - name
        - password
      description: "Accept an invitation: the invitee's name and new password, with
        the link token."
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