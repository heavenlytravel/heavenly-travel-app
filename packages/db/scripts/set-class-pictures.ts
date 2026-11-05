// Usage: pnpm --filter @repo/db db:set-class-pictures
// Run once after the schema push that adds `VehicleClass.imageUrls`. A
// class had one picture, `imageUrl`; it now has a list, the first its
// cover. Each class with a picture and an empty list gets the picture as
// its list. A class whose list is set is left alone, so running it again
// changes nothing. `imageUrl` is kept, so the site still running before
// the merge keeps showing it; a save of the list clears it.
import { db } from "../src/client";

const classes = await db.vehicleClass.findMany({
  where: { imageUrl: { not: null }, imageUrls: { isEmpty: true } },
  select: { id: true, name: true, imageUrl: true },
});

for (const vehicleClass of classes) {
  await db.vehicleClass.update({
    where: { id: vehicleClass.id },
    data: { imageUrls: [vehicleClass.imageUrl!] },
  });
  console.log(`${vehicleClass.name}: ${vehicleClass.imageUrl}`);
}
await db.$disconnect();

console.log(
  classes.length === 0
    ? "No class has a picture to move. Nothing to change."
    : `Moved the picture of ${classes.length} class(es) into its list.`,
);
