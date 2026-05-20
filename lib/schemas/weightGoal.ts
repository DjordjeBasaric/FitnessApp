import { z } from "zod";

export const activityLevelSchema = z.enum([
  "sedentaran",
  "lagan",
  "umjeren",
  "aktivan",
  "vrlo_aktivan",
]);

export const weightGoalSexSchema = z.enum(["muski", "zenski"]);

export const weightGoalSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startKg: z.number().positive().max(600),
  targetKg: z.number().positive().max(600),
  sex: weightGoalSexSchema.optional(),
  ageYears: z.number().int().min(14).max(100).optional(),
  heightCm: z.number().positive().max(250).optional(),
  activityLevel: activityLevelSchema.optional(),
});

export type WeightGoal = z.infer<typeof weightGoalSchema>;
export type ActivityLevel = z.infer<typeof activityLevelSchema>;
