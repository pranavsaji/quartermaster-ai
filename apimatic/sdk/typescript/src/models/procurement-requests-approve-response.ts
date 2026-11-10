import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { intentCertificateDtoSchema, type IntentCertificateDto } from "./intent-certificate-dto.js";
import { purchaseOrderDtoSchema, type PurchaseOrderDto } from "./purchase-order-dto.js";

export type ProcurementRequestsApproveResponse = {
  /** A proposed or committed purchase order (immutable once proposed). */
  purchaseOrder: PurchaseOrderDto;
  /** The owner's signed approval of one exact cart (Ed25519). */
  certificate: IntentCertificateDto;
};

export const procurementRequestsApproveResponseSchema: Schema<ProcurementRequestsApproveResponse> =
  s.object<ProcurementRequestsApproveResponse>({
    purchaseOrder: purchaseOrderDtoSchema,
    certificate: intentCertificateDtoSchema,
    _keysMap: {
      purchaseOrder: "purchase_order",
    },
  });
