# Change a member's role (a workspace keeps at least one owner) (/api/openapi/team/updateMemberRole)

`PUT /members/{id}/role`

Change a member's role (a workspace keeps at least one owner). Requires the OWNER role.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /members/{id}/role:
    put:
      operationId: updateMemberRole
      summary: Change a member's role (a workspace keeps at least one owner)
      description: Change a member's role (a workspace keeps at least one owner).
        Requires the OWNER role.
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
          description: Change a member's role (a workspace keeps at least one owner)
          content:
            application/json:
              schema:
                type: object
                properties:
                  member:
                    $ref: "#/components/schemas/MemberDto"
                required:
                  - member
        "400":
          $ref: "#/components/responses/BadRequest"
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
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/UpdateMemberRoleRequest"
            example:
              role: VIEWER
        description: A member's new role.
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.team.update_member_role(
                      UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
                      XRequestedWith.QUARTERMASTER,
                      UpdateMemberRoleRequest(role=Role1.VIEWER),
                  )
                  # TODO: Handle 'response' of type MembersRoleResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # UpdateMemberRoleErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.team.updateMemberRole({
                  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
                  xRequestedWith: XRequestedWith.Quartermaster,
                  body: { role: Role1.Viewer },
                });
                // TODO: Handle 'response' of type MembersRoleResponse
              } catch (err) {
                // TODO: Handle 'err' of type Team.UpdateMemberRoleError, discriminated with 'err.payload.kind'
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
    UpdateMemberRoleRequest:
      type: object
      properties:
        role:
          type: string
          enum:
            - OWNER
            - MANAGER
            - VIEWER
          description: Workspace role.
          example: OWNER
      required:
        - role
      description: A member's new role.
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