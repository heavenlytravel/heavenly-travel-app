// Throwaway Neon branches for with-production-db's rehearsals, over the Neon
// API (https://api-docs.neon.tech/reference). Reads NEON_API_KEY and
// NEON_PROJECT_ID from packages/db/.env.

const API = "https://console.neon.tech/api/v2";
const OPERATION_TIMEOUT_MS = 120_000;
const POOLER_SUFFIX = "-pooler";

export type Branch = {
  id: string;
  name: string;
  /** The source URL with this branch's host and its role's password. */
  url: string;
};

async function neon<T>(path: string, init?: RequestInit): Promise<T> {
  const key = process.env.NEON_API_KEY;
  const project = process.env.NEON_PROJECT_ID;
  if (!key || !project) {
    throw new Error(
      "NEON_API_KEY and NEON_PROJECT_ID must be set in packages/db/.env to rehearse.",
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

/**
 * Copies the branch behind the connection string into a new branch with its
 * own compute, and returns a connection string to it that keeps the same
 * role, database, pooling and parameters.
 */
export async function createBranchFrom(
  sourceUrl: string,
  name: string,
): Promise<Branch> {
  const url = new URL(sourceUrl);
  const [label = "", ...domain] = url.hostname.split(".");
  const pooled = label.endsWith(POOLER_SUFFIX);
  const sourceEndpoint = pooled ? label.slice(0, -POOLER_SUFFIX.length) : label;

  const { endpoint } = await neon<{ endpoint: { branch_id: string } }>(
    `/endpoints/${sourceEndpoint}`,
  );
  const created = await neon<{
    branch: { id: string };
    endpoints: { id: string }[];
    operations: { id: string }[];
  }>("/branches", {
    method: "POST",
    body: JSON.stringify({
      branch: { parent_id: endpoint.branch_id, name },
      endpoints: [{ type: "read_write" }],
    }),
  });
  const branch = { id: created.branch.id, name, url: "" };

  try {
    await settle(created.operations);
    const newEndpoint = created.endpoints[0];
    if (!newEndpoint)
      throw new Error("Neon created the branch without a compute.");
    // A branch of a protected branch gets new passwords, so ask for the role's.
    const role = decodeURIComponent(url.username);
    const { password } = await neon<{ password: string }>(
      `/branches/${branch.id}/roles/${encodeURIComponent(role)}/reveal_password`,
    );
    url.hostname = [
      newEndpoint.id + (pooled ? POOLER_SUFFIX : ""),
      ...domain,
    ].join(".");
    url.password = encodeURIComponent(password);
    return { ...branch, url: url.toString() };
  } catch (error) {
    await deleteBranch(branch);
    throw error;
  }
}

/** Deletes the branch and its compute. Reports a failure rather than throwing. */
export async function deleteBranch(branch: Pick<Branch, "id" | "name">) {
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
