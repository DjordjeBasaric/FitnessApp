import { z } from "zod";

export const nutritionConfidenceSchema = z.enum(["high", "medium", "low"]);

/** Obrok u toku dana — AI i UI agregiraju po ovim slotovima. */
export const mealSlotSchema = z.enum(["dorucak", "rucak", "vecera", "uzina"]);
export type MealSlot = z.infer<typeof mealSlotSchema>;

export const foodItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  mealSlot: mealSlotSchema.optional(),
  kcal: z.number(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
  fiberG: z.number().optional(),
  sodiumMg: z.number().optional(),
  nutritionConfidence: nutritionConfidenceSchema,
  nutritionNote: z.string().optional(),
});

export const cardioSessionSchema = z.object({
  id: z.string(),
  kind: z.string(),
  minutes: z.number().nonnegative().optional(),
  distanceKm: z.number().nonnegative().optional(),
  intensity: z.string().optional(),
  /** Procijenjeno sagorijevanje (AI ili heuristika) */
  estimatedKcalBurned: z.number().nonnegative().optional(),
});

export const strengthBlockSchema = z.object({
  id: z.string(),
  muscleGroup: z.string(),
  details: z.string(),
  estimatedKcalBurned: z.number().nonnegative().optional(),
});

export const dailyLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  foodItems: z.array(foodItemSchema),
  cardioSessions: z.array(cardioSessionSchema),
  strengthBlocks: z.array(strengthBlockSchema),
  dayNote: z.string().optional(),
  updatedAt: z.number(),
});

export type FoodItem = z.infer<typeof foodItemSchema>;
export type CardioSession = z.infer<typeof cardioSessionSchema>;
export type StrengthBlock = z.infer<typeof strengthBlockSchema>;
export type DailyLog = z.infer<typeof dailyLogSchema>;

/** Stavke koje model vraća; id opciono za correct_items (referenca na postojeću stavku). */
export const foodItemFromAISchema = foodItemSchema.omit({ id: true }).extend({
  id: z.string().optional(),
});
export const cardioFromAISchema = cardioSessionSchema.omit({ id: true });
export const strengthFromAISchema = strengthBlockSchema.omit({ id: true });

export const dailyPatchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mergeMode: z.enum(["append", "replace_day", "correct_items"]),
  /** Ukloni sve stavke u navedenom obroku (npr. duplikat ručka). */
  removeMealSlots: z.array(mealSlotSchema).optional(),
  foodItems: z.array(foodItemFromAISchema).optional(),
  cardioSessions: z.array(cardioFromAISchema).optional(),
  strengthBlocks: z.array(strengthFromAISchema).optional(),
  dayNote: z.string().optional().nullable(),
});

export type DailyPatch = z.infer<typeof dailyPatchSchema>;
