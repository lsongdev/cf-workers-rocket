import type { User } from "./types";

const userKey = (uuid: string) => `user:${uuid.toLowerCase()}`;
const userHashKey = (hash: string) => `user:hash:${hash.toLowerCase()}`;

export async function listUsers(env: Env): Promise<User[]> {
  const users: User[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.KV.list({ prefix: "user:", limit: 100, cursor });
    const keys = page.keys.filter(({ name }) => !name.startsWith("user:hash:"));
    const records = await Promise.all(keys.map(({ name }) => env.KV.get<User>(name, "json")));
    users.push(...records.filter((user): user is User => user !== null));
    if (page.list_complete) break;
    cursor = page.cursor;
  } while (cursor);
  return users.sort((a, b) => b.created_at.localeCompare(a.created_at) || a.uuid.localeCompare(b.uuid));
}

export async function getUser(env: Env, uuid: string): Promise<User | null> {
  return env.KV.get<User>(userKey(uuid.toLowerCase()), "json");
}

export async function getUserByHash(env: Env, hash: string): Promise<User | null> {
  // The hash key is only a pointer. Always read status from the canonical user.
  // Accept the original full-record format during migration as well.
  const reference = await env.KV.get<string | User>(userHashKey(hash), "json");
  if (!reference) return null;
  const user = await getUser(env, typeof reference === "string" ? reference : reference.uuid);
  return user?.uuid_hash?.toLowerCase() === hash.toLowerCase() ? user : null;
}

export async function createUser(env: Env, name: string, uuid: string, uuidHash: string): Promise<void> {
  uuid = uuid.toLowerCase();
  uuidHash = uuidHash.toLowerCase();
  const timestamp = new Date().toISOString();
  const user: User = {
    id: uuid,
    name,
    uuid,
    uuid_hash: uuidHash,
    enabled: 1,
    created_at: timestamp,
    updated_at: timestamp,
  };
  // A failed second write leaves a harmless pointer, never an active partial user.
  await env.KV.put(userHashKey(uuidHash), JSON.stringify(uuid));
  await env.KV.put(userKey(uuid), JSON.stringify(user));
}

export async function setUserEnabled(env: Env, uuid: string, enabled: boolean): Promise<void> {
  const user = await getUser(env, uuid);
  if (!user) return;
  const updated: User = { ...user, enabled: enabled ? 1 : 0, updated_at: new Date().toISOString() };
  await env.KV.put(userKey(updated.uuid), JSON.stringify(updated));
}

export async function deleteUser(env: Env, uuid: string): Promise<void> {
  const user = await getUser(env, uuid);
  if (!user) return;
  await env.KV.delete(userKey(user.uuid));
  if (user.uuid_hash) await env.KV.delete(userHashKey(user.uuid_hash));
}
