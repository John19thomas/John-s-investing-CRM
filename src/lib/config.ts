// Public, browser-safe configuration. The publishable key is designed to ship to browsers:
// every table is protected by row-level security, so it only grants what a signed-in user may see.
export const SUPABASE_URL =
  import.meta.env["VITE_SUPABASE_URL"] ?? "https://cnvdpddhihjhrglbodud.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ??
  "sb_publishable_R473osGhs2lXzptaqi5pVA_B3PpoQHK";

export const OWNER_NAME = "John Thomas";
