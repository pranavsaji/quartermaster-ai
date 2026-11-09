import { and, eq } from "drizzle-orm";
import type { KeyObject } from "node:crypto";
import type { CertificateVerificationDto, IntentCertificatePayload } from "@qm/contracts";
import { intentCertificates, signingKeys, type Database, type DbOrTx } from "@qm/database";
import {
  computeCartHash,
  publicKeyFromPem,
  verifyCertificate,
  type SignedCertificate,
  type SigningKey,
  type VerificationResult,
} from "@qm/trustrail";
import { notFound } from "../errors";
import { cartFromRows, loadOrder, toCertificateDto } from "./orders";

/** Registers the active signing key's public half so historical certificates stay verifiable after rotation. */
export async function registerSigningKey(db: Database, key: SigningKey): Promise<void> {
  await db.insert(signingKeys).values({ keyId: key.key_id, publicKeyPem: key.public_key_pem }).onConflictDoNothing();
  const [row] = await db.select().from(signingKeys).where(eq(signingKeys.keyId, key.key_id));
  if (row && row.publicKeyPem.trim() !== key.public_key_pem.trim()) {
    throw new Error(`Signing key id ${key.key_id} is already registered with a different public key`);
  }
}

const keyCache = new Map<string, KeyObject>();

export async function publicKeyResolver(db: DbOrTx): Promise<(keyId: string) => KeyObject | null> {
  const rows = await db.select().from(signingKeys);
  for (const r of rows) if (!keyCache.has(r.keyId)) keyCache.set(r.keyId, publicKeyFromPem(r.publicKeyPem));
  return (keyId) => keyCache.get(keyId) ?? null;
}

export type CertificateRow = typeof intentCertificates.$inferSelect;

export function toSigned(c: CertificateRow): SignedCertificate {
  return { payload: c.payload as unknown as IntentCertificatePayload, signature: c.signature, key_id: c.keyId, algorithm: "Ed25519" };
}

/** Full verification against the current persisted cart. */
export async function verifyStoredCertificate(
  db: DbOrTx,
  organizationId: string,
  cert: CertificateRow,
  now: Date,
  opts: { allowConsumed?: boolean } = {},
): Promise<VerificationResult> {
  const { po, items } = await loadOrder(db, organizationId, cert.purchaseOrderId);
  const resolve = await publicKeyResolver(db);
  const cart = cartFromRows(po, items);
  return verifyCertificate(toSigned(cert), {
    current_cart_hash: computeCartHash(cart),
    current_total_minor: po.totalMinor,
    current_currency: po.currency,
    stored_status: cert.status,
    revoked_reason: cert.revokedReason,
    resolve_public_key: resolve,
    expected: { intent_id: cert.id, organization_id: organizationId, purchase_order_id: po.id, supplier_id: po.supplierId },
    now,
    allow_consumed: opts.allowConsumed,
  });
}

export async function loadCertificate(db: DbOrTx, organizationId: string, intentId: string, lock = false): Promise<CertificateRow> {
  const q = db
    .select()
    .from(intentCertificates)
    .where(and(eq(intentCertificates.id, intentId), eq(intentCertificates.organizationId, organizationId)));
  const [row] = lock ? await q.for("update") : await q;
  if (!row) throw notFound("Intent certificate");
  return row;
}

export async function verificationDto(
  db: DbOrTx,
  organizationId: string,
  intentId: string,
  now: Date,
): Promise<CertificateVerificationDto> {
  const cert = await loadCertificate(db, organizationId, intentId);
  const v = await verifyStoredCertificate(db, organizationId, cert, now, { allowConsumed: true });
  return {
    intent_id: cert.id,
    status: cert.status === "CONSUMED" && v.valid ? "CONSUMED" : v.status,
    valid: v.valid,
    checks: v.checks,
    certificate: toCertificateDto(cert),
    verified_at: now.toISOString(),
  };
}
