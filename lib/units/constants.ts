/**
 * Unit constants. US_CUP_ML is the one to change if we ever support UK
 * (284 ml), Australian/metric (250 ml) cups. Spoons follow the cup
 * (1 cup = 16 tbsp = 48 tsp), which also matches metric 15/5 ml spoons.
 */
export const US_CUP_ML = 240;
export const TBSP_ML = US_CUP_ML / 16; // 15
export const TSP_ML = TBSP_ML / 3; // 5

// Real US customary volumes (fl oz-based; a "legal" cup of 240 ml is slightly larger than 8 fl oz).
export const FL_OZ_ML = 29.5735;
export const PINT_ML = 473.176;
export const QUART_ML = 946.353;
export const GALLON_ML = 3785.41;

export const OZ_G = 28.3495;
export const LB_G = 453.592;
/** US butter stick, as printed on the wrapper. */
export const BUTTER_STICK_G = 113;

/** In metric mode, spoon measures up to this many ml stay as spoons (4 tbsp). */
export const SPOON_MAX_ML = 4 * TBSP_ML;

export type UnitSystem = "original" | "metric" | "us";
export const UNIT_SYSTEMS: UnitSystem[] = ["original", "metric", "us"];
