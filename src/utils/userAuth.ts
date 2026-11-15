export interface LocalUserAccount {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

export interface SafeLocalUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

const USERS_INDEX_KEY = 'finance_os_users_v1';
const ACTIVE_USER_KEY = 'finance_os_active_user_v1';

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateSalt(): string {
  const arr = new Uint8Array(12);
  globalThis.crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function loadLocalUsers(storage: Storage = localStorage): LocalUserAccount[] {
  try {
    const raw = storage.getItem(USERS_INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function listSafeLocalUsers(storage: Storage = localStorage): SafeLocalUser[] {
  return loadLocalUsers(storage).map(({ id, name, email, createdAt }) => ({
    id,
    name,
    email,
    createdAt,
  }));
}

function saveLocalUsers(users: LocalUserAccount[], storage: Storage = localStorage): void {
  storage.setItem(USERS_INDEX_KEY, JSON.stringify(users));
}

export async function registerLocalUser(
  params: { name: string; email: string; password: string },
  storage: Storage = localStorage
): Promise<{ ok: true; user: SafeLocalUser } | { ok: false; error: string }> {
  const name = params.name.trim();
  const email = params.email.trim().toLowerCase();
  const password = params.password;

  if (name.length < 2) {
    return { ok: false, error: 'Informe um nome com pelo menos 2 caracteres.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Informe um endereço de e-mail válido.' };
  }
  if (password.length < 6) {
    return { ok: false, error: 'A senha deve conter no mínimo 6 caracteres.' };
  }

  const users = loadLocalUsers(storage);
  if (users.some((u) => u.email === email)) {
    return { ok: false, error: 'Já existe uma conta cadastrada com este e-mail.' };
  }

  const salt = generateSalt();
  const passwordHash = await sha256Hex(`${salt}:${password}`);
  const id = `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const newUser: LocalUserAccount = {
    id,
    name,
    email,
    passwordHash,
    salt,
    createdAt: new Date().toISOString(),
  };

  saveLocalUsers([...users, newUser], storage);
  const safe: SafeLocalUser = {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    createdAt: newUser.createdAt,
  };
  storage.setItem(ACTIVE_USER_KEY, JSON.stringify(safe));
  return { ok: true, user: safe };
}

export async function authenticateLocalUser(
  params: { email: string; password: string },
  storage: Storage = localStorage
): Promise<{ ok: true; user: SafeLocalUser } | { ok: false; error: string }> {
  const email = params.email.trim().toLowerCase();
  const password = params.password;
  if (!email || !password) {
    return { ok: false, error: 'Preencha e-mail e senha para entrar.' };
  }

  const users = loadLocalUsers(storage);
  const found = users.find((u) => u.email === email);
  if (!found) {
    return { ok: false, error: 'E-mail ou senha incorretos.' };
  }

  const candidateHash = await sha256Hex(`${found.salt}:${password}`);
  if (candidateHash !== found.passwordHash) {
    return { ok: false, error: 'E-mail ou senha incorretos.' };
  }

  const safe: SafeLocalUser = {
    id: found.id,
    name: found.name,
    email: found.email,
    createdAt: found.createdAt,
  };
  storage.setItem(ACTIVE_USER_KEY, JSON.stringify(safe));
  return { ok: true, user: safe };
}

export function getActiveLocalUser(storage: Storage = localStorage): SafeLocalUser | null {
  try {
    const raw = storage.getItem(ACTIVE_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SafeLocalUser;
    return parsed && parsed.id && parsed.email ? parsed : null;
  } catch {
    return null;
  }
}

export function clearActiveLocalUser(storage: Storage = localStorage): void {
  storage.removeItem(ACTIVE_USER_KEY);
}

export function getWorkspaceKeyForAccount(accountId: string | null): string {
  return accountId ? `finance_os_workspace_user_${accountId}` : 'finance_os_workspace_v1';
}

const RESET_TOKEN_KEY = 'finance_os_reset_tokens_v1';

interface ResetTokenRecord {
  email: string;
  code: string;
  expiresAt: number;
}

export function requestPasswordReset(
  emailInput: string,
  storage: Storage = localStorage
): { ok: true; code: string; email: string } | { ok: false; error: string } {
  const email = emailInput.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Informe um e-mail válido.' };
  }
  const users = loadLocalUsers(storage);
  if (!users.some((u) => u.email === email)) {
    return { ok: false, error: 'Nenhuma conta encontrada para este e-mail.' };
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const record: ResetTokenRecord = {
    email,
    code,
    expiresAt: Date.now() + 15 * 60 * 1000,
  };
  storage.setItem(RESET_TOKEN_KEY, JSON.stringify(record));
  return { ok: true, code, email };
}

export async function completePasswordReset(
  params: { email: string; code: string; newPassword: string },
  storage: Storage = localStorage
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = params.email.trim().toLowerCase();
  const code = params.code.trim();
  if (params.newPassword.length < 6) {
    return { ok: false, error: 'A nova senha deve ter no mínimo 6 caracteres.' };
  }
  let record: ResetTokenRecord | null = null;
  try {
    const raw = storage.getItem(RESET_TOKEN_KEY);
    if (raw) record = JSON.parse(raw) as ResetTokenRecord;
  } catch {
    record = null;
  }

  if (!record || record.email !== email || record.code !== code) {
    return { ok: false, error: 'Código de recuperação inválido.' };
  }
  if (Date.now() > record.expiresAt) {
    storage.removeItem(RESET_TOKEN_KEY);
    return { ok: false, error: 'Código expirado. Solicite um novo código.' };
  }

  const users = loadLocalUsers(storage);
  const idx = users.findIndex((u) => u.email === email);
  if (idx === -1) {
    return { ok: false, error: 'Conta não encontrada.' };
  }

  const salt = generateSalt();
  const passwordHash = await sha256Hex(`${salt}:${params.newPassword}`);
  users[idx] = { ...users[idx], salt, passwordHash };
  saveLocalUsers(users, storage);
  storage.removeItem(RESET_TOKEN_KEY);
  return { ok: true };
}

