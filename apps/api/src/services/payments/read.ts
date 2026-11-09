import type { PaymentDto } from "@qm/contracts";
import type { AppContext } from "../../context";
import { toPaymentDto } from "../orders";
import { loadPayment } from "./shared";

export async function getPayment(ctx: AppContext, organizationId: string, id: string): Promise<PaymentDto> {
  return toPaymentDto(await loadPayment(ctx.db, organizationId, id));
}
