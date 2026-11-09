import { createPrivateKey, createPublicKey, generateKeyPairSync, type KeyObject } from "node:crypto";
import { sha256Hex } from "../canonical";

export interface SigningKey {
  key_id: string;
  private_key: KeyObject;
  public_key: KeyObject;
  public_key_pem: string;
}

/**
 * Key ids and key binding.
 *
 * The default key id is a fingerprint of the public key (`trk_` + 16 hex chars of the SHA-256
 * of its DER-encoded SubjectPublicKeyInfo), which binds the id to the key: a fingerprint-shaped
 * id is therefore *verified* everywhere — a key cannot be loaded under, and a certificate cannot
 * be verified with, a fingerprint-shaped id that is not that key's own fingerprint. Custom ids
 * that do not look like fingerprints (e.g. "dev_ephemeral_…", "prod-2026-q4") remain supported
 * for backward compatibility; their binding relies on the key registry (one public key per id,
 * enforced when keys are registered).
 *
 * Fingerprint versions. v1 ids hashed the PEM text, which depends on an encoding (line length,
 * line endings, labels) rather than on the key. v2 (`keyFingerprint`) hashes the DER bytes and is
 * used for every new key. Keys issued before v2 keep their v1 ids: a fingerprint-shaped id is
 * accepted when it is the key's v2 or its v1 fingerprint (`legacyPemFingerprint`, computed from
 * the key's canonical PEM export, so it does not depend on how the PEM was stored). Both are
 * derived from the key itself, so the binding is as strong as before.
 */
const FINGERPRINT_ID_RE = /^trk_[0-9a-f]{16}$/;

export function isFingerprintKeyId(keyId: string): boolean {
  return FINGERPRINT_ID_RE.test(keyId);
}

/** v2 fingerprint: SHA-256 of the DER-encoded SubjectPublicKeyInfo. */
export function keyFingerprint(publicKey: KeyObject): string {
  return `trk_${sha256Hex(publicKey.export({ type: "spki", format: "der" })).slice(0, 16)}`;
}

/** v1 fingerprint (keys issued before v2): SHA-256 of the key's canonical SPKI PEM text. */
export function legacyPemFingerprint(publicKey: KeyObject): string {
  return `trk_${sha256Hex(publicKey.export({ type: "spki", format: "pem" }).toString().trim()).slice(0, 16)}`;
}

/** Fingerprint of a public key given as PEM: parsed first, so formatting does not change it. */
export function fingerprint(publicKeyPem: string): string {
  return keyFingerprint(createPublicKey({ key: publicKeyPem, format: "pem" }));
}

/**
 * True when `keyId` is acceptable for `publicKey`: a custom id, or that key's own fingerprint
 * (v2, or v1 for keys issued before v2).
 */
export function keyIdMatchesKey(keyId: string, publicKey: KeyObject): boolean {
  if (!isFingerprintKeyId(keyId)) return true;
  try {
    return keyFingerprint(publicKey) === keyId || legacyPemFingerprint(publicKey) === keyId;
  } catch {
    return false;
  }
}

function resolveKeyId(keyId: string | undefined, publicKey: KeyObject): string {
  const own = keyFingerprint(publicKey);
  if (keyId === undefined) return own;
  if (!keyIdMatchesKey(keyId, publicKey)) {
    throw new Error(`Key id ${keyId} looks like a key fingerprint but this key's fingerprint is ${own}`);
  }
  return keyId;
}

/**
 * Loads the Ed25519 signing key from a PKCS#8 PEM string (optionally base64-encoded so it
 * fits in a single environment variable). The key id defaults to a fingerprint of the public key.
 */
export function loadSigningKey(pemOrBase64: string, keyId?: string): SigningKey {
  const pem = pemOrBase64.includes("BEGIN") ? pemOrBase64 : Buffer.from(pemOrBase64, "base64").toString("utf8");
  const private_key = createPrivateKey({ key: pem, format: "pem" });
  if (private_key.asymmetricKeyType !== "ed25519") {
    throw new Error(`TrustRail signing key must be Ed25519, got ${private_key.asymmetricKeyType}`);
  }
  const public_key = createPublicKey(private_key);
  const public_key_pem = public_key.export({ type: "spki", format: "pem" }).toString();
  return { key_id: resolveKeyId(keyId, public_key), private_key, public_key, public_key_pem };
}

export function generateSigningKey(keyId?: string): SigningKey & { private_key_pem: string } {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const private_key_pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const public_key_pem = publicKey.export({ type: "spki", format: "pem" }).toString();
  return {
    key_id: resolveKeyId(keyId, publicKey),
    private_key: privateKey,
    public_key: publicKey,
    public_key_pem,
    private_key_pem,
  };
}

export function publicKeyFromPem(pem: string): KeyObject {
  const key = createPublicKey({ key: pem, format: "pem" });
  if (key.asymmetricKeyType !== "ed25519") throw new Error("Public key is not Ed25519");
  return key;
}
