const ADMIN_CREDENTIAL_SHA256 =
  '6edcf8dc4175f915ec27fde3c0b2761b7c89e5a8474b9cd52636c8c020ebb943';

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyAdminCredentials(
  email: string,
  password: string
): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) return false;
  const candidateHash = await sha256Hex(`${normalizedEmail}:${password}`);
  if (candidateHash.length !== ADMIN_CREDENTIAL_SHA256.length) return false;
  let diff = 0;
  for (let i = 0; i < candidateHash.length; i++) {
    diff |= candidateHash.charCodeAt(i) ^ ADMIN_CREDENTIAL_SHA256.charCodeAt(i);
  }
  return diff === 0;
}
