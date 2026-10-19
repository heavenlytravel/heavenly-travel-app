import {
  BanknoteIcon,
  BusIcon,
  CalendarCheckIcon,
  CarIcon,
  FileTextIcon,
  HistoryIcon,
  IdCardIcon,
  LayoutDashboardIcon,
  MapIcon,
  MapPinIcon,
} from "@repo/ui/icons";
import type { ReactNode } from "react";
import type { LocationTab } from "../../../_lib/routes";

/** Each tab of a location by its icon, as the panel lists them and the overview sums them up. */
export const LOCATION_TAB_ICONS: Record<LocationTab, ReactNode> = {
  overview: <LayoutDashboardIcon />,
  details: <MapPinIcon />,
  "vehicle-classes": <BusIcon />,
  coverage: <MapIcon />,
  rates: <BanknoteIcon />,
  pages: <FileTextIcon />,
  bookings: <CalendarCheckIcon />,
  vehicles: <CarIcon />,
  drivers: <IdCardIcon />,
  history: <HistoryIcon />,
};
