import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyAdminCredentials } from './adminAuth';

test('verifyAdminCredentials accepts valid admin email and password', async () => {
  const ok = await verifyAdminCredentials(
    'bernardogloogle79@gmail.com',
    '7c]%T9})fgT=:wH+_M:g'
  );
  assert.equal(ok, true);
});

test('verifyAdminCredentials normalizes email casing and whitespace', async () => {
  const ok = await verifyAdminCredentials(
    '  BernardoGloogle79@GMAIL.com ',
    '7c]%T9})fgT=:wH+_M:g'
  );
  assert.equal(ok, true);
});

test('verifyAdminCredentials rejects invalid credentials', async () => {
  assert.equal(
    await verifyAdminCredentials('bernardogloogle79@gmail.com', 'wrong-pass'),
    false
  );
  assert.equal(
    await verifyAdminCredentials('other@gmail.com', '7c]%T9})fgT=:wH+_M:g'),
    false
  );
  assert.equal(await verifyAdminCredentials('', ''), false);
});
