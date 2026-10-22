import { db } from "../src/client";
const r = await db.zoneRate.findMany({ where: { location: { slug: "langkawi" } }, include: { fromZone: { select: { name: true } }, toZone: { select: { name: true, location: { select: { slug: true } } } }, vehicleClass: { select: { name: true } } } });
for (const x of r) console.log(x.fromZone.name, "->", x.toZone.name, x.toZone.location.slug, x.vehicleClass.name, x.priceSen);
const into = await db.zoneRate.count({ where: { toZone: { location: { slug: "langkawi" } }, NOT: { location: { slug: "langkawi" } } } });
console.log("routes in from elsewhere", into);
