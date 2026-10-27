// The pages in content/<lang>/, where contributors and the translations repository keep them.
// The news index and its posts live under content/<lang>/blog/.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const pages = defineCollection({
  loader: glob({ base: './content', pattern: ['*/*.md', '*/blog/*.md', '*/guides/*.md', '*/network/*.md', '*/firmware/*.md'] }),
  schema: z.object({
    title: z.string(),
    lead: z.string().optional(),
    description: z.string().optional(),
    eyebrow: z.string().optional(),
    layout: z.string().optional(),
    date: z.coerce.date().optional(),
    translation: z.object({
      status: z.string().optional(),
      source_hash: z.string().optional(),
      seeded: z.coerce.string().optional(),
    }).optional(),
  }).passthrough(),
});

export const collections = { pages };
