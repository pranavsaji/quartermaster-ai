# Tracked error groups (operators) (/api/openapi/operations/listTrackedErrors)

`GET /ops/errors`

Tracked error groups (operators).

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /ops/errors:
    get:
      operationId: listTrackedErrors
      summary: Tracked error groups (operators)
      description: Tracked error groups (operators).
      tags:
        - Operations
      parameters: []
      security:
        - secureSession: []
        - session: []
      responses:
        "200":
          description: Tracked error groups (operators)
          content:
            application/json:
              schema:
                type: object
                properties:
                  items:
                    type: array
                    items:
                      $ref: "#/components/schemas/SystemErrorDto"
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
                  response = client.operations.list_tracked_errors()
                  # TODO: Handle 'response' of type OpsErrorsResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # ListTrackedErrorsErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response =
                  await client.operations.listTrackedErrors();
                // TODO: Handle 'response' of type OpsErrorsResponse
              } catch (err) {
                // TODO: Handle 'err' of type Operations.ListTrackedErrorsError, discriminated with 'err.payload.kind'
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
    SystemErrorDto:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        fingerprint:
          type: string
          description: Grouping key for identical errors.
        source:
          type: string
          enum:
            - api
            - web
            - job
            - monitor
          description: Where the error came from.
          example: api
        level:
          type: string
          enum:
            - warning
            - error
            - fatal
          description: Severity level.
          example: warning
        code:
          type: string
          description: Stable machine-readable code.
        message:
          type: string
          description: Human-readable message (fixed per code).
        route:
          type:
            - string
            - "null"
          description: API route template or page path.
        occurrences:
          type: integer
          description: How many times this error occurred.
          example: 1
        first_seen_at:
          type: string
          description: When first seen happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
        last_seen_at:
          type: string
          description: When last seen happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
        last_correlation_id:
          type:
            - string
            - "null"
          description: Id of the related last correlation.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        last_alerted_at:
          type:
            - string
            - "null"
          description: When last alerted happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
        resolved_at:
          type:
            - string
            - "null"
          description: When resolved happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
      required:
        - id
        - fingerprint
        - source
        - level
        - code
        - message
        - route
        - occurrences
        - first_seen_at
        - last_seen_at
        - last_correlation_id
        - last_alerted_at
        - resolved_at
      additionalProperties: false
      description: A tracked error group (operators only).
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