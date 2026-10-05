import { createServerFn } from "@tanstack/react-start";

// Default to provided sandbox avatar/context; can be overridden via env.
const DEFAULT_AVATAR_ID = "65f9e3c9-d48b-4118-b73a-4ae2e3cbb8f0";
// Legrand SPD Expert context (name: "legrand SPD")
const DEFAULT_CONTEXT_ID = "629abf57-6b2c-4be4-afda-078334a7a361";

export const createAvatarEmbed = createServerFn({ method: "POST" }).handler(
  async () => {
    const apiKey = process.env.LIVEAVATAR_API_KEY;
    if (!apiKey) {
      throw new Error("LIVEAVATAR_API_KEY is not configured");
    }

    const res = await fetch("https://api.liveavatar.com/v2/embeddings", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        avatar_id: process.env.LIVEAVATAR_AVATAR_ID ?? DEFAULT_AVATAR_ID,
        context_id: process.env.LIVEAVATAR_CONTEXT_ID ?? DEFAULT_CONTEXT_ID,
        is_sandbox: true,
        orientation: "vertical",
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("LiveAvatar embed failed", res.status, text);
      return {
        url: null as string | null,
        error: `LiveAvatar API ${res.status}: ${text.slice(0, 200)}`,
      };
    }

    const json = (await res.json()) as {
      data?: { url?: string; embed_id?: string };
    };
    return { url: json.data?.url ?? null, error: null as string | null };
  },
);
