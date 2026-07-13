import { z } from "zod";

export const submitProposalSchema = z.object({
  message: z
    .string()
    .trim()
    .min(10, "Proposal cover message must be at least 10 characters long.")
    .max(1000, "Proposal cover message must be at most 1000 characters long."),
  estimatedDays: z
    .number({ message: "Estimated days must be a number." })
    .int("Estimated days must be a whole number.")
    .positive("Estimated days must be greater than 0."),
  price: z
    .number({ message: "Price must be a number." })
    .int("Price must be a whole number.")
    .positive("Price must be greater than 0.")
    .optional(),
});

export const updateProposalSchema = submitProposalSchema.partial();
export type SubmitProposalInput = z.infer<typeof submitProposalSchema>;
export type UpdateProposalInput = z.infer<typeof updateProposalSchema>;
