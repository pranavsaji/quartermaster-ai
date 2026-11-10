# PayPal webhook receiver (signature-verified) (/api/openapi/payments/receivePayPalWebhook)

`POST /webhooks/paypal`

PayPal webhook receiver (signature-verified).

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /webhooks/paypal:
    post:
      operationId: receivePayPalWebhook
      summary: PayPal webhook receiver (signature-verified)
      description: PayPal webhook receiver (signature-verified).
      tags:
        - Payments
      parameters: []
      security: []
      responses:
        "200":
          description: PayPal webhook receiver (signature-verified)
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/WebhookAckResponse"
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
                  response = client.payments_api.receive_pay_pal_webhook()
                  # TODO: Handle 'response' of type WebhookAckResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # ReceivePayPalWebhookErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response =
                  await client.paymentsApi.receivePayPalWebhook();
                // TODO: Handle 'response' of type WebhookAckResponse
              } catch (err) {
                // TODO: Handle 'err' of type PaymentsApi.ReceivePayPalWebhookError, discriminated with 'err.payload.kind'
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
    WebhookAckResponse:
      type: object
      properties:
        received:
          type: boolean
          description: "Always true: the notification was accepted. Always true."
          example: true
        outcome:
          type: string
          enum:
            - PROCESSED
            - IGNORED
            - DUPLICATE
          description: How the notification was handled.
          example: PROCESSED
      required:
        - received
        - outcome
      additionalProperties: false
      description: "`POST /webhooks/paypal`: acknowledgement PayPal receives for a
        verified event."
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