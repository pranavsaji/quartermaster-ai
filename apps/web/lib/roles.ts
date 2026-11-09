/**
 * Client-side role gating. This only decides what to *show*; the API enforces
 * every permission independently and answers 403 if the UI is bypassed.
 *
 *  OWNER   — everything, and the only role that can approve, reject, pay, refund
 *            or edit the spend mandate.
 *  MANAGER — operational work: requests, research, inventory, deliveries, invoices,
 *            audit-chain verification.
 *  VIEWER  — read-only.
 */
import type { Role, SessionUser } from "@qm/contracts";

export type Capability =
  | "approve"
  | "reject"
  | "pay"
  | "refund"
  | "editMandate"
  | "createRequest"
  | "runResearch"
  | "adjustInventory"
  | "runForecast"
  | "manageDeliveries"
  | "analyzeInvoices"
  /** Re-verify the audit hash chain (GET /security/audit/verify is MANAGER+). */
  | "verifyAudit";

const OWNER_ONLY: ReadonlySet<Capability> = new Set(["approve", "reject", "pay", "refund", "editMandate"]);

export function roleCan(role: Role | null | undefined, capability: Capability): boolean {
  if (!role) return false;
  if (role === "OWNER") return true;
  if (OWNER_ONLY.has(capability)) return false;
  return role === "MANAGER";
}

export function userCan(user: SessionUser | null | undefined, capability: Capability): boolean {
  return roleCan(user?.role, capability);
}

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  VIEWER: "Viewer",
};
