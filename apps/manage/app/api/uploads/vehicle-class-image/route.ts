import { answerImageUpload } from "../../../_lib/uploads";

/**
 * POST /api/uploads/vehicle-class-image, with the image as the form field
 * `file`. A vehicle class's picture, behind `coverage.manage`, as the
 * class's form is.
 */
export function POST(request: Request) {
  return answerImageUpload(request, "coverage.manage");
}
