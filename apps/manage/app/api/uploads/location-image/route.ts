import { answerImageUpload } from "../../../_lib/uploads";

/**
 * POST /api/uploads/location-image, with the image as the form field
 * `file`. The page editor's upload, behind `locations.manage`.
 */
export function POST(request: Request) {
  return answerImageUpload(request, "locations.manage");
}
