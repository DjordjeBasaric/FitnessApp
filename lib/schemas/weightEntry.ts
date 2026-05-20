import { z } from "zod";

export const weightEntrySchema = z.object({
  id: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kg: z.number().positive().max(600),
  goalPlanId: z.string().optional(),
  createdAt: z.number(),
});

export type WeightEntry = z.infer<typeof weightEntrySchema>;
