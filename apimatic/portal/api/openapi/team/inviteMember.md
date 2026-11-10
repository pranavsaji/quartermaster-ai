# Invite someone (returns the one-time link; emailed when email is configured) (/api/openapi/team/inviteMember)

`POST /members/invitations`

Invite someone (returns the one-time link; emailed when email is configured). Requires the OWNER role.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /members/invitations:
    post:
      operationId: inviteMember
      summary: Invite someone (returns the one-time link; emailed when email is
        configured)
      description: Invite someone (returns the one-time link; emailed when email is
        configured). Requires the OWNER role.
      tags:
        - Team
      parameters:
        - $ref: "#/components/parameters/Csrf"
      security:
        - secureSession: []
        - session: []
      x-required-role: OWNER
      responses:
        "201":
          description: Invite someone (returns the one-time link; emailed when email is
            configured)
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/InvitationCreatedResponse"
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
              $ref: "#/components/schemas/CreateInvitationRequest"
            example:
              email: sam@example.com
              role: MANAGER
        description: Invite an email address with a role.
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.team.invite_member(
                      XRequestedWith.QUARTERMASTER,
                      CreateInvitationRequest(
                          email="sam@example.com", role=Role1.MANAGER
                      ),
                  )
                  # TODO: Handle 'response' of type
                  # InvitationCreatedResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type InviteMemberErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.team.inviteMember({
                  xRequestedWith: XRequestedWith.Quartermaster,
                  body: { email: "sam@example.com", role: Role1.Manager },
                });
                // TODO: Handle 'response' of type InvitationCreatedResponse
              } catch (err) {
                // TODO: Handle 'err' of type Team.InviteMemberError, discriminated with 'err.payload.kind'
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
    InvitationCreatedResponse:
      type: object
      properties:
        invitation:
          $ref: "#/components/schemas/InvitationDto"
        invite_url:
          type: string
          description: One-time invitation link (token in the URL fragment). Shown once.
          example: https://example.com
        email_sent:
          type: boolean
          description: Whether the link was emailed.
          example: true
      required:
        - invitation
        - invite_url
        - email_sent
      additionalProperties: false
      description: "`POST /members/invitations`. The link is returned to the owner so
        it can be shared even when no email provider is configured; it is never
        retrievable again."
    CreateInvitationRequest:
      type: object
      properties:
        email:
          type: string
          maxLength: 254
          format: email
          pattern: ^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$
          description: Email address.
          example: owner@example.com
        role:
          type: string
          enum:
            - OWNER
            - MANAGER
            - VIEWER
          description: Workspace role.
          example: OWNER
      required:
        - email
        - role
      description: Invite an email address with a role.
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
info:
  title: Quartermaster AI + TrustRail API
  version: 1.0.0
```