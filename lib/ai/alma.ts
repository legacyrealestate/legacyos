import OpenAI from "openai";
import { ApiError } from "@/lib/security/api";
import { openAIModel } from "@/lib/config/env";

function client() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new ApiError("service_unavailable", "OPENAI_API_KEY is not configured.");
  return new OpenAI({ apiKey });
}

export async function generateAlmaResponse(input: {
  message: string;
  context: Record<string, unknown>;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}) {
  const response = await client().responses.create({
    model: openAIModel(),
    input: [
      {
        role: "system",
        content:
          "You are ALMA, Legacy Nashville's operations copilot. Use only the supplied live workspace context. " +
          "Answer naturally and directly, as a capable chat assistant, while staying grounded in the supplied records. Identify emergencies first, distinguish facts from recommendations, and never claim an action was completed unless the context proves it. " +
          "Do not expose secrets or internal IDs. For life-safety issues, tell staff to follow their established emergency procedure immediately. " +
          "You may summarize calls, maintenance, contacts, vendors, email, and approved Knowledge Drop sources. Cite every factual record or document statement with the matching supplied label in [Source: label] form. " +
          "If the answer is not supported by the context, say that clearly and suggest the next staff review step. You cannot dispatch emergency services, send communications, or change CRM records from chat.",
      },
      ...(input.history || []).slice(-8),
      {
        role: "user",
        content: `${input.message}\n\nLIVE WORKSPACE CONTEXT:\n${JSON.stringify(input.context)}`,
      },
    ],
  });

  const text = response.output_text?.trim();
  if (!text) throw new ApiError("server_error", "ALMA returned an empty response.");
  return { text, model: openAIModel(), responseId: response.id };
}

export async function generateEmailDraft(input: {
  subject: string;
  body: string;
  contactName?: string | null;
  property?: string | null;
}) {
  const response = await client().responses.create({
    model: openAIModel(),
    input: [
      {
        role: "system",
        content:
          "Draft a concise, professional property-management email reply for Legacy Nashville. Acknowledge the message, state the next safe step, " +
          "avoid promising a specific time or outcome that was not provided, never give legal advice, and never state that emergency services or a vendor were dispatched. " +
          "Return only the email body, with no subject line or analysis.",
      },
      {
        role: "user",
        content: JSON.stringify(input),
      },
    ],
  });
  const text = response.output_text?.trim();
  if (!text) throw new ApiError("server_error", "ALMA returned an empty email draft.");
  return text;
}
