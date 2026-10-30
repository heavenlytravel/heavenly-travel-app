import { STATUS_PATH } from "../_ui/nav";

/**
 * Where a registration goes when its account has registered a business
 * already, or drives for one: its status page, which hands an approved
 * one on to Connect, marked so the form says why instead of "Sent".
 */
export const ALREADY_REGISTERED_HREF = `${STATUS_PATH}?registered=already`;
