// Neon branches for with-production-db's rehearsals and backups, over the
// Neon API (https://api-docs.neon.tech/reference). Reads NEON_API_KEY and
// NEON_PROJECT_ID from packages/db/.env.

const API = "https://console.neon.tech/api/v2";
const OPERATION_TIMEOUT_MS = 120_000;
const POOLER_SUFFIX = "-pooler";

export type Branch = { id: string; name: string };

/** A branch with its own compute, and a connection string to it. */
export type ConnectedBranch = Branch & {
  /** The source URL with this branch's host and its role's password. */
  url: string;
};

async function neon<T>(path: string, init?: RequestInit): Promise<T> {
  const key = process.env.NEON_API_KEY;
  const project = process.env.NEON_PROJECT_ID;
  if (!key || !project) {
    throw new Error(
      "NEON_API_KEY and NEON_PROJECT_ID must be set in packages/db/.env.",
    );
  }
  const response = await fetch(`${API}/projects/${project}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(
      `Neon API ${init?.method ?? "GET"} ${path}: ${response.status} ${await response.text()}`,
    );
  }
  return (await response.json()) as T;
}

/** Waits until Neon has finished the operations, such as starting a compute. */
async function settle(operations: { id: string }[]) {
  const deadline = Date.now() + OPERATION_TIMEOUT_MS;
  for (const { id } of operations) {
    for (;;) {
      const { operation } = await neon<{ operation: { status: string } }>(
        `/operations/${id}`,
      );
      if (operation.status === "finished" || operation.status === "skipped") {
        break;
      }
      if (["failed", "error", "cancelled"].includes(operation.status)) {
        throw new Error(`Neon operation ${id} ended as ${operation.status}.`);
      }
      if (Date.now() > deadline) {
        throw new Error(`Neon operation ${id} did not finish in time.`);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

/** The connection string's host, split into its endpoint and the rest. */
function hostOf(url: URL) {
  const [label = "", ...domain] = url.hostname.split(".");
  const pooled = label.endsWith(POOLER_SUFFIX);
  const endpoint = pooled ? label.slice(0, -POOLER_SUFFIX.length) : label;
  return { endpoint, pooled, domain };
}

/** Copies the branch behind the connection string, as of now, into a new branch. */
async function createBranch(sourceUrl: URL, name: string, compute: boolean) {
  const { endpoint } = await neon<{ endpoint: { branch_id: string } }>(
    `/endpoints/${hostOf(sourceUrl).endpoint}`,
  );
  const created = await neon<{
    branch: { id: string };
    endpoints: { id: string }[];
    operations: { id: string }[];
  }>("/branches", {
    method: "POST",
    body: JSON.stringify({
      branch: { parent_id: endpoint.branch_id, name },
      endpoints: compute ? [{ type: "read_write" }] : [],
    }),
  });
  const branch: Branch = { id: created.branch.id, name };
  try {
    await settle(created.operations);
  } catch (error) {
    await deleteBranch(branch);
    throw error;
  }
  return { branch, endpoints: created.endpoints };
}

/**
 * Copies the branch behind the connection string into a new branch with its
 * own compute, and returns a connection string to it that keeps the same
 * role, database, pooling and parameters.
 */
export async function createConnectedBranch(
  sourceUrl: string,
  name: string,
): Promise<ConnectedBranch> {
  const url = new URL(sourceUrl);
  const { branch, endpoints } = await createBranch(url, name, true);
  try {
    const endpoint = endpoints[0];
    if (!endpoint)
      throw new Error("Neon created the branch without a compute.");
    // A branch of a protected branch gets new passwords, so ask for the role's.
    const role = decodeURIComponent(url.username);
    const { password } = await neon<{ password: string }>(
      `/branches/${branch.id}/roles/${encodeURIComponent(role)}/reveal_password`,
    );
    const { pooled, domain } = hostOf(url);
    url.hostname = [
      endpoint.id + (pooled ? POOLER_SUFFIX : ""),
      ...domain,
    ].join(".");
    url.password = encodeURIComponent(password);
    return { ...branch, url: url.toString() };
  } catch (error) {
    await deleteBranch(branch);
    throw error;
  }
}

/**
 * Copies the branch behind the connection string into a new branch with no
 * compute, a backup that costs only what changes after it. Then deletes the
 * oldest branches whose names start with the prefix, beyond the newest `keep`.
 */
export async function createBackupBranch(
  sourceUrl: string,
  name: string,
  prefix: string,
  keep: number,
): Promise<Branch> {
  const { branch } = await createBranch(new URL(sourceUrl), name, false);
  try {
    const { branches } = await neon<{
      branches: { id: string; name: string; created_at: string }[];
    }>("/branches");
    const older = branches
      .filter((b) => b.name.startsWith(prefix))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(keep);
    for (const old of older) await deleteBranch(old);
  } catch (error) {
    // The new backup exists, so a failed clean-up must not stop the run.
    console.error(
      `Could not delete the older "${prefix}*" branches. Delete them in the Neon console.\n` +
        (error instanceof Error ? error.message : String(error)),
    );
  }
  return branch;
}

/** Deletes the branch and its compute. Reports a failure rather than throwing. */
export async function deleteBranch(branch: Branch) {
  try {
    await neon(`/branches/${branch.id}`, { method: "DELETE" });
    console.log(`Deleted the Neon branch "${branch.name}".`);
  } catch (error) {
    console.error(
      `Could not delete the Neon branch "${branch.name}". Delete it in the Neon console.\n` +
        (error instanceof Error ? error.message : String(error)),
    );
  }
}
