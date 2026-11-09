import { generateSigningKey } from "@qm/trustrail";

/**
 * Generates a TrustRail Ed25519 signing key. Prints environment variable lines; the private key
 * is base64-encoded PKCS#8 so it fits on one line. Store it only in your secret manager / .env.
 */
// By default the key id is derived from the public key's fingerprint, so it is unique per key and
// bound to it (rotation can never reuse an id). An explicit id may still be passed as an argument.
const key = generateSigningKey(process.argv[2]);
console.log(`TRUSTRAIL_SIGNING_KEY_ID=${key.key_id}`);
console.log(`TRUSTRAIL_SIGNING_KEY=${Buffer.from(key.private_key_pem).toString("base64")}`);
console.error(`\nPublic key (safe to publish for independent certificate verification):\n${key.public_key_pem}`);
