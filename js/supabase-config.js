// bit cafe: database wiring
// -----------------------------------------------------------------
// the chatroom, guestbook, notice board, and the webring's "request a
// spot" form are REAL: other visitors' messages, entries, and requests
// actually show up here. that only works once this file points at a
// real (free) Supabase project.
//
// until you fill this in, every page that needs it detects the
// placeholder values below and shows an honest "not connected yet"
// notice instead of a broken page. see README.md, section
// "connecting the till" for the five-minute setup.
//
// this file is loaded straight in the browser (no build step), so
// yes, these values are public: that is normal and expected for a
// client-side Supabase config. the anon key is *meant* to be public --
// what actually protects the data is the row-level security policies
// in supabase/schema.sql, not secrecy of these values.

export const supabaseConfig = {
  url: "https://vvudctsjcruuytmwnajk.supabase.co",
  anonKey: "sb_publishable_kJwFibyIZYs4hx6ReXb84g_9g6sdyq6",
};

export function isConfigured(config) {
  return Object.values(config).every(function (v) {
    return typeof v === "string" && v.indexOf("PASTE_YOUR") === -1;
  });
}
