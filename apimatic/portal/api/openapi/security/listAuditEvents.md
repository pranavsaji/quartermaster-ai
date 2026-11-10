# Hash-chained audit log (/api/openapi/security/listAuditEvents)

`GET /security/audit`

Hash-chained audit log.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /security/audit:
    get:
      operationId: listAuditEvents
      summary: Hash-chained audit log
      description: Hash-chained audit log.
      tags:
        - Security
      parameters: []
      security:
        - secureSession: []
        - session: []
      responses:
        "200":
          description: Hash-chained audit log
          content:
            application/json:
              schema:
                type: object
                properties:
                  items:
                    type: array
                    items:
                      $ref: "#/components/schemas/AuditEventDto"
                  next_cursor:
                    type:
                      - string
                      - "null"
                    description: Pass as `cursor` for the next page; null on the last page.
                required:
                  - items
                  - next_cursor
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
                  response = client.security_api.list_audit_events()
                  # TODO: Handle 'response' of type SecurityAuditResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # ListAuditEventsErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response =
                  await client.securityApi.listAuditEvents();
                // TODO: Handle 'response' of type SecurityAuditResponse
              } catch (err) {
                // TODO: Handle 'err' of type SecurityApi.ListAuditEventsError, discriminated with 'err.payload.kind'
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
    AuditEventDto:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        sequence:
          type: integer
          description: Position in the workspace's audit chain.
          example: 1
        action:
          type: string
        actor_type:
          type: string
          enum:
            - USER
            - SYSTEM
            - AGENT
            - PAYPAL
          example: USER
        actor_id:
          type:
            - string
            - "null"
          description: Id of the related actor.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        entity_type:
          type: string
        entity_id:
          type:
            - string
            - "null"
          description: Id of the related entity.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        data:
          type: object
          additionalProperties: true
        hash:
          type: string
          description: SHA-256 hash of this audit event.
        prev_hash:
          type:
            - string
            - "null"
          description: Hash of the previous audit event (null for the first).
        correlation_id:
          type:
            - string
            - "null"
          description: Request correlation id; quote it to support to find the server logs.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        created_at:
          type: string
          description: When created happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
      required:
        - id
        - sequence
        - action
        - actor_type
        - actor_id
        - entity_type
        - entity_id
        - data
        - hash
        - prev_hash
        - correlation_id
        - created_at
      additionalProperties: false
      description: A tamper-evident audit log entry; each hash covers the previous one.
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