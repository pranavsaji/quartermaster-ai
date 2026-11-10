# Members, and open invitations for owners (/api/openapi/team/listMembers)

`GET /members`

Members, and open invitations for owners.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /members:
    get:
      operationId: listMembers
      summary: Members, and open invitations for owners
      description: Members, and open invitations for owners.
      tags:
        - Team
      parameters: []
      security:
        - secureSession: []
        - session: []
      responses:
        "200":
          description: Members, and open invitations for owners
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/MembersResponse"
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
                  response = client.team.list_members()
                  # TODO: Handle 'response' of type MembersResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type ListMembersErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.team.listMembers();
                // TODO: Handle 'response' of type MembersResponse
              } catch (err) {
                // TODO: Handle 'err' of type Team.ListMembersError, discriminated with 'err.payload.kind'
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
    MembersResponse:
      type: object
      properties:
        members:
          type: array
          items:
            $ref: "#/components/schemas/MemberDto"
        invitations:
          type: array
          items:
            $ref: "#/components/schemas/InvitationDto"
      required:
        - members
        - invitations
      additionalProperties: false
      description: "`GET /members`. Invitations are listed for owners only (empty
        otherwise)."
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
    MemberDto:
      type: object
      properties:
        user_id:
          type: string
          description: Id of the related user.
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
        joined_at:
          type: string
          description: When joined happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
        is_self:
          type: boolean
          description: True for the signed-in user.
          example: true
      required:
        - user_id
        - email
        - name
        - role
        - joined_at
        - is_self
      additionalProperties: false
      description: A member of the workspace.
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