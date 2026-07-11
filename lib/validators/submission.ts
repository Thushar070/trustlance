import { z } from "zod";

// Sensible defaults: max 50MB
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

export const ALLOWED_CONTENT_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/gzip",
  "application/x-gzip",
  "application/x-tar",
];

export const ALLOWED_EXTENSIONS = [
  ".zip",
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".docx",
  ".tar.gz",
  ".tgz",
];

export const presignRequestSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  contentType: z.string().min(1, "Content type is required").refine(
    (val) => ALLOWED_CONTENT_TYPES.includes(val.toLowerCase()),
    { message: "File type is not allowed." }
  ),
  fileSize: z.number().max(MAX_FILE_SIZE, "File size must not exceed 50MB"),
});

export const createSubmissionSchema = z
  .object({
    fileUrl: z.string().url("Invalid file URL").optional().or(z.literal("")),
    githubLink: z.string().url("Invalid GitHub link").optional().or(z.literal("")),
    demoLink: z.string().url("Invalid demo link").optional().or(z.literal("")),
    notes: z.string().max(2000, "Notes must be under 2000 characters").optional().or(z.literal("")),
  })
  .refine(
    (data) => data.fileUrl || data.githubLink || data.demoLink,
    {
      message: "At least one of File, GitHub link, or Demo link must be provided.",
      path: ["fileUrl"],
    }
  );

export type PresignRequestInput = z.infer<typeof presignRequestSchema>;
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
