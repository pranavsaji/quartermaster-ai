# Report a browser error to error tracking (/api/openapi/system/reportClientError)

`POST /client-errors`

Report a browser error to error tracking.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /client-errors:
    post:
      operationId: reportClientError
      summary: Report a browser error to error tracking
      description: Report a browser error to error tracking.
      tags:
        - System
      parameters:
        - $ref: "#/components/parameters/Csrf"
      security: []
      responses:
        "202":
          description: Report a browser error to error tracking
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    const: recorded
                required:
                  - status
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
              $ref: "#/components/schemas/ClientErrorReport"
            example:
              message: "TypeError: x is undefined"
              path: /orders
              kind: render
        description: A browser error reported for error tracking.
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.system.report_client_error(
                      XRequestedWith.QUARTERMASTER,
                      ClientErrorReport(
                          message="TypeError: x is undefined",
                          path="/orders",
                          kind=Kind.RENDER,
                      ),
                  )
                  # TODO: Handle 'response' of type ClientErrorsResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type ReportClientErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.system.reportClientError({
                  xRequestedWith: XRequestedWith.Quartermaster,
                  body: {
                    message: "TypeError: x is undefined",
                    path: "/orders",
                    kind: Kind.Render,
                  },
                });
                // TODO: Handle 'response' of type ClientErrorsResponse
              } catch (err) {
                // TODO: Handle 'err' of type System.ReportClientErrorError, discriminated with 'err.payload.kind'
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
  schemas:
    ClientErrorReport:
      type: object
      properties:
        message:
          type: string
          maxLength: 500
          description: Human-readable message (fixed per code).
        digest:
          type: string
          maxLength: 64
          description: Next.js error digest.
        path:
          type: string
          maxLength: 300
          description: Page path.
        stack:
          type: string
          maxLength: 4000
          description: Trimmed stack trace.
        kind:
          type: string
          enum:
            - render
            - unhandled
            - rejection
          description: Kind of entry.
          example: render
      required:
        - message
        - path
        - kind
      description: A browser error reported for error tracking.
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
info:
  title: Quartermaster AI + TrustRail API
  version: 1.0.0
```