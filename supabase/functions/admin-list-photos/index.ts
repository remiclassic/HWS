// Recent user photos for moderation. Returns signed URLs so the admin UI can render thumbnails.
import { requireAdminCtx, jsonResponse } from "../_shared/admin.ts";

const SIGN_TTL_S = 60 * 30;

Deno.serve(async (req) => {
  try {
    if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
    const { admin } = await requireAdminCtx(req);
    const url = new URL(req.url);
    const limit = Math.min(100, Math.max(10, Number(url.searchParams.get("limit") ?? "30")));

    const { data, error } = await admin
      .from("user_car_photos")
      .select(
        `id, storage_path, mime_type, byte_size, created_at,
         user_cars!inner(
           id, user_id,
           canonical_cars!inner(casting_name, year)
         )`,
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return jsonResponse({ error: error.message }, 500);

    type Row = {
      id: string;
      storage_path: string;
      mime_type: string;
      byte_size: number;
      created_at: string;
      user_cars: {
        id: string;
        user_id: string;
        canonical_cars: { casting_name: string; year: number };
      };
    };

    const rows = (data ?? []) as unknown as Row[];
    const photos = await Promise.all(
      rows.map(async (r) => {
        const signed = await admin.storage
          .from("user-car-photos")
          .createSignedUrl(r.storage_path, SIGN_TTL_S);
        return {
          id: r.id,
          url: signed.data?.signedUrl ?? null,
          mime_type: r.mime_type,
          byte_size: r.byte_size,
          created_at: r.created_at,
          user_car_id: r.user_cars.id,
          user_id: r.user_cars.user_id,
          casting_name: r.user_cars.canonical_cars.casting_name,
          year: r.user_cars.canonical_cars.year,
        };
      }),
    );

    return jsonResponse({ photos });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
