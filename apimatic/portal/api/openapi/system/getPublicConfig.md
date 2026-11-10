# Feature flags and PayPal client id (/api/openapi/system/getPublicConfig)

`GET /config/public`

Feature flags and PayPal client id.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /config/public:
    get:
      operationId: getPublicConfig
      summary: Feature flags and PayPal client id
      description: Feature flags and PayPal client id.
      tags:
        - System
      parameters: []
      security: []
      responses:
        "200":
          description: Feature flags and PayPal client id
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/PublicConfig"
        "400":
          $ref: "#/components/responses/BadRequest"
        "429":
          $ref: "#/components/responses/TooManyRequests"
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.system.get_public_config()
                  # TODO: Handle 'response' of type PublicConfig
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # GetPublicConfigErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.system.getPublicConfig();
                // TODO: Handle 'response' of type PublicConfig
              } catch (err) {
                // TODO: Handle 'err' of type System.GetPublicConfigError, discriminated with 'err.payload.kind'
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
    PublicConfig:
      type: object
      properties:
        environment:
          type: string
          description: Deployment environment.
        paypal:
          type: object
          properties:
            enabled:
              type: boolean
              description: Whether the feature is turned on.
              example: true
            client_id:
              type:
                - string
                - "null"
              description: Id of the related client.
              example: 0f8fad5b-d9cb-469f-a165-70867728950e
            sdk_url:
              type: string
              example: https://example.com
            environment:
              type: string
              enum:
                - sandbox
                - live
              description: Deployment environment.
              example: sandbox
          required:
            - enabled
            - client_id
            - sdk_url
            - environment
          additionalProperties: false
        market_data:
          type: object
          properties:
            provider:
              type: string
              const: channel3
              description: Provider in use.
              example: channel3
            enabled:
              type: boolean
              description: Whether the feature is turned on.
              example: true
          required:
            - provider
            - enabled
          additionalProperties: false
        ai:
          type: object
          properties:
            enabled:
              type: boolean
              description: Whether the feature is turned on.
              example: true
            mode:
              $ref: "#/components/schemas/AiMode"
          required:
            - enabled
            - mode
          additionalProperties: false
        accounts:
          type: object
          properties:
            signup_enabled:
              type: boolean
              description: Anyone may create a workspace.
              example: true
            email_enabled:
              type: boolean
              description: "Outbound email is configured: invitations and reset links are
                emailed."
              example: true
          required:
            - signup_enabled
            - email_enabled
          additionalProperties: false
        sample_accounts_hint:
          type: boolean
          description: Show the shared sample-workspace accounts on the sign-in page.
          example: true
      required:
        - environment
        - paypal
        - market_data
        - ai
        - accounts
        - sample_accounts_hint
      additionalProperties: false
      description: Feature flags and integration status visible before sign-in.
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
    AiMode:
      type: string
      enum:
        - LLM
        - DETERMINISTIC_FALLBACK
      description: Whether the language model or the deterministic fallback
        interpreted a request.
  responses:
    BadRequest:
      description: The request failed validation (`BAD_REQUEST`, details list each field).
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