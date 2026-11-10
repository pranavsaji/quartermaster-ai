/**
 * Client-side role gating. This only decides what to *show*; the API enforces
 * every permission independently and answers 403 if the UI is bypassed.
 *
 *  OWNER   — everything, and the only role that can approve, reject, pay, refund,
 *            edit the spend mandate or manage the team (invitations, roles, reset links).
 *  MANAGER — operational work: requests, research, inventory, suppliers and their catalogs,
 *            deliveries, invoices, audit-chain verification.
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
  /** Add stock items and edit their details (POST/PUT /inventory). */
  | "editInventory"
  /** Add and edit suppliers and their catalogs. Approving a supplier is part of the mandate (owner). */
  | "manageSuppliers"
  /** Invite people, change roles, remove members, issue reset links. */
  | "manageTeam"
  | "runForecast"
  | "manageDeliveries"
  | "analyzeInvoices"
  /** Re-verify the audit hash chain (GET /security/audit/verify is MANAGER+). */
  | "verifyAudit";

const OWNER_ONLY: ReadonlySet<Capability> = new Set(["approve", "reject", "pay", "refund", "editMandate", "manageTeam"]);

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
