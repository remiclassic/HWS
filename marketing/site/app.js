// Waitlist form → Supabase REST (public.waitlist_signups, insert-only via RLS). See config.js.
(function () {
  "use strict";
  var cfg = window.SPOTTER_CONFIG || {};
  var DONE_KEY = "spotter_waitlist_joined";
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  var forms = Array.prototype.slice.call(document.querySelectorAll("form.waitlist"));

  function remember() { try { localStorage.setItem(DONE_KEY, "1"); } catch (e) { /* private mode */ } }
  function alreadyJoined() { try { return localStorage.getItem(DONE_KEY) === "1"; } catch (e) { return false; } }

  function markDone(message) {
    forms.forEach(function (f) {
      f.classList.add("done");
      var s = f.querySelector(".status");
      s.classList.remove("error");
      s.textContent = message;
    });
  }

  function fail(form, message) {
    var s = form.querySelector(".status");
    s.classList.add("error");
    s.textContent = message;
  }

  function submit(form) {
    var input = form.querySelector('input[name="email"]');
    var button = form.querySelector("button");
    var email = input.value.trim();
    var picked = form.querySelector('input[type="radio"]:checked');
    form.querySelector(".status").textContent = "";

    // Honeypot: bots fill every field. Pretend it worked.
    if (form.querySelector(".hp").value) return markDone("You're on the list.");
    if (!EMAIL_RE.test(email) || email.length > 254) { input.focus(); return fail(form, "That doesn't look like an email address."); }
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return fail(form, "The waitlist isn't connected yet. Please try again soon.");

    button.disabled = true;
    fetch(cfg.supabaseUrl + "/rest/v1/waitlist_signups", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: cfg.supabaseAnonKey,
        Authorization: "Bearer " + cfg.supabaseAnonKey,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ email: email, platform: picked ? picked.value : "any", source: form.dataset.source || "site" }),
    })
      .then(function (res) {
        if (res.status === 201) { remember(); return markDone("You're on the list. We'll email you the day Spotter launches."); }
        // 409 = unique violation on lower(email): they signed up before.
        if (res.status === 409) { remember(); return markDone("You're already on the list. See you at launch."); }
        if (res.status === 400) return fail(form, "That doesn't look like an email address.");
        fail(form, "Couldn't save that just now. Please try again in a minute.");
      })
      .catch(function () { fail(form, "Couldn't reach the waitlist. Check your connection and try again."); })
      .then(function () { button.disabled = false; });
  }

  forms.forEach(function (form) {
    form.addEventListener("submit", function (e) { e.preventDefault(); submit(form); });
  });
  if (alreadyJoined()) markDone("You're on the list. We'll email you the day Spotter launches.");

  // Scroll reveal
  if ("IntersectionObserver" in window) {
    document.documentElement.classList.add("js");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -10% 0px" });
    document.querySelectorAll(".feature, .trailer, .faq details").forEach(function (el) { el.classList.add("reveal"); io.observe(el); });
  }
})();
