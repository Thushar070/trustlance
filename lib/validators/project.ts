import { z } from "zod";
import { ALL_SKILLS } from "../constants/skills";
import { ProjectStatus } from "@prisma/client";

export const createProjectSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters long.")
    .max(100, "Title must be at most 100 characters long."),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters long.")
    .max(2000, "Description must be at most 2000 characters long."),
  budget: z
    .number({ message: "Budget must be a number." })
    .int("Budget must be a whole number.")
    .positive("Budget must be greater than 0."),
  deadline: z.coerce
    .date({ message: "Deadline is required." })
    .refine((date) => date > new Date(), {
      message: "Deadline must be in the future.",
    }),
  skills: z
    .array(z.string())
    .min(1, "At least one skill is required.")
    .refine(
      (skills) => skills.every((skill) => ALL_SKILLS.includes(skill)),
      {
        message: "One or more selected skills are invalid.",
      }
    ),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  status: z.nativeEnum(ProjectStatus).optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
