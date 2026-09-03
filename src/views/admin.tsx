import type { User } from "../types";
import { Layout } from "./layout";

export function AdminPage(props: {
  users: User[];
  host: string;
  error?: string;
}) {
  return (
    <Layout title="Dashboard" admin error={props.error}>

      <section class="card" >
        <h2 style="margin-bottom:1rem">Add User</h2>
        <form method="post" action="/admin/users" class="form">
          <div class="form-group">
            <label for="name">Name</label>
            <input class={"input"} type="text" id="name" name="name" required placeholder="e.g. alice" />
          </div>
          <button type="submit" class="button">Generate & Add</button>
        </form>
      </section>

      {props.users.length === 0 ? (
        <div class="empty">No users yet. Add your first user above.</div>
      ) : (
        <table class="table" >
          <thead>
            <tr>
              <th>Name</th>
              <th>UUID (Password)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {props.users.map((user) => (
              <tr key={user.id}>
                <td><strong>{user.name}</strong></td>
                <td class="mono">
                  <b>{user.uuid}</b>
                  <em class="flex gap-5 flex-wrap">
                    <a class="" href={`/link/vless/${user.uuid}`} target="_blank">VLESS</a>
                    <a class="" href={`/link/trojan/${user.uuid}`} target="_blank">Trojan</a>
                    <a class="" href={`/link/clash/${user.uuid}`} target="_blank">Clash</a>
                    <a class="" href={`/link/shadowrocket/${user.uuid}`} target="_blank">Shadowrocket</a>
                  </em>
                </td>
                <td>
                  <span class={`tag ${user.enabled ? "active" : "inactive"}`}>
                    {user.enabled ? "active" : "disabled"}
                  </span>
                </td>
                <td>
                  <div class="flex gap-5 flex-center">
                    <form method="post" action={`/admin/users/${user.id}/toggle`}>
                      <input type="hidden" name="enabled" value={user.enabled === 1 ? "0" : "1"} />
                      <button type="submit" class="button button-small" style="font-size:.8rem;padding:.3rem .6rem">
                        {user.enabled ? "Disable" : "Enable"}
                      </button>
                    </form>
                    <form method="post" action={`/admin/users/${user.id}/delete`}
                      onsubmit="return confirm('Delete user &quot;{user.name}&quot;?')">
                      <button type="submit" class="button button-small button-danger" style="font-size:.8rem;padding:.3rem .6rem">Delete</button>
                    </form>

                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Layout>
  );
}
