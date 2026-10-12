// Public client config. Both keys are publishable (anon) keys: RLS on waitlist_signups allows
// insert only, so they are safe to ship. Never put a service-role key here.
(function () {
  var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  window.SPOTTER_CONFIG = local
    ? { supabaseUrl: "http://127.0.0.1:54321", supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" } // `supabase start` defaults
    : { supabaseUrl: "https://gvlnnjcdqpxqyouwypyq.supabase.co", supabaseAnonKey: "sb_publishable_IDL4VIURGr0sOZwpHXVZJw_WeI6xm0N" }; // same values as .env.production.example
})();
