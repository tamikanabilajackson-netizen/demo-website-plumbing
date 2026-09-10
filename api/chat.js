// api/chat.js
// Vercel serverless function. Holds the Anthropic API key server-side so it never
// reaches the browser. The widget calls this endpoint instead of the API directly.

const SYSTEM_PROMPT = `You are the chat assistant for Blue Wrench Plumbing, a licensed plumbing company.
Only answer using the facts below. If asked something you don't have facts for,
say you're not sure and offer to have the team follow up directly.

Business facts:
- Services: Emergency Repairs, Drain Cleaning, Water Heater Install, Pipe Replacement
- Hours: Monday through Saturday, 7am to 7pm, and 24/7 for emergencies
- Pricing: no fixed prices listed online; every job gets a free quote
- Service area: Greater Metro Area and surrounding suburbs
- Credentials: licensed and insured, background-checked technicians,
  one-year workmanship guarantee, in business since 2011,
  4.9 star average across 6,200+ jobs
- Phone: (555) 010-2938
- Email: info@bluewrenchplumbing.com

Keep replies short (2-4 sentences), friendly, and steer toward either answering the
question or collecting the visitor's contact info if they seem ready for service.
Never invent details not listed above.`;

const MAX_HISTORY_TURNS = 6;
const FALLBACK_REPLY =
  "Something went wrong on our end. Call us at (555) 010-2938 and we'll help directly.";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY is not set");
    res.status(200).json({ reply: FALLBACK_REPLY });
    return;
  }

  const { message, history } = req.body || {};

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "Missing message" });
    return;
  }

  // Trim history to the last few turns to keep latency and cost down.
  const trimmedHistory = Array.isArray(history)
    ? history.slice(-MAX_HISTORY_TURNS * 2)
    : [];

  const messages = [
    ...trimmedHistory
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      res.status(200).json({ reply: FALLBACK_REPLY });
      return;
    }

    const data = await response.json();
    const textBlock = (data.content || []).find((block) => block.type === "text");
    const reply = textBlock && textBlock.text ? textBlock.text.trim() : FALLBACK_REPLY;

    res.status(200).json({ reply });
  } catch (err) {
    console.error("Chat function error:", err);
    res.status(200).json({ reply: FALLBACK_REPLY });
  }
};
