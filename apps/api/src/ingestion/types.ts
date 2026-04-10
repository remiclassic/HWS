/**
 * Source plugins normalize external records into canonical-shaped rows.
 * Do not implement scrapers that violate site ToS — use permitted feeds / manual CSV / APIs only.
 */
export type SourcePluginId = string;

export interface NormalizedCarInput {
  casting_name: string;
  year: number;
  series?: string | null;
  line_type:
    | "Mainline"
    | "Premium"
    | "RLC"
    | "TeamTransport"
    | "Entertainment"
    | "Other";
  treasure_hunt_type: "None" | "TH" | "STH";
  description?: string | null;
  model_number?: string | null;
  case_code?: string | null;
  sku?: string | null;
  sourceRegistryId: string;
  /** Attribution rows to insert alongside the car */
  attributions?: {
    field_path: string;
    value?: string | null;
    confidence_score: number;
    is_rumor: boolean;
    cited_url?: string | null;
  }[];
  variations?: {
    wheels?: string | null;
    deco?: string | null;
    region?: string | null;
    notes?: string | null;
  }[];
  images?: {
    official_image_url: string;
    attribution_note?: string | null;
  }[];
}

export interface SourceIngestionAdapter {
  readonly id: SourcePluginId;
  readonly displayName: string;
  /** Called by jobs or manual import after your own compliant fetch step */
  normalizeRecord(raw: unknown): NormalizedCarInput;
}
