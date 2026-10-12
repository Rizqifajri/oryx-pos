/**
 * End-to-end check of the permission model against a running API.
 *
 * Creates a throwaway tenant, a read-only staff role and a user on it, then
 * asserts the things that were broken before:
 *
 *   1. every permission the UI can offer resolves to a real id (the role dialog
 *      is built from this same catalogue, so a checkbox cannot be a no-op)
 *   2. saving a role stores exactly the permissions that were sent
 *   3. editing only a role's permissions does not 500
 *   4. granting a permission takes effect on the next request, without re-login
 *   5. revoking one takes effect just as fast
 *
 * Usage:  API_URL=http://localhost:3000/api/v1 npx tsx src/scripts/check-permissions.ts
 */
const API = process.env.API_URL ?? "http://localhost:3000/api/v1";

let failures = 0;
const check = (ok: boolean, label: string, detail = "") => {
  console.log(`${ok ? "  ok  " : "FAIL  "}${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

type Res<T = any> = { status: number; body: T };

const call = async <T>(
  path: string,
  init: RequestInit = {},
  token?: string,
): Promise<Res<T>> => {
  const res = await fetch(API + path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // no body
  }
  return { status: res.status, body };
};

const main = async () => {
  const tag = Date.now().toString().slice(-6);
  const adminEmail = `permcheck-admin-${tag}@test.local`;
  const staffEmail = `permcheck-staff-${tag}@test.local`;
  const password = "Admin@123";

  const reg = await call("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Perm Check Admin",
      email: adminEmail,
      password,
      tenantName: `PermCheck ${tag}`,
    }),
  });
  check(reg.status === 201, "register throwaway tenant", `HTTP ${reg.status}`);
  if (reg.status !== 201) return;

  const adminLogin = await call<any>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: adminEmail, password }),
  });
  const adminToken = adminLogin.body?.data?.accessToken as string;
  check(!!adminToken, "tenant admin can log in");

  const me = (await call<any>("/auth/me", {}, adminToken)).body.data;
  const tenantId = me.tenantId as string;

  // 1. the catalogue the role dialog is built from
  const cat = (await call<any>("/permissions", {}, adminToken)).body.data as {
    id: string;
    name: string;
  }[];
  check(
    cat.length > 0 && cat.every((p) => !!p.id && /.+:.+/.test(p.name)),
    "permission catalogue is assignable",
    `${cat.length} permissions, all with an id`,
  );
  const id = (name: string) => cat.find((p) => p.name === name)?.id as string;

  // 2. a role saves exactly what was sent
  const wanted = ["menu:list", "menu:view", "order:list"];
  const created = await call<any>(
    "/roles",
    {
      method: "POST",
      body: JSON.stringify({
        tenantId,
        name: `Read-only staff ${tag}`,
        scope: "TENANT",
        permissionIds: wanted.map(id),
      }),
    },
    adminToken,
  );
  const roleId = created.body?.data?.id as string;
  const saved = (await call<any>(`/roles/${roleId}`, {}, adminToken)).body.data;
  const savedNames = (saved?.permissions ?? []).map((p: any) => p.name).sort();
  check(
    JSON.stringify(savedNames) === JSON.stringify([...wanted].sort()),
    "role stores exactly the permissions sent",
    savedNames.join(", "),
  );

  // 3. permissions-only edit must not 500
  const permsOnly = await call(
    `/roles/${roleId}`,
    { method: "PATCH", body: JSON.stringify({ permissionIds: wanted.map(id) }) },
    adminToken,
  );
  check(permsOnly.status === 200, "editing only permissions succeeds", `HTTP ${permsOnly.status}`);

  // a user on that role
  const staff = await call<any>(
    "/users",
    {
      method: "POST",
      body: JSON.stringify({
        tenantId,
        roleId,
        name: "Perm Check Staff",
        email: staffEmail,
        password,
      }),
    },
    adminToken,
  );
  check(staff.status === 201, "create a user on the new role", `HTTP ${staff.status}`);

  const staffLogin = await call<any>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: staffEmail, password }),
  });
  const staffToken = staffLogin.body?.data?.accessToken as string;
  check(!!staffToken, "staff can log in");

  check(
    (await call("/menus", {}, staffToken)).status === 200,
    "granted permission works (GET /menus with menu:list)",
  );
  const createBefore = await call(
    "/menus",
    { method: "POST", body: JSON.stringify({ name: "x", price: 1 }) },
    staffToken,
  );
  check(
    createBefore.status === 403,
    "ungranted permission is refused (POST /menus without menu:create)",
    `HTTP ${createBefore.status}`,
  );

  // 4. grant takes effect on the SAME token
  await call(
    `/roles/${roleId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ permissionIds: [...wanted, "menu:create"].map(id) }),
    },
    adminToken,
  );
  const createAfter = await call(
    "/menus",
    { method: "POST", body: JSON.stringify({ name: "x", price: 1 }) },
    staffToken,
  );
  check(
    createAfter.status !== 403,
    "a new permission applies without re-login",
    `HTTP ${createAfter.status} (403 would mean the token snapshot is still trusted)`,
  );

  // 5. revoke takes effect on the SAME token
  await call(
    `/roles/${roleId}`,
    { method: "PATCH", body: JSON.stringify({ permissionIds: [id("order:list")] }) },
    adminToken,
  );
  const listAfterRevoke = await call("/menus", {}, staffToken);
  check(
    listAfterRevoke.status === 403,
    "a revoked permission stops working immediately",
    `HTTP ${listAfterRevoke.status}`,
  );

  console.log(
    `\n${failures === 0 ? "all checks passed" : `${failures} check(s) failed`} — left behind tenant "PermCheck ${tag}" (${adminEmail}, ${staffEmail})`,
  );
  process.exit(failures === 0 ? 0 : 1);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
