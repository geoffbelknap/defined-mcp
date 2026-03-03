import { z } from "zod";

const ConfigSchema = z.object({
  DEFINED_API_KEY: z.string().min(1, "DEFINED_API_KEY is required"),
  DEFINED_API_URL: z.string().url().default("https://api.defined.net"),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  return ConfigSchema.parse(process.env);
}
