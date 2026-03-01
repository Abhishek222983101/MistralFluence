import { Mistral } from "@mistralai/mistralai";

const MODEL = "mistral-large-latest";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionResult {
  content: string;
}

let mistralClient: Mistral | null = null;

function getMistralClient(): Mistral {
  if (!mistralClient) {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error("MISTRAL_API_KEY environment variable is missing");
    }
    mistralClient = new Mistral({ apiKey });
  }
  return mistralClient;
}

export async function chatCompletion(
  messages: Message[],
  opts?: { json?: boolean; webSearch?: boolean },
): Promise<ChatCompletionResult> {
  const mistral = getMistralClient();
  
  // Note: Mistral's API doesn't support OpenRouter's web search plugin directly in the same way,
  // but we can pass standard parameters. 
  
  try {
    const response = await mistral.chat.complete({
      model: MODEL,
      messages: messages as any,
      temperature: 0.7,
      ...(opts?.json ? { responseFormat: { type: "json_object" } } : {}),
    });

    const content = response.choices?.[0]?.message?.content;
    
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Mistral API returned empty response");
    }

    return { content: content.trim() };
  } catch (err: any) {
    throw new Error(`Mistral API Error: ${err.message || err}`);
  }
}
