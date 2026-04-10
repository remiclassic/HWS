import { z } from "zod";

export const sourceTypeSchema = z.enum(["official", "community"]);
export type SourceType = z.infer<typeof sourceTypeSchema>;

export const lineTypeSchema = z.enum([
  "Mainline",
  "Premium",
  "RLC",
  "TeamTransport",
  "Entertainment",
  "Other",
]);
export type LineType = z.infer<typeof lineTypeSchema>;

export const treasureHuntTypeSchema = z.enum(["None", "TH", "STH"]);
export type TreasureHuntType = z.infer<typeof treasureHuntTypeSchema>;

export const carIdentifiersSchema = z.object({
  model_number: z.string().nullable().optional(),
  case_code: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
});
export type CarIdentifiers = z.infer<typeof carIdentifiersSchema>;

export const sourceRefSchema = z.object({
  source_id: z.string().uuid(),
  source_name: z.string(),
  source_type: sourceTypeSchema,
  source_url: z.string().nullable(),
  confidence_score: z.number().min(0).max(1),
  is_rumor: z.boolean(),
  field_path: z.string(),
  value: z.string().nullable(),
});
export type SourceRef = z.infer<typeof sourceRefSchema>;

export const carVariationSchema = z.object({
  id: z.string().uuid(),
  wheels: z.string().nullable(),
  deco: z.string().nullable(),
  region: z.string().nullable(),
  notes: z.string().nullable(),
});
export type CarVariationDto = z.infer<typeof carVariationSchema>;

export const carImageSchema = z.object({
  id: z.string().uuid(),
  official_image_url: z.string(),
  attribution_note: z.string().nullable(),
});
export type CarImageDto = z.infer<typeof carImageSchema>;

export const carListItemSchema = z.object({
  id: z.string().uuid(),
  casting_name: z.string(),
  year: z.number().int(),
  series: z.string().nullable(),
  line_type: lineTypeSchema,
  treasure_hunt_type: treasureHuntTypeSchema,
  confidence_score: z.number().min(0).max(1),
  /** First catalog image URL when present (demo / reference art). */
  primary_image_url: z.string().url().nullable(),
});
export type CarListItemDto = z.infer<typeof carListItemSchema>;

export const carDetailSchema = carListItemSchema.extend({
  description: z.string().nullable(),
  identifiers: carIdentifiersSchema,
  known_variations: z.array(carVariationSchema),
  images: z.array(carImageSchema),
  attributions: z.array(sourceRefSchema),
  community_notes: z.array(
    z.object({
      id: z.string().uuid(),
      body: z.string(),
      source_name: z.string(),
      is_official: z.boolean(),
    }),
  ),
  last_verified_at: z.string().datetime().nullable(),
  th_explanation: z
    .object({
      summary: z.string(),
      markers: z.array(z.string()),
    })
    .nullable(),
});
export type CarDetailDto = z.infer<typeof carDetailSchema>;

export const carsQuerySchema = z.object({
  q: z.string().optional(),
  year: z.coerce.number().int().optional(),
  series: z.string().optional(),
  line_type: lineTypeSchema.optional(),
  treasure_hunt_type: treasureHuntTypeSchema.optional(),
  sku: z.string().optional(),
  model_number: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type CarsQuery = z.infer<typeof carsQuerySchema>;

export const carsListResponseSchema = z.object({
  items: z.array(carListItemSchema),
  total: z.number().int().nonnegative(),
});
export type CarsListResponse = z.infer<typeof carsListResponseSchema>;

export const userCarStatusSchema = z.enum(["Owned", "Want", "Duplicate"]);
export type UserCarStatus = z.infer<typeof userCarStatusSchema>;

export const userCarConditionSchema = z.enum(["Carded", "Loose", "Custom"]);
export type UserCarCondition = z.infer<typeof userCarConditionSchema>;

export const userCarPhotoSchema = z.object({
  id: z.string().uuid(),
  url: z.string(),
  created_at: z.string().datetime(),
});
export type UserCarPhotoDto = z.infer<typeof userCarPhotoSchema>;

export const userCarSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  car_id: z.string().uuid(),
  status: userCarStatusSchema,
  condition: userCarConditionSchema,
  quantity: z.number().int().positive(),
  notes: z.string().nullable(),
  date_added: z.string().datetime(),
  car: carListItemSchema.optional(),
  photos: z.array(userCarPhotoSchema).default([]),
});
export type UserCarDto = z.infer<typeof userCarSchema>;

export const createUserCarBodySchema = z.object({
  car_id: z.string().uuid(),
  status: userCarStatusSchema.default("Owned"),
  condition: userCarConditionSchema.default("Carded"),
  quantity: z.number().int().positive().default(1),
  notes: z.string().nullable().optional(),
});
export type CreateUserCarBody = z.infer<typeof createUserCarBodySchema>;

export const patchUserCarBodySchema = z.object({
  status: userCarStatusSchema.optional(),
  condition: userCarConditionSchema.optional(),
  quantity: z.number().int().positive().optional(),
  notes: z.string().nullable().optional(),
});
export type PatchUserCarBody = z.infer<typeof patchUserCarBodySchema>;

export const authTokenResponseSchema = z.object({
  token: z.string(),
  user_id: z.string().uuid(),
});
export type AuthTokenResponse = z.infer<typeof authTokenResponseSchema>;

export const authEmailPasswordBodySchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});
export type AuthEmailPasswordBody = z.infer<typeof authEmailPasswordBodySchema>;

export const meAccountResponseSchema = z.object({
  email: z.string().email().nullable(),
});
export type MeAccountResponse = z.infer<typeof meAccountResponseSchema>;

export const meExportResponseSchema = z.object({
  exported_at: z.string().datetime(),
  email: z.string().email().nullable(),
  notify_want_updates: z.boolean(),
  garage_items: z.array(userCarSchema),
});
export type MeExportResponse = z.infer<typeof meExportResponseSchema>;

export const createCarDataReportBodySchema = z.object({
  message: z.string().min(1).max(4000),
  field_path: z.string().max(128).nullable().optional(),
});
export type CreateCarDataReportBody = z.infer<typeof createCarDataReportBodySchema>;

export const registerPushTokenBodySchema = z.object({
  expo_push_token: z.string().min(1).max(512),
  platform: z.enum(["ios", "android", "web"]),
});
export type RegisterPushTokenBody = z.infer<typeof registerPushTokenBodySchema>;

export const patchNotificationPrefsBodySchema = z.object({
  notify_want_updates: z.boolean(),
});
export type PatchNotificationPrefsBody = z.infer<typeof patchNotificationPrefsBodySchema>;

export const meSettingsResponseSchema = z.object({
  notify_want_updates: z.boolean(),
});
export type MeSettingsResponse = z.infer<typeof meSettingsResponseSchema>;

export const garagePhotoUploadResponseSchema = z.object({
  photo: userCarPhotoSchema,
});
export type GaragePhotoUploadResponse = z.infer<typeof garagePhotoUploadResponseSchema>;
