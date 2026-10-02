import "server-only";
import { listDistricts } from "@repo/db/server";
import type { DistrictOption } from "../_components/DistrictPicker";

/** Every district as the picker offers it, by state then name. */
export async function districtOptions(): Promise<DistrictOption[]> {
  const districts = await listDistricts();
  return districts.map((district) => ({
    code: district.code,
    name: district.name,
    stateCode: district.state.code,
    stateName: district.state.name,
    isActive: district.isActive,
  }));
}
