const DEFAULT_ADMIN_CREDENTIAL_SHA256 =
  '6edcf8dc4175f915ec27fde3c0b2761b7c89e5a8474b9cd52636c8c020ebb943';

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyAdminCredentialsWithHash(
  email: string,
  password: string,
  expectedSha256: string
): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password || !expectedSha256) return false;
  const candidateHash = await sha256Hex(`${normalizedEmail}:${password}`);
  if (candidateHash.length !== expectedSha256.length) return false;
  let diff = 0;
  for (let i = 0; i < candidateHash.length; i++) {
    diff |= candidateHash.charCodeAt(i) ^ expectedSha256.charCodeAt(i);
  }
  return diff === 0;
}

export async function verifyAdminCredentials(
  email: string,
  password: string
): Promise<boolean> {
  const configuredHash =
    (typeof import.meta !== 'undefined' &&
      (import.meta as unknown as { env?: Record<string, string | undefined> }).env
        ?.VITE_ADMIN_CREDENTIAL_SHA256) ||
    DEFAULT_ADMIN_CREDENTIAL_SHA256;
  return verifyAdminCredentialsWithHash(email, password, configuredHash);
}
