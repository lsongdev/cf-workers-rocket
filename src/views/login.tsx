import { Layout } from "./layout";

export function LoginPage({ error }: { error?: string }) {
  return (
    <Layout title="Admin Login" error={error}>
      <div class="card">
        <h2>Admin Login</h2>
        <form method="post" action="/admin/login" class="form">
          <div class="form-group">
            <label for="token">Access Token</label>
            <input class="input" type="password" id="token" name="token" required autocomplete="current-password" />
          </div>
          <button class="button" type="submit">Sign in</button>
        </form>
      </div>
    </Layout>
  );
}
