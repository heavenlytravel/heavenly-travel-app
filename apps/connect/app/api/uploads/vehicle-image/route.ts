import { answerUpload } from "@repo/console/image-upload";
import { getMemberAccess, NOT_A_MEMBER } from "../../../_lib/access";

/**
 * POST /api/uploads/vehicle-image, with the photo as the form field
 * `file`. One photo of a vendor's own vehicle, for an active vendor's
 * member, as the vehicle's form in Connect is. Vendors' photos never
 * reach the website.
 */
export async function POST(request: Request) {
  if (!(await getMemberAccess())) {
    return Response.json(NOT_A_MEMBER, { status: 403 });
  }
  return answerUpload(request);
}
