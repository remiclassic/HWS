// Public client config: the local Supabase stack on localhost, the hosted "spotter" project everywhere
// else. Both keys are publishable (anon) keys: RLS on waitlist_signups allows
// insert only, so they are safe to ship. Never put a service-role key here.
(function () {
  var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  window.SPOTTER_CONFIG = local
    ? { supabaseUrl: "http://127.0.0.1:54321", supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" } // `supabase start` defaults
    : { supabaseUrl: "https://rdcftqolzmwxwolbqdaq.supabase.co", supabaseAnonKey: "sb_publishable_9XidtckkMYhCRM-06xkvyQ_bWWiLo0l" };
})();
