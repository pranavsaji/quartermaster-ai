# Verify the audit hash chain (/api/openapi/security/verifyAuditChain)

`GET /security/audit/verify`

Verify the audit hash chain. Requires the MANAGER role.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /security/audit/verify:
    get:
      operationId: verifyAuditChain
      summary: Verify the audit hash chain
      description: Verify the audit hash chain. Requires the MANAGER role.
      tags:
        - Security
      parameters: []
      security:
        - secureSession: []
        - session: []
      x-required-role: MANAGER
      responses:
        "200":
          description: Verify the audit hash chain
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuditChainVerificationDto"
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
                  response = client.security_api.verify_audit_chain()
                  # TODO: Handle 'response' of type
                  # AuditChainVerificationDto
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # VerifyAuditChainErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response =
                  await client.securityApi.verifyAuditChain();
                // TODO: Handle 'response' of type AuditChainVerificationDto
              } catch (err) {
                // TODO: Handle 'err' of type SecurityApi.VerifyAuditChainError, discriminated with 'err.payload.kind'
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
    AuditChainVerificationDto:
      type: object
      properties:
        valid:
          type: boolean
          description: Whether verification passed.
          example: true
        events_checked:
          type: integer
          example: 1
        first_invalid_sequence:
          type:
            - number
            - "null"
          example: 1
      required:
        - valid
        - events_checked
        - first_invalid_sequence
      additionalProperties: false
      description: Result of re-verifying the hash-chained audit log.
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