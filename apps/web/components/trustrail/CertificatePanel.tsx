"use client";

import type { CertificateVerificationDto, IntentCertificateDto } from "@qm/contracts";
import { useState } from "react";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { CopyValue } from "@/components/ui/CopyValue";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Icons } from "@/components/shell/icons";
import { api } from "@/lib/api";
import { countdown, dateTime, humanize, money } from "@/lib/format";
import { useAction, useNow } from "@/lib/hooks";
import { CERTIFICATE_STATUS_TONES, VERIFICATION_TONES } from "@/lib/labels";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
      <dt className="w-32 shrink-0 text-xs text-ink-3">{label}</dt>
      <dd className="min-w-0 text-sm text-ink">{children}</dd>
    </div>
  );
}

/**
 * The Ed25519-signed Intent Certificate minted on approval, with a live expiry
 * countdown and an on-demand server-side verification of every check.
 */
export function CertificatePanel({ certificate }: { certificate: IntentCertificateDto }) {
  // Only an active certificate shows a ticking countdown.
  const now = useNow(1000, certificate.status === "ACTIVE");
  const remaining = countdown(certificate.expires_at, now);
  const [verification, setVerification] = useState<CertificateVerificationDto | null>(null);
  const verify = useAction(async () => {
    const result = await api.intents.verify(certificate.id);
    setVerification(result);
  });
  const p = certificate.payload;

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Icons.approvals className="size-4 text-accent" />
        <p className="text-sm font-semibold text-ink">Intent Certificate</p>
        <StatusBadge status={certificate.status} tones={CERTIFICATE_STATUS_TONES} kind="Certificate" />
        <span
          className={cn(
            "tnum ml-auto rounded-md px-2 py-0.5 font-mono text-xs",
            remaining ? "bg-canvas text-ink-2" : "bg-block-soft text-block",
          )}
          aria-live="off"
          title={`Expires ${dateTime(certificate.expires_at)}`}
        >
          {certificate.status === "ACTIVE"
            ? remaining
              ? `expires in ${remaining}`
              : "expired"
            : `expires ${dateTime(certificate.expires_at)}`}
        </span>
      </div>

      <dl className="mt-3 space-y-1.5">
        <Row label="Intent id">
          <CopyValue value={certificate.id} label="intent id" head={10} tail={6} />
        </Row>
        <Row label="Approved amount">
          <span className="tnum font-medium">{money(p.approved_amount_minor, p.currency)}</span>
        </Row>
        <Row label="Cart hash">
          <CopyValue value={p.cart_hash} label="cart hash" />
        </Row>
        <Row label="Signing key">
          <code className="font-mono text-xs text-ink-2">{certificate.key_id}</code>
          <span className="ml-2 text-xs text-ink-3">{certificate.algorithm}</span>
        </Row>
        <Row label="Signature">
          <CopyValue value={certificate.signature} label="signature" head={16} tail={8} />
        </Row>
        <Row label="Mandate">
          <span className="text-ink-2">version {p.mandate_version}</span>
        </Row>
        <Row label="Issued">
          <span className="tnum text-ink-2">{dateTime(certificate.issued_at)}</span>
        </Row>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => void verify.run()} loading={verify.pending}>
          Verify
        </Button>
        {verification ? (
          <StatusBadge status={verification.status} tones={VERIFICATION_TONES} kind="Verification" />
        ) : (
          <span className="text-xs text-ink-3">Re-checks signature, cart hash, mandate version, expiry and use.</span>
        )}
      </div>

      <ErrorNotice error={verify.error} className="mt-3" />

      {verification ? (
        <div className="mt-3 rounded-lg border border-line bg-canvas/60 p-3" role="status">
          <p className={cn("text-sm font-medium", verification.valid ? "text-allow" : "text-block")}>
            {verification.valid ? "Certificate is valid." : `Certificate failed verification: ${humanize(verification.status)}.`}
          </p>
          <ul className="mt-2 space-y-1">
            {verification.checks.map((c) => (
              <li key={c.code} className="flex gap-2 text-xs">
                {c.passed ? (
                  <Icons.check className="mt-0.5 size-3.5 text-allow" strokeWidth={2.4} />
                ) : (
                  <Icons.x className="mt-0.5 size-3.5 text-block" strokeWidth={2.4} />
                )}
                <span>
                  <span className="sr-only">{c.passed ? "Passed: " : "Failed: "}</span>
                  <span className="font-medium text-ink-2">{humanize(c.code)}</span>
                  <span className="text-ink-3"> — {c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-2xs text-ink-4">Verified {dateTime(verification.verified_at)}</p>
        </div>
      ) : null}
    </div>
  );
}
