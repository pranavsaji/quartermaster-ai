# Preview an invitation from its link token (/api/openapi/team/lookupInvitation)

`POST /invitations/lookup`

Preview an invitation from its link token.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /invitations/lookup:
    post:
      operationId: lookupInvitation
      summary: Preview an invitation from its link token
      description: Preview an invitation from its link token.
      tags:
        - Team
      parameters:
        - $ref: "#/components/parameters/Csrf"
      security: []
      responses:
        "200":
          description: Preview an invitation from its link token
          content:
            application/json:
              schema:
                type: object
                properties:
                  invitation:
                    $ref: "#/components/schemas/InvitationPreviewDto"
                required:
                  - invitation
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
              $ref: "#/components/schemas/InvitationTokenRequest"
            example:
              token: Zm9yLWRvY3MtZXhhbXBsZS1vbmx5LW5vdC1hLXRva2Vu
        description: An invitation link token.
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.team.lookup_invitation(
                      XRequestedWith.QUARTERMASTER,
                      InvitationTokenRequest(
                          token="Zm9yLWRvY3MtZXhhbXBsZS1vbmx5LW5vdC1hLXRva2Vu",
                      ),
                  )
                  # TODO: Handle 'response' of type
                  # InvitationsLookupResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # LookupInvitationErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.team.lookupInvitation({
                  xRequestedWith: XRequestedWith.Quartermaster,
                  body: {
                    token: "Zm9yLWRvY3MtZXhhbXBsZS1vbmx5LW5vdC1hLXRva2Vu",
                  },
                });
                // TODO: Handle 'response' of type InvitationsLookupResponse
              } catch (err) {
                // TODO: Handle 'err' of type Team.LookupInvitationError, discriminated with 'err.payload.kind'
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
    InvitationPreviewDto:
      type: object
      properties:
        organization_name:
          type: string
          description: Workspace (restaurant) name.
          example: Harbor Restaurant Supply
        email:
          type: string
          description: Email address.
          example: owner@example.com
        role:
          $ref: "#/components/schemas/Role"
        invited_by_name:
          type:
            - string
            - "null"
          description: Name of the owner who sent the invitation.
          example: Harbor Restaurant Supply
        expires_at:
          type: string
          description: When expires happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
      required:
        - organization_name
        - email
        - role
        - invited_by_name
        - expires_at
      additionalProperties: false
      description: What someone opening an invitation link sees before accepting.
    InvitationTokenRequest:
      type: object
      properties:
        token:
          type: string
          minLength: 20
          maxLength: 200
          pattern: ^[\w-]+$
          description: One-time link token from an invitation or reset email.
      required:
        - token
      description: An invitation link token.
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