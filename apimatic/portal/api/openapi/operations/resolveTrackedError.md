# Resolve an error group; it reopens and alerts if it recurs (/api/openapi/operations/resolveTrackedError)

`POST /ops/errors/{id}/resolve`

Resolve an error group; it reopens and alerts if it recurs.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /ops/errors/{id}/resolve:
    post:
      operationId: resolveTrackedError
      summary: Resolve an error group; it reopens and alerts if it recurs
      description: Resolve an error group; it reopens and alerts if it recurs.
      tags:
        - Operations
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
      responses:
        "200":
          description: Resolve an error group; it reopens and alerts if it recurs
          content:
            application/json:
              schema:
                type: object
                properties:
                  error:
                    $ref: "#/components/schemas/SystemErrorDto"
                required:
                  - error
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
                  response = client.operations.resolve_tracked_error(
                      UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
                      XRequestedWith.QUARTERMASTER,
                  )
                  # TODO: Handle 'response' of type
                  # OpsErrorsResolveResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type ResolveTrackedErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response =
                  await client.operations.resolveTrackedError({
                    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
                    xRequestedWith: XRequestedWith.Quartermaster,
                  });
                // TODO: Handle 'response' of type OpsErrorsResolveResponse
              } catch (err) {
                // TODO: Handle 'err' of type Operations.ResolveTrackedErrorError, discriminated with 'err.payload.kind'
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