# Revoke an open invitation (/api/openapi/team/revokeInvitation)

`POST /members/invitations/{id}/revoke`

Revoke an open invitation. Requires the OWNER role.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /members/invitations/{id}/revoke:
    post:
      operationId: revokeInvitation
      summary: Revoke an open invitation
      description: Revoke an open invitation. Requires the OWNER role.
      tags:
        - Team
      parameters:
        - name: id
          in: path
          required: true
          description: Resource id (UUID).
          schema:
            type: string
            format: uuid
            description: Resource id (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        - $ref: "#/components/parameters/Csrf"
      security:
        - secureSession: []
        - session: []
      x-required-role: OWNER
      responses:
        "200":
          description: Revoke an open invitation
          content:
            application/json:
              schema:
                type: object
                properties:
                  invitation:
                    $ref: "#/components/schemas/InvitationDto"
                required:
                  - invitation
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"
        "404":
          $ref: "#/components/responses/NotFound"
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
                  response = client.team.revoke_invitation(
                      UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
                      XRequestedWith.QUARTERMASTER,
                  )
                  # TODO: Handle 'response' of type
                  # MembersInvitationsRevokeResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # RevokeInvitationErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.team.revokeInvitation({
                  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
                  xRequestedWith: XRequestedWith.Quartermaster,
                });
                // TODO: Handle 'response' of type MembersInvitationsRevokeResponse
              } catch (err) {
                // TODO: Handle 'err' of type Team.RevokeInvitationError, discriminated with 'err.payload.kind'
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
    InvitationDto:
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
        role:
          $ref: "#/components/schemas/Role"
        status:
          $ref: "#/components/schemas/InvitationStatus"
        invited_by_name:
          type:
            - string
            - "null"
          description: Name of the owner who sent the invitation.
          example: Harbor Restaurant Supply
        created_at:
          type: string
          description: When created happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
        expires_at:
          type: string
          description: When expires happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
      required:
        - id
        - email
        - role
        - status
        - invited_by_name
        - created_at
        - expires_at
      additionalProperties: false
      description: An invitation to the workspace.
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
    InvitationStatus:
      type: string
      enum:
        - PENDING
        - ACCEPTED
        - REVOKED
        - EXPIRED
      description: Invitation lifecycle.
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
    NotFound:
      description: No such resource in your workspace.
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