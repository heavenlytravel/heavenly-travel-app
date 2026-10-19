import { answerImageUpload } from "../../../_lib/uploads";

/**
 * POST /api/uploads/vehicle-image, with the photo as the form field
 * `file`. One photo of one of our vehicles, behind `fleet.manage`, as the
 * vehicle's form is.
 */
export function POST(request: Request) {
  return answerImageUpload(request, "fleet.manage");
}
