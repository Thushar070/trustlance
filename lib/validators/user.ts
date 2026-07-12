import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().max(50, "Name must not exceed 50 characters.").optional().or(z.literal("")),
  phone: z
    .string()
    .regex(/^\+?[0-9\s\-()]{7,20}$/, "Invalid phone number format.")
    .optional()
    .or(z.literal("")),
  location: z.string().max(100, "Location must not exceed 100 characters.").optional().or(z.literal("")),
  businessName: z.string().max(100, "Business name must not exceed 100 characters.").optional().or(z.literal("")),
  bio: z.string().max(500, "Bio must not exceed 500 characters.").optional().or(z.literal("")),
});

export const completeClientProfileSchema = z.object({
  name: z.string().min(1, "Name is required.").max(50, "Name must not exceed 50 characters."),
  phone: z
    .string()
    .regex(/^\+?[0-9\s\-()]{7,20}$/, "Invalid phone number format."),
  location: z.string().min(1, "Location is required.").max(100, "Location must not exceed 100 characters."),
  businessName: z.string().min(1, "Business name is required.").max(100, "Business name must not exceed 100 characters."),
});

export const completeFreelancerProfileSchema = z.object({
  name: z.string().min(1, "Name is required.").max(50, "Name must not exceed 50 characters."),
  phone: z
    .string()
    .regex(/^\+?[0-9\s\-()]{7,20}$/, "Invalid phone number format."),
  location: z.string().min(1, "Location is required.").max(100, "Location must not exceed 100 characters."),
  bio: z.string().min(10, "Bio must be at least 10 characters.").max(500, "Bio must not exceed 500 characters."),
});
