import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import {
  deleteUserFromClerk,
  snapshotFromWebhook,
  upsertUserFromClerk,
} from "@repo/db/server";

// Mirrors Clerk users into the User table. Register this URL once per Clerk
// instance (Development -> staging, Production -> production domain).
export async function POST(req: NextRequest) {
  let event: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    event = await verifyWebhook(req);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "user.created":
    case "user.updated": {
      const snapshot = snapshotFromWebhook(event.data);
      if (!snapshot) {
        return Response.json({ error: "No primary email" }, { status: 400 });
      }
      await upsertUserFromClerk(snapshot);
      break;
    }
    case "user.deleted": {
      if (event.data.id) await deleteUserFromClerk(event.data.id);
      break;
    }
  }

  return Response.json({ received: true });
}
