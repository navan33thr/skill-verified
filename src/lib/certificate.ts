// Generates a 12-character alphanumeric certificate code (uppercase, no ambiguous chars)
export function generateCertificateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const arr = new Uint32Array(12);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 12; i++) out += chars[arr[i] % chars.length];
  return out;
}

export type CertStatus = "valid" | "expired" | "revoked" | "not_found";

export function getCertStatus(cert: {
  revoked: boolean;
  expiration_date: string | null;
} | null): CertStatus {
  if (!cert) return "not_found";
  if (cert.revoked) return "revoked";
  if (cert.expiration_date && new Date(cert.expiration_date) < new Date()) return "expired";
  return "valid";
}
