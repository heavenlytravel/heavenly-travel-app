import { getAdmin } from "../../../_lib/access";
import { FORBIDDEN_MESSAGE } from "../../../_lib/action-state";
import { uploadImage } from "../../../_lib/uploads";

/**
 * POST /api/uploads/location-image, with the image as the form field
 * `file`. The page editor's upload, behind `locations.manage`. Answers the
 * stored file as an `UploadedImage`, or `{ error }` with the sentence the
 * editor shows.
 */
export async function POST(request: Request) {
  const admin = await getAdmin("locations.manage");
  if (!admin) {
    return Response.json({ error: FORBIDDEN_MESSAGE }, { status: 403 });
  }

  const file = await request
    .formData()
    .then((form) => form.get("file"))
    .catch(() => null);
  if (!(file instanceof File)) {
    return Response.json({ error: "Choose an image." }, { status: 400 });
  }

  const result = await uploadImage(file);
  return result.ok
    ? Response.json(result.image)
    : Response.json({ error: result.error }, { status: result.status });
}
