export type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

export function formatAssistantReply(data: {
  assistantMessage?: string;
  questions?: string[];
}): string {
  const parts: string[] = [];
  if (data.assistantMessage?.trim()) parts.push(data.assistantMessage.trim());
  const qs = (data.questions ?? []).map((q) => q.trim()).filter(Boolean);
  if (qs.length) {
    if (parts.length) parts.push("");
    if (qs.length === 1) parts.push(qs[0]!);
    else parts.push(qs.map((q, i) => `${i + 1}. ${q}`).join("\n"));
  }
  return parts.join("\n") || "Možeš li pojasniti?";
}
