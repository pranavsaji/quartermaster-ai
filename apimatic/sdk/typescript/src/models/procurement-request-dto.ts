import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { agentStepDtoSchema, type AgentStepDto } from "./agent-step-dto.js";
import { candidateDtoSchema, type CandidateDto } from "./candidate-dto.js";
import { forecastRunDtoSchema, type ForecastRunDto } from "./forecast-run-dto.js";
import { interpretedIntentDtoSchema, type InterpretedIntentDto } from "./interpreted-intent-dto.js";
import { marketReferenceDtoSchema, type MarketReferenceDto } from "./market-reference-dto.js";
import { purchaseOrderDtoSchema, type PurchaseOrderDto } from "./purchase-order-dto.js";
import { recommendationDtoSchema, type RecommendationDto } from "./recommendation-dto.js";
import { requestStatusSchema, type RequestStatus } from "./request-status.js";
import { securityFindingDtoSchema, type SecurityFindingDto } from "./security-finding-dto.js";

/** A procurement request with forecast, market evidence, candidates, proposals and decisions. */
export type ProcurementRequestDto = {
  /** Unique identifier (UUID). */
  id: string;
  /** Procurement request lifecycle. */
  status: RequestStatus;
  /** The natural-language instruction from the restaurant. */
  instruction: string;
  /** ISO 4217 currency code. */
  currency: string;
  /** Budget limit, in minor units (cents). */
  budgetLimitMinor: number | null;
  /** Date the goods are needed by (YYYY-MM-DD). */
  requiredBy: string | null;
  allowAlternatives: boolean;
  intent: InterpretedIntentDto | null;
  forecast: ForecastRunDto | null;
  market: MarketReferenceDto[];
  candidates: CandidateDto[];
  proposals: PurchaseOrderDto[];
  /** Id of the related active proposal. */
  activeProposalId: string | null;
  recommendation: RecommendationDto | null;
  securityFindings: SecurityFindingDto[];
  agentSteps: AgentStepDto[];
  createdBy: string;
  /** When created happened (ISO 8601, UTC). */
  createdAt: string;
  /** When updated happened (ISO 8601, UTC). */
  updatedAt: string;
};

export const procurementRequestDtoSchema: Schema<ProcurementRequestDto> = s.object<ProcurementRequestDto>({
  id: s.string(),
  status: requestStatusSchema,
  instruction: s.string(),
  currency: s.string(),
  budgetLimitMinor: s.nullable(s.int()),
  requiredBy: s.nullable(s.string()),
  allowAlternatives: s.boolean(),
  intent: s.nullable(s.lazy(() => interpretedIntentDtoSchema)),
  forecast: s.nullable(s.lazy(() => forecastRunDtoSchema)),
  market: s.array(s.lazy(() => marketReferenceDtoSchema)),
  candidates: s.array(s.lazy(() => candidateDtoSchema)),
  proposals: s.array(s.lazy(() => purchaseOrderDtoSchema)),
  activeProposalId: s.nullable(s.string()),
  recommendation: s.nullable(s.lazy(() => recommendationDtoSchema)),
  securityFindings: s.array(s.lazy(() => securityFindingDtoSchema)),
  agentSteps: s.array(s.lazy(() => agentStepDtoSchema)),
  createdBy: s.string(),
  createdAt: s.string(),
  updatedAt: s.string(),
  _keysMap: {
    budgetLimitMinor: "budget_limit_minor",
    requiredBy: "required_by",
    allowAlternatives: "allow_alternatives",
    activeProposalId: "active_proposal_id",
    securityFindings: "security_findings",
    agentSteps: "agent_steps",
    createdBy: "created_by",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
});
