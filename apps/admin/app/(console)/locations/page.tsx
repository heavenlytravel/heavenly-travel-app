import { requireAdmin } from "../../_lib/access";
import { LocationsManager } from "./LocationsManager";
import { SAMPLE_LOCATIONS } from "./sample-locations";

export default async function LocationsPage() {
  await requireAdmin();

  return <LocationsManager initialLocations={SAMPLE_LOCATIONS} />;
}
