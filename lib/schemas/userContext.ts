import { z } from "zod";

export const userContextSchema = z.object({
  id: z.literal("me"),
  allergiesOrAvoid: z.string().optional(),
  dietaryNote: z.string().optional(),
  ageYears: z.number().int().positive().max(120).optional(),
  sex: z.enum(["muški", "ženski", "ne navodim"]).optional(),
  heightCm: z.number().positive().max(300).optional(),
  sportNote: z.string().optional(),
});

export type UserContext = z.infer<typeof userContextSchema>;

export const defaultUserContext: UserContext = {
  id: "me",
};
