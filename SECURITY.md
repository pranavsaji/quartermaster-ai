# Security policy

Quartermaster moves money on a restaurant's behalf, so security reports get priority over
feature work.

## Reporting a vulnerability

Please **do not open a public issue**. Report privately through GitHub's
"Report a vulnerability" button on this repository (Security → Advisories), or contact a
maintainer listed in the repository settings. Include:

- what an attacker can do, and under which role (unauthenticated, viewer, manager, owner);
- the request(s) or input that reproduce it;
- the commit you tested.

We acknowledge reports within 3 business days and aim to ship a fix for high and critical
issues within 14 days. We will credit you in the advisory unless you prefer otherwise.

## Scope

In scope: the API (`apps/api`), web app (`apps/web`), TrustRail enforcement
(`packages/trustrail`), payment handling (`packages/payments`), and deployment configuration.

Particularly valuable:

- any way to capture, refund or approve money outside an owner's signed Intent Certificate;
- bypasses of the Spend Mandate, policy engine or capture guard;
- cross-organisation data access;
- prompt-injection paths that change what the agent proposes without a security finding;
- forging or replaying PayPal webhooks;
- tampering with the audit log without detection.

Out of scope: the PayPal sandbox itself, third-party services, denial of service by volume, and
findings that require a compromised server or database superuser.

## Supported versions

Only the `main` branch is supported. Fixes are not back-ported.

## How the system is defended

See [`docs/security-model.md`](docs/security-model.md) for the threat model and the controls that
enforce it (deterministic policy, signed certificates, capture guard, append-only hash-chained
audit log, webhook verification, idempotency).
