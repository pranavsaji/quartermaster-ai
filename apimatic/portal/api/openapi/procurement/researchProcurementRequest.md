# Run forecasting, Channel3 research, comparison, planning and TrustRail evaluation (/api/openapi/procurement/researchProcurementRequest)

`POST /procurement/requests/{id}/research`

Run forecasting, Channel3 research, comparison, planning and TrustRail evaluation. Requires the MANAGER role.

```yaml
openapi: 3.2.0
servers:
  - url: https://quartermaster-web-o0df.onrender.com/api/v1
    description: Hosted demo (PayPal sandbox)
  - url: http://localhost:4000/api/v1
    description: Local development
paths:
  /procurement/requests/{id}/research:
    post:
      operationId: researchProcurementRequest
      summary: Run forecasting, Channel3 research, comparison, planning and TrustRail
        evaluation
      description: Run forecasting, Channel3 research, comparison, planning and
        TrustRail evaluation. Requires the MANAGER role.
      tags:
        - Procurement
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
      x-required-role: MANAGER
      responses:
        "200":
          description: Run forecasting, Channel3 research, comparison, planning and
            TrustRail evaluation
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ProcurementRequestDto"
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
                  response = client.procurement.research_procurement_request(
                      UUID("0f8fad5b-d9cb-469f-a165-70867728950e"),
                      XRequestedWith.QUARTERMASTER,
                  )
                  # TODO: Handle 'response' of type ProcurementRequestDto
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # ResearchProcurementRequestErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response =
                  await client.procurement.researchProcurementRequest({
                    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
                    xRequestedWith: XRequestedWith.Quartermaster,
                  });
                // TODO: Handle 'response' of type ProcurementRequestDto
              } catch (err) {
                // TODO: Handle 'err' of type Procurement.ResearchProcurementRequestError, discriminated with 'err.payload.kind'
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
    ProcurementRequestDto:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        status:
          $ref: "#/components/schemas/RequestStatus"
        instruction:
          type: string
          description: The natural-language instruction from the restaurant.
        currency:
          type: string
          description: ISO 4217 currency code.
          example: USD
        budget_limit_minor:
          type:
            - integer
            - "null"
          description: Budget limit, in minor units (cents).
          example: 17320
        required_by:
          type:
            - string
            - "null"
          description: Date the goods are needed by (YYYY-MM-DD).
          example: 2026-11-12
        allow_alternatives:
          type: boolean
          example: true
        intent:
          oneOf:
            - $ref: "#/components/schemas/InterpretedIntentDto"
            - type: "null"
        forecast:
          oneOf:
            - $ref: "#/components/schemas/ForecastRunDto"
            - type: "null"
        market:
          type: array
          items:
            $ref: "#/components/schemas/MarketReferenceDto"
        candidates:
          type: array
          items:
            $ref: "#/components/schemas/CandidateDto"
        proposals:
          type: array
          items:
            $ref: "#/components/schemas/PurchaseOrderDto"
        active_proposal_id:
          type:
            - string
            - "null"
          description: Id of the related active proposal.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        recommendation:
          oneOf:
            - $ref: "#/components/schemas/RecommendationDto"
            - type: "null"
        security_findings:
          type: array
          items:
            $ref: "#/components/schemas/SecurityFindingDto"
        agent_steps:
          type: array
          items:
            $ref: "#/components/schemas/AgentStepDto"
        created_by:
          type: string
        created_at:
          type: string
          description: When created happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
        updated_at:
          type: string
          description: When updated happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
      required:
        - id
        - status
        - instruction
        - currency
        - budget_limit_minor
        - required_by
        - allow_alternatives
        - intent
        - forecast
        - market
        - candidates
        - proposals
        - active_proposal_id
        - recommendation
        - security_findings
        - agent_steps
        - created_by
        - created_at
        - updated_at
      additionalProperties: false
      description: A procurement request with forecast, market evidence, candidates,
        proposals and decisions.
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
    RequestStatus:
      type: string
      enum:
        - DRAFT
        - RESEARCHING
        - READY_FOR_REVIEW
        - BLOCKED
        - APPROVED
        - PAYMENT_PENDING
        - PAID
        - FULFILLED
        - REJECTED
        - CANCELLED
        - FAILED
      description: Procurement request lifecycle.
    InterpretedIntentDto:
      type: object
      properties:
        inventory_item_ids:
          type: array
          items:
            type: string
          description: Ids of the related inventory items.
        demand_multiplier:
          type: number
          description: Demand relative to normal (1 = normal, 1.25 = 25% busier).
          example: 1.25
        budget_limit_minor:
          type:
            - integer
            - "null"
          description: Budget limit, in minor units (cents).
          example: 17320
        required_by:
          type:
            - string
            - "null"
          description: Date the goods are needed by (YYYY-MM-DD).
          example: 2026-11-12
        notes:
          type: string
        unsupported_requests:
          type: array
          items:
            type: string
        ai_mode:
          $ref: "#/components/schemas/AiMode"
      required:
        - inventory_item_ids
        - demand_multiplier
        - budget_limit_minor
        - required_by
        - notes
        - unsupported_requests
        - ai_mode
      additionalProperties: false
      description: "How the request was interpreted: items, demand multiplier, budget
        and date."
    ForecastRunDto:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        demand_multiplier:
          type: number
          description: Demand relative to normal (1 = normal, 1.25 = 25% busier).
          example: 1.25
        created_at:
          type: string
          description: When created happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
        method:
          type: string
          const: REORDER_POINT_V1
          example: REORDER_POINT_V1
        lines:
          type: array
          items:
            $ref: "#/components/schemas/ForecastLineDto"
          description: Line items.
      required:
        - id
        - demand_multiplier
        - created_at
        - method
        - lines
      additionalProperties: false
      description: A stored forecast run with its lines.
    MarketReferenceDto:
      type: object
      properties:
        inventory_item_id:
          type: string
          description: Id of the related inventory item.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        reference_unit_price_minor:
          type:
            - number
            - "null"
          description: Market reference price per unit, in minor units; may be fractional
            (null when no comparable quote).
          example: 1
        sample_size:
          type: number
          example: 1
        observed_at:
          type:
            - string
            - "null"
          description: When observed happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
        status:
          type: string
          enum:
            - AVAILABLE
            - UNAVAILABLE
            - STALE
            - DISABLED
            - ERROR
          description: Current status.
          example: AVAILABLE
        quotes:
          type: array
          items:
            $ref: "#/components/schemas/MarketQuoteDto"
      required:
        - inventory_item_id
        - reference_unit_price_minor
        - sample_size
        - observed_at
        - status
        - quotes
      additionalProperties: false
      description: The market reference price for an item.
    CandidateDto:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        inventory_item_id:
          type: string
          description: Id of the related inventory item.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        supplier_id:
          type: string
          description: Id of the related supplier.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        supplier_name:
          type: string
          example: Harbor Restaurant Supply
        supplier_approved:
          type: boolean
          example: true
        checkout_eligible:
          type: boolean
          description: Whether orders from this supplier can be paid through PayPal
            checkout.
          example: true
        catalog_item_id:
          type: string
          description: Id of the related catalog item.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        sku:
          type: string
          description: Stock-keeping unit code.
          example: PKG-TAKEOUT-32
        title:
          type: string
          description: Short title.
        pack_quantity:
          type: integer
          description: Units in one pack.
          example: 1
        packs:
          type: number
          example: 1
        units:
          type: number
          example: 1
        item_subtotal_minor:
          type: integer
          description: Item subtotal, in minor units (cents).
          example: 17320
        shipping_minor:
          type: integer
          description: Shipping, in minor units (cents).
          example: 17320
        tax_minor:
          type: integer
          description: Tax, in minor units (cents).
          example: 17320
        fees_minor:
          type: integer
          description: Fees, in minor units (cents).
          example: 17320
        delivered_total_minor:
          type: integer
          description: Delivered total, in minor units (cents).
          example: 17320
        delivered_unit_cost_minor:
          type: number
          description: Delivered cost per unit (price, shipping, tax and fees over units),
            in minor units; may be fractional.
          example: 1
        lead_time_days:
          type: integer
          description: Days from order to delivery.
          example: 3
        rank:
          type:
            - number
            - "null"
          example: 1
        eligible:
          type: boolean
          example: true
        ineligible_reasons:
          type: array
          items:
            type: string
        quarantined:
          type: boolean
          description: "Flagged by prompt-injection screening: withheld from the agent and
            blocked by TrustRail."
          example: true
        data_source:
          $ref: "#/components/schemas/DataSource"
      required:
        - id
        - inventory_item_id
        - supplier_id
        - supplier_name
        - supplier_approved
        - checkout_eligible
        - catalog_item_id
        - sku
        - title
        - pack_quantity
        - packs
        - units
        - item_subtotal_minor
        - shipping_minor
        - tax_minor
        - fees_minor
        - delivered_total_minor
        - delivered_unit_cost_minor
        - lead_time_days
        - rank
        - eligible
        - ineligible_reasons
        - quarantined
        - data_source
      additionalProperties: false
      description: A supplier offer the agent considered, with its policy verdict and
        delivered cost.
    PurchaseOrderDto:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        number:
          type: string
        request_id:
          type:
            - string
            - "null"
          description: Id of the related request.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        supplier_id:
          type: string
          description: Id of the related supplier.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        supplier_name:
          type: string
          example: Harbor Restaurant Supply
        status:
          $ref: "#/components/schemas/PurchaseOrderStatus"
        currency:
          type: string
          description: ISO 4217 currency code.
          example: USD
        subtotal_minor:
          type: integer
          description: Subtotal, in minor units (cents).
          example: 17320
        shipping_minor:
          type: integer
          description: Shipping, in minor units (cents).
          example: 17320
        tax_minor:
          type: integer
          description: Tax, in minor units (cents).
          example: 17320
        fees_minor:
          type: integer
          description: Fees, in minor units (cents).
          example: 17320
        total_minor:
          type: integer
          description: Total, in minor units (cents).
          example: 17320
        cart_hash:
          type: string
          description: SHA-256 of the canonical cart, bound into the Intent Certificate.
          example: sha256:9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f
        items:
          type: array
          items:
            $ref: "#/components/schemas/PurchaseOrderItemDto"
          description: The items in this response.
        policy_decision:
          oneOf:
            - $ref: "#/components/schemas/PolicyDecisionDto"
            - type: "null"
        certificate:
          description: Intent Certificate.
          oneOf:
            - $ref: "#/components/schemas/IntentCertificateDto"
            - type: "null"
        payment:
          description: Payment attempt.
          oneOf:
            - $ref: "#/components/schemas/PaymentDto"
            - type: "null"
        delivery:
          description: Delivery.
          oneOf:
            - $ref: "#/components/schemas/DeliveryDto"
            - type: "null"
        created_at:
          type: string
          description: When created happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
      required:
        - id
        - number
        - request_id
        - supplier_id
        - supplier_name
        - status
        - currency
        - subtotal_minor
        - shipping_minor
        - tax_minor
        - fees_minor
        - total_minor
        - cart_hash
        - items
        - policy_decision
        - certificate
        - payment
        - delivery
        - created_at
      additionalProperties: false
      description: A proposed or committed purchase order (immutable once proposed).
    RecommendationDto:
      type: object
      properties:
        summary:
          type: string
        rationale:
          type: array
          items:
            type: string
        ai_mode:
          $ref: "#/components/schemas/AiMode"
      required:
        - summary
        - rationale
        - ai_mode
      additionalProperties: false
      description: The agent's recommended proposal and its explanation.
    SecurityFindingDto:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        type:
          $ref: "#/components/schemas/FindingType"
        severity:
          $ref: "#/components/schemas/Severity"
        title:
          type: string
          description: Short title.
        description:
          type: string
          description: Free-text description.
        source_kind:
          type: string
        source_id:
          type:
            - string
            - "null"
          description: Id of the related source.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        evidence:
          type: object
          additionalProperties: true
        related_purchase_order_id:
          type:
            - string
            - "null"
          description: Id of the related related purchase order.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        related_request_id:
          type:
            - string
            - "null"
          description: Id of the related related request.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        created_at:
          type: string
          description: When created happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
      required:
        - id
        - type
        - severity
        - title
        - description
        - source_kind
        - source_id
        - evidence
        - related_purchase_order_id
        - related_request_id
        - created_at
      additionalProperties: false
      description: A security finding (prompt injection, unauthorised fee, duplicate,
        signature failure...).
    AgentStepDto:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        tool:
          type: string
        status:
          type: string
          enum:
            - SUCCEEDED
            - FAILED
            - SKIPPED
          description: Current status.
          example: SUCCEEDED
        duration_ms:
          type: number
          description: Duration, in milliseconds.
          example: 1
        summary:
          type: string
        started_at:
          type: string
          description: When started happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
      required:
        - id
        - tool
        - status
        - duration_ms
        - summary
        - started_at
      additionalProperties: false
      description: One step of the procurement agent's research run (tool, input
        summary, outcome).
    FindingType:
      type: string
      enum:
        - PROMPT_INJECTION
        - UNAUTHORIZED_FEE
        - POLICY_VIOLATION
        - CART_TAMPERING
        - DUPLICATE_INVOICE
        - INVOICE_DISCREPANCY
        - WEBHOOK_SIGNATURE_INVALID
        - CERTIFICATE_VERIFICATION_FAILED
        - PAYMENT_AMOUNT_MISMATCH
        - ACCESS_DENIED
        - PAYMENT_REVERSED
      description: Kind of security finding.
    Severity:
      type: string
      enum:
        - LOW
        - MEDIUM
        - HIGH
        - CRITICAL
      description: Finding severity.
    AiMode:
      type: string
      enum:
        - LLM
        - DETERMINISTIC_FALLBACK
      description: Whether the language model or the deterministic fallback
        interpreted a request.
    PurchaseOrderStatus:
      type: string
      enum:
        - PROPOSED
        - BLOCKED
        - SUPERSEDED
        - APPROVED
        - PAYMENT_PENDING
        - PAID
        - FULFILLED
        - REJECTED
        - CANCELLED
        - EXPIRED
      description: Purchase order lifecycle.
    PurchaseOrderItemDto:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        kind:
          $ref: "#/components/schemas/LineKind"
        sku:
          type:
            - string
            - "null"
          description: Stock-keeping unit code.
          example: PKG-TAKEOUT-32
        description:
          type: string
          description: Free-text description.
        category:
          description: Product category.
          oneOf:
            - $ref: "#/components/schemas/ProductCategory"
            - type: "null"
        quantity:
          type: integer
          example: 1
        unit_price_minor:
          type: integer
          description: Unit price, in minor units (cents).
          example: 17320
        line_total_minor:
          type: integer
          description: Line total, in minor units (cents).
          example: 17320
        inventory_item_id:
          type:
            - string
            - "null"
          description: Id of the related inventory item.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        pack_quantity:
          type:
            - integer
            - "null"
          description: Units in one pack.
          example: 1
      required:
        - id
        - kind
        - sku
        - description
        - category
        - quantity
        - unit_price_minor
        - line_total_minor
        - inventory_item_id
        - pack_quantity
      additionalProperties: false
      description: A purchase order line.
    PolicyDecisionDto:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        purchase_order_id:
          type: string
          description: Id of the related purchase order.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        decision:
          $ref: "#/components/schemas/PolicyDecisionKind"
        violations:
          type: array
          items:
            $ref: "#/components/schemas/ViolationDto"
        checks:
          type: array
          items:
            $ref: "#/components/schemas/PolicyCheckDto"
        human_approval_required:
          type: boolean
          description: An owner must approve every purchase (always true).
          example: true
        mandate_version:
          type: number
          example: 1
        policy_version:
          type: string
        input_digest:
          type: string
        evaluated_at:
          type: string
          description: When evaluated happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
      required:
        - id
        - purchase_order_id
        - decision
        - violations
        - checks
        - human_approval_required
        - mandate_version
        - policy_version
        - input_digest
        - evaluated_at
      additionalProperties: false
      description: A recorded TrustRail decision with its checks and violations.
    IntentCertificateDto:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        status:
          $ref: "#/components/schemas/CertificateStatus"
        payload:
          $ref: "#/components/schemas/IntentCertificatePayload"
        key_id:
          type: string
          description: Id of the related key.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        signature:
          type: string
        algorithm:
          type: string
          const: Ed25519
          example: Ed25519
        issued_at:
          type: string
          description: When issued happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
        expires_at:
          type: string
          description: When expires happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
      required:
        - id
        - status
        - payload
        - key_id
        - signature
        - algorithm
        - issued_at
        - expires_at
      additionalProperties: false
      description: The owner's signed approval of one exact cart (Ed25519).
    PaymentDto:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        intent_id:
          type: string
          description: Id of the related intent.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        purchase_order_id:
          type: string
          description: Id of the related purchase order.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        status:
          $ref: "#/components/schemas/PaymentStatus"
        paypal_order_id:
          type:
            - string
            - "null"
          description: PayPal Orders v2 order id.
          example: 5O190127TN364715T
        paypal_capture_id:
          type:
            - string
            - "null"
          description: PayPal capture id once payment completed.
          example: 3C679366HH908993F
        amount_minor:
          type: integer
          description: Amount, in minor units (cents).
          example: 17320
        currency:
          type: string
          description: ISO 4217 currency code.
          example: USD
        captured_amount_minor:
          type:
            - integer
            - "null"
          description: Captured amount, in minor units (cents).
          example: 17320
        refunded_amount_minor:
          type: integer
          description: Refunded amount, in minor units (cents).
          example: 17320
        failure_code:
          type:
            - string
            - "null"
        failure_message:
          type:
            - string
            - "null"
        created_at:
          type: string
          description: When created happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
        updated_at:
          type: string
          description: When updated happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
        completed_at:
          type:
            - string
            - "null"
          description: When completed happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
      required:
        - id
        - intent_id
        - purchase_order_id
        - status
        - paypal_order_id
        - paypal_capture_id
        - amount_minor
        - currency
        - captured_amount_minor
        - refunded_amount_minor
        - failure_code
        - failure_message
        - created_at
        - updated_at
        - completed_at
      additionalProperties: false
      description: A PayPal payment attempt for a purchase order.
    DeliveryDto:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        purchase_order_id:
          type: string
          description: Id of the related purchase order.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        supplier_id:
          type: string
          description: Id of the related supplier.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        status:
          $ref: "#/components/schemas/DeliveryStatus"
        expected_date:
          type: string
          description: Expected date (YYYY-MM-DD).
          example: 2026-11-12
        original_expected_date:
          type: string
          description: Original expected date (YYYY-MM-DD).
          example: 2026-11-12
        delivered_at:
          type:
            - string
            - "null"
          description: When delivered happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
        delay_reason:
          type:
            - string
            - "null"
        data_source:
          type: string
          const: SYNTHETIC
          description: Where this data came from.
          example: SYNTHETIC
      required:
        - id
        - purchase_order_id
        - supplier_id
        - status
        - expected_date
        - original_expected_date
        - delivered_at
        - delay_reason
        - data_source
      additionalProperties: false
      description: A delivery for a paid purchase order (synthetic in the sandbox).
    DeliveryStatus:
      type: string
      enum:
        - SCHEDULED
        - IN_TRANSIT
        - DELAYED
        - DELIVERED
        - CANCELLED
      description: Delivery progress.
    PaymentStatus:
      type: string
      enum:
        - CREATED
        - ORDER_CREATED
        - PAYER_APPROVED
        - CAPTURE_PENDING
        - COMPLETED
        - FAILED
        - VOIDED
        - REFUNDED
        - PARTIALLY_REFUNDED
      description: Payment attempt lifecycle.
    CertificateStatus:
      type: string
      enum:
        - ACTIVE
        - CONSUMED
        - REVOKED
        - EXPIRED
      description: Lifecycle of an Intent Certificate.
    IntentCertificatePayload:
      type: object
      properties:
        certificate_version:
          type: number
          const: 1
          example: 1
        intent_id:
          type: string
          description: Id of the related intent.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        organization_id:
          type: string
          description: Id of the related organization.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        buyer_id:
          type: string
          description: Id of the related buyer.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        purchase_order_id:
          type: string
          description: Id of the related purchase order.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        supplier_id:
          type: string
          description: Id of the related supplier.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        cart_hash:
          type: string
          description: SHA-256 of the canonical cart, bound into the Intent Certificate.
          example: sha256:9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f9f
        mandate_id:
          type: string
          description: Id of the related mandate.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        mandate_version:
          type: number
          example: 1
        policy_decision_id:
          type: string
          description: Id of the related policy decision.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        currency:
          type: string
          description: ISO 4217 currency code.
          example: USD
        approved_amount_minor:
          type: integer
          description: Approved amount, in minor units (cents).
          example: 17320
        approved_at:
          type: string
          description: When approved happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
        expires_at:
          type: string
          description: When expires happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
        nonce:
          type: string
        key_id:
          type: string
          description: Id of the related key.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
      required:
        - certificate_version
        - intent_id
        - organization_id
        - buyer_id
        - purchase_order_id
        - supplier_id
        - cart_hash
        - mandate_id
        - mandate_version
        - policy_decision_id
        - currency
        - approved_amount_minor
        - approved_at
        - expires_at
        - nonce
        - key_id
      additionalProperties: false
      description: The signed fields of an Intent Certificate.
    PolicyDecisionKind:
      type: string
      enum:
        - ALLOW
        - REVIEW_REQUIRED
        - BLOCK
      description: TrustRail's verdict on a cart.
    ViolationDto:
      type: object
      properties:
        code:
          $ref: "#/components/schemas/ViolationCode"
        severity:
          type: string
          enum:
            - BLOCK
            - REVIEW
          description: Severity.
          example: BLOCK
        message:
          type: string
          description: Human-readable message (fixed per code).
        evidence:
          type: object
          additionalProperties: true
      required:
        - code
        - severity
        - message
      additionalProperties: false
      description: A policy violation with its severity and explanation.
    PolicyCheckDto:
      type: object
      properties:
        code:
          type: string
          description: Stable machine-readable code.
        passed:
          type: boolean
          example: true
        detail:
          type: string
      required:
        - code
        - passed
        - detail
      additionalProperties: false
      description: One TrustRail policy check and its result.
    ViolationCode:
      type: string
      enum:
        - MANDATE_INACTIVE
        - EMPTY_CART
        - CURRENCY_MISMATCH
        - SUPPLIER_NOT_APPROVED
        - SUPPLIER_INACTIVE
        - CATEGORY_NOT_ALLOWED
        - UNAUTHORIZED_LINE_ITEM
        - PRICE_MISMATCH
        - CART_ARITHMETIC_INVALID
        - PER_ORDER_LIMIT_EXCEEDED
        - WEEKLY_BUDGET_EXCEEDED
        - REQUEST_BUDGET_EXCEEDED
        - MARKET_PRICE_PREMIUM_EXCEEDED
        - MARKET_REFERENCE_UNAVAILABLE
        - DUPLICATE_ORDER
        - SUBSCRIPTION_NOT_ALLOWED
        - QUARANTINED_SOURCE
        - QUANTITY_EXCEEDS_NEED
        - POLICY_INPUT_INVALID
      description: Machine-readable TrustRail policy violation.
    LineKind:
      type: string
      enum:
        - PRODUCT
        - SHIPPING
        - TAX
        - FEE
      description: Kind of cart or invoice line.
    ProductCategory:
      type: string
      enum:
        - food_packaging
        - cleaning_supplies
        - cooking_ingredients
        - beverages
        - kitchen_equipment
        - alcohol
        - gift_cards
        - services
      description: Product category used by the Spend Mandate's category rules.
    DataSource:
      type: string
      enum:
        - CHANNEL3_MARKET
        - SANDBOX_SUPPLIER
        - SYNTHETIC
        - USER_ENTERED
      description: Where a piece of commercial data came from (shown as a label in the UI).
    MarketQuoteDto:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier (UUID).
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        source:
          type: string
          const: CHANNEL3_MARKET
          description: Where the error came from.
          example: CHANNEL3_MARKET
        title:
          type: string
          description: Short title.
        merchant_domain:
          type: string
        url:
          type: string
          example: https://example.com
        price_minor:
          type: number
          description: Price, in minor units (cents).
          example: 1
        currency:
          type: string
          description: ISO 4217 currency code.
          example: USD
        pack_quantity:
          type:
            - number
            - "null"
          description: Units in one pack.
          example: 1
        normalized_unit_price_minor:
          type:
            - number
            - "null"
          description: Quote price per unit after pack-size normalisation, in minor units;
            may be fractional.
          example: 1
        comparable:
          type: boolean
          example: true
        observed_at:
          type: string
          description: When observed happened (ISO 8601, UTC).
          example: 2026-11-10T18:30:00.000Z
        availability:
          type: string
      required:
        - id
        - source
        - title
        - merchant_domain
        - url
        - price_minor
        - currency
        - pack_quantity
        - normalized_unit_price_minor
        - comparable
        - observed_at
        - availability
      additionalProperties: false
      description: A market price quote from Channel3, used as a reference only.
    ForecastLineDto:
      type: object
      properties:
        inventory_item_id:
          type: string
          description: Id of the related inventory item.
          example: 0f8fad5b-d9cb-469f-a165-70867728950e
        sku:
          type: string
          description: Stock-keeping unit code.
          example: PKG-TAKEOUT-32
        name:
          type: string
          description: Display name.
          example: Harbor Restaurant Supply
        unit:
          type: string
          description: Unit of measure (each, liter, case...).
        base_daily_usage:
          type: number
          example: 1
        demand_multiplier:
          type: number
          description: Demand relative to normal (1 = normal, 1.25 = 25% busier).
          example: 1.25
        forecast_daily_usage:
          type: number
          example: 1
        lead_time_days:
          type: integer
          description: Days from order to delivery.
          example: 3
        safety_stock:
          type: integer
          description: Units to keep on hand as a buffer.
          example: 1
        coverage_days:
          type: integer
          description: Days of usage an order should cover.
          example: 3
        on_hand:
          type: integer
          description: Units currently in stock.
          example: 1
        inbound_confirmed:
          type: integer
          example: 1
        committed:
          type: integer
          example: 1
        available:
          type: integer
          example: 1
        reorder_point:
          type: integer
          example: 1
        target_stock:
          type: number
          example: 1
        needs_reorder:
          type: boolean
          example: true
        suggested_quantity:
          type: number
          example: 1
        explanation:
          type: string
      required:
        - inventory_item_id
        - sku
        - name
        - unit
        - base_daily_usage
        - demand_multiplier
        - forecast_daily_usage
        - lead_time_days
        - safety_stock
        - coverage_days
        - on_hand
        - inbound_confirmed
        - committed
        - available
        - reorder_point
        - target_stock
        - needs_reorder
        - suggested_quantity
        - explanation
      additionalProperties: false
      description: Reorder recommendation for one stock item.
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