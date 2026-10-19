import { answerImageUpload } from "../../../_lib/uploads";

/**
 * POST /api/uploads/vehicle-model-image, with the photo as the form field
 * `file`. One photo of a model of a vehicle class, behind
 * `coverage.manage`, as the model's form is.
 */
export function POST(request: Request) {
  return answerImageUpload(request, "coverage.manage");
}
