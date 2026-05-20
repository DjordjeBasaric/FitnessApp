import { z } from "zod";

export const goalProgramTypeSchema = z.enum([
  "mršavljenje",
  "održavanje_težine",
  "nabacivanje_mišića",
  "rekompozicija",
]);

export type GoalProgramType = z.infer<typeof goalProgramTypeSchema>;

export const goalPlanSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  programType: goalProgramTypeSchema,
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  targetDailyKcal: z.number().positive().optional(),
  targetProteinG: z.number().nonnegative().optional(),
  targetCarbsG: z.number().nonnegative().optional(),
  targetFatG: z.number().nonnegative().optional(),
  /** Negativno = gubitak nedeljno (kg), pozitivno = nabacivanje */
  targetWeeklyWeightDeltaKg: z.number().optional(),
  createdAt: z.number(),
});

export type GoalPlan = z.infer<typeof goalPlanSchema>;
