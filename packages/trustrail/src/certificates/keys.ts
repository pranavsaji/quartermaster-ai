import { createPrivateKey, createPublicKey, generateKeyPairSync, type KeyObject } from "node:crypto";
import { sha256Hex } from "../canonical";

export interface SigningKey {
  key_id: string;
  private_key: KeyObject;
  public_key: KeyObject;
  public_key_pem: string;
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
  return { key_id: keyId ?? fingerprint(public_key_pem), private_key, public_key, public_key_pem };
}

export function generateSigningKey(keyId?: string): SigningKey & { private_key_pem: string } {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const private_key_pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const public_key_pem = publicKey.export({ type: "spki", format: "pem" }).toString();
  return {
    key_id: keyId ?? fingerprint(public_key_pem),
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

export function fingerprint(publicKeyPem: string): string {
  return `trk_${sha256Hex(publicKeyPem.trim()).slice(0, 16)}`;
}
