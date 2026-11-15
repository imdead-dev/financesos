import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authenticateLocalUser,
  clearActiveLocalUser,
  completePasswordReset,
  getActiveLocalUser,
  getWorkspaceKeyForAccount,
  listSafeLocalUsers,
  registerLocalUser,
  requestPasswordReset,
} from './userAuth';

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

test('registerLocalUser creates isolated user and sets active session', async () => {
  const mem = createMemoryStorage();
  const res = await registerLocalUser(
    { name: 'Ana Silva', email: 'ana@exemplo.com', password: 'secretpassword' },
    mem
  );
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.user.email, 'ana@exemplo.com');
    assert.equal(getActiveLocalUser(mem)?.id, res.user.id);
    assert.notEqual(getWorkspaceKeyForAccount(res.user.id), getWorkspaceKeyForAccount(null));
  }
});

test('registerLocalUser rejects duplicate email and short password', async () => {
  const mem = createMemoryStorage();
  await registerLocalUser(
    { name: 'Ana', email: 'ana@exemplo.com', password: 'password1' },
    mem
  );
  const dup = await registerLocalUser(
    { name: 'Ana 2', email: 'ANA@exemplo.com', password: 'password2' },
    mem
  );
  assert.equal(dup.ok, false);

  const shortPass = await registerLocalUser(
    { name: 'Carlos', email: 'carlos@exemplo.com', password: '123' },
    mem
  );
  assert.equal(shortPass.ok, false);
});

test('authenticateLocalUser verifies password hash and rejects wrong passwords', async () => {
  const mem = createMemoryStorage();
  await registerLocalUser(
    { name: 'Pedro', email: 'pedro@exemplo.com', password: 'minhasenha123' },
    mem
  );
  clearActiveLocalUser(mem);
  assert.equal(getActiveLocalUser(mem), null);

  const bad = await authenticateLocalUser(
    { email: 'pedro@exemplo.com', password: 'errada' },
    mem
  );
  assert.equal(bad.ok, false);

  const good = await authenticateLocalUser(
    { email: 'pedro@exemplo.com', password: 'minhasenha123' },
    mem
  );
  assert.equal(good.ok, true);
  assert.equal(getActiveLocalUser(mem)?.email, 'pedro@exemplo.com');
  assert.equal(listSafeLocalUsers(mem).length, 1);
});

test('password recovery generates OTP code and resets password cleanly', async () => {
  const mem = createMemoryStorage();
  await registerLocalUser(
    { name: 'Maria', email: 'maria@exemplo.com', password: 'oldpassword' },
    mem
  );
  const req = requestPasswordReset('maria@exemplo.com', mem);
  assert.equal(req.ok, true);
  if (req.ok) {
    const badReset = await completePasswordReset(
      { email: 'maria@exemplo.com', code: '000000', newPassword: 'newpassword1' },
      mem
    );
    assert.equal(badReset.ok, false);

    const okReset = await completePasswordReset(
      { email: 'maria@exemplo.com', code: req.code, newPassword: 'newpassword1' },
      mem
    );
    assert.equal(okReset.ok, true);

    const oldAuth = await authenticateLocalUser(
      { email: 'maria@exemplo.com', password: 'oldpassword' },
      mem
    );
    assert.equal(oldAuth.ok, false);

    const newAuth = await authenticateLocalUser(
      { email: 'maria@exemplo.com', password: 'newpassword1' },
      mem
    );
    assert.equal(newAuth.ok, true);
  }
});
