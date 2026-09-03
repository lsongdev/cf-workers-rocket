import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { createUser, deleteUser, getUser, getUserByHash, listUsers, setUserEnabled } from '../src/store';
import { lookupTrojanUser, lookupUserByUUID } from '../src/proxy/common';
import { sha224 } from '../src/crypto';

const uuid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const second = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const hash = (value: string) => createHash('sha224').update(value).digest('hex');
function fixture() {
  const data = new Map<string, string>();
  let failPut = '';
  let failDelete = '';
  const kv = {
    async get(key: string) { return data.has(key) ? JSON.parse(data.get(key)!) : null; },
    async put(key: string, value: string) {
      if (key === failPut) throw new Error('injected put failure');
      data.set(key, value);
    },
    async delete(key: string) {
      if (key === failDelete) throw new Error('injected delete failure');
      data.delete(key);
    },
    async list({ prefix, cursor }: { prefix: string; cursor?: string }) {
      const keys = [...data.keys()].filter(k => k.startsWith(prefix)).sort();
      const offset = Number(cursor ?? 0);
      return { keys: keys.slice(offset, offset + 2).map(name => ({ name })), list_complete: offset + 2 >= keys.length, cursor: String(offset + 2) };
    },
  };
  return { data, kv, env: { KV: kv } as unknown as Env, failPut: (key: string) => { failPut = key; }, failDelete: (key: string) => { failDelete = key; } };
}

test('concurrent creates remain listed, hash pointers are excluded and pages are followed', async () => {
  const f = fixture();
  await Promise.all([createUser(f.env, 'A', uuid.toUpperCase(), hash(uuid).toUpperCase()), createUser(f.env, 'B', second, hash(second))]);
  assert.equal((await listUsers(f.env)).length, 2);
  assert.equal(f.data.has('users:index'), false);
  assert.equal((await getUser(f.env, uuid.toUpperCase()))?.uuid, uuid);
  assert.equal((await getUserByHash(f.env, hash(uuid).toUpperCase()))?.uuid, uuid);
});

test('both protocols use the current status without extra positive or negative caches', async () => {
  const f = fixture();
  assert.equal(await lookupUserByUUID(f.env, uuid), null);
  await createUser(f.env, 'A', uuid, hash(uuid));
  assert.ok(await lookupUserByUUID(f.env, uuid));
  assert.ok(await lookupTrojanUser(f.env, hash(uuid)));
  await setUserEnabled(f.env, uuid, false);
  assert.equal(await lookupUserByUUID(f.env, uuid), null);
  assert.equal(await lookupTrojanUser(f.env, hash(uuid)), null);
  await setUserEnabled(f.env, uuid, true);
  assert.ok(await lookupTrojanUser(f.env, hash(uuid)));
  await deleteUser(f.env, uuid);
  assert.equal(await lookupUserByUUID(f.env, uuid), null);
  assert.equal(await lookupTrojanUser(f.env, hash(uuid)), null);
});

test('old full-record hash entries cannot bypass disabled or deleted canonical records', async () => {
  const f = fixture();
  await createUser(f.env, 'A', uuid, hash(uuid));
  f.data.set('user:hash:' + hash(uuid), f.data.get('user:' + uuid)!);
  await setUserEnabled(f.env, uuid, false);
  assert.equal(await lookupTrojanUser(f.env, hash(uuid)), null);
  f.failDelete('user:hash:' + hash(uuid));
  await assert.rejects(deleteUser(f.env, uuid));
  assert.equal(await lookupTrojanUser(f.env, hash(uuid)), null);
});

test('partial creation leaves no usable account', async () => {
  for (const failedKey of ['user:' + uuid, 'user:hash:' + hash(uuid)]) {
    const f = fixture();
    f.failPut(failedKey);
    await assert.rejects(createUser(f.env, 'A', uuid, hash(uuid)));
    assert.equal(await lookupUserByUUID(f.env, uuid), null);
    assert.equal(await lookupTrojanUser(f.env, hash(uuid)), null);
  }
});

test('empty incomplete listing pages and missing records do not truncate the list', async () => {
  const f = fixture();
  await createUser(f.env, 'A', uuid, hash(uuid));
  let calls = 0;
  f.kv.list = async ({ prefix, cursor }) => {
    assert.equal(prefix, 'user:');
    calls++;
    if (!cursor) return { keys: [], list_complete: false, cursor: 'next' };
    return { keys: [{ name: 'user:' + uuid }, { name: 'user:' + second }], list_complete: true, cursor: '' };
  };
  assert.equal((await listUsers(f.env)).length, 1);
  assert.equal(calls, 2);
});

test('hash implementation matches standard SHA-224 and malformed credentials are rejected', async () => {
  for (const value of ['', uuid, 'a'.repeat(64), '你好']) assert.equal(await sha224(value), hash(value));
  const f = fixture();
  assert.equal(await lookupUserByUUID(f.env, 'invalid'), null);
  assert.equal(await lookupTrojanUser(f.env, 'invalid'), null);
});
