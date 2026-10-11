// Awards XP for a barcode scan. Runs with service-role so users cannot edit their own totals.
// Streak logic: +1 if last_active_date == today, reset to 1 if gap > 1 day.
import { requireAuthCtx, jsonResponse } from "../_shared/auth.ts";

const XP_PER_SCAN = 5;

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
    const { userId, admin } = await requireAuthCtx(req);

    const today = new Date().toISOString().slice(0, 10);

    const { data: current, error: readErr } = await admin
      .from("user_gamification")
      .select("total_xp, current_streak, longest_streak, barcode_scan_count, last_active_date")
      .eq("user_id", userId)
      .single();
    if (readErr || !current) return jsonResponse({ error: readErr?.message ?? "no row" }, 500);

    let nextStreak = 1;
    if (current.last_active_date) {
      const last = new Date(`${current.last_active_date}T00:00:00Z`).getTime();
      const now = new Date(`${today}T00:00:00Z`).getTime();
      const dayDiff = Math.round((now - last) / 86_400_000);
      if (dayDiff === 0) nextStreak = current.current_streak;
      else if (dayDiff === 1) nextStreak = current.current_streak + 1;
      // else nextStreak stays at 1 (reset)
    }

    const { error: updErr } = await admin
      .from("user_gamification")
      .update({
        total_xp: current.total_xp + XP_PER_SCAN,
        current_streak: nextStreak,
        longest_streak: Math.max(current.longest_streak, nextStreak),
        barcode_scan_count: current.barcode_scan_count + 1,
        last_active_date: today,
      })
      .eq("user_id", userId);
    if (updErr) return jsonResponse({ error: updErr.message }, 500);

    return jsonResponse({ awarded_xp: XP_PER_SCAN, streak: nextStreak });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
