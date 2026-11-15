import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sha256Hex,
  verifyAdminCredentials,
  verifyAdminCredentialsWithHash,
} from './adminAuth';

test('verifyAdminCredentialsWithHash accepts matching email and password', async () => {
  const expectedHash = await sha256Hex('admin.teste@exemplo.com:SenhaTeste#2026');
  const ok = await verifyAdminCredentialsWithHash(
    'admin.teste@exemplo.com',
    'SenhaTeste#2026',
    expectedHash
  );
  assert.equal(ok, true);
});

test('verifyAdminCredentialsWithHash normalizes email casing and whitespace', async () => {
  const expectedHash = await sha256Hex('admin.teste@exemplo.com:SenhaTeste#2026');
  const ok = await verifyAdminCredentialsWithHash(
    '  Admin.Teste@EXEMPLO.com ',
    'SenhaTeste#2026',
    expectedHash
  );
  assert.equal(ok, true);
});

test('verifyAdminCredentialsWithHash and verifyAdminCredentials reject invalid credentials', async () => {
  const expectedHash = await sha256Hex('admin.teste@exemplo.com:SenhaTeste#2026');
  assert.equal(
    await verifyAdminCredentialsWithHash('admin.teste@exemplo.com', 'wrong-pass', expectedHash),
    false
  );
  assert.equal(
    await verifyAdminCredentialsWithHash('other@exemplo.com', 'SenhaTeste#2026', expectedHash),
    false
  );
  assert.equal(await verifyAdminCredentials('', ''), false);
  assert.equal(await verifyAdminCredentials('invalid@exemplo.com', 'wrong'), false);
});
