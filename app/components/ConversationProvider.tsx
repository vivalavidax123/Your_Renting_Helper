"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { WeightProfile } from "../lib/categories";
import { readApiResult, readTextStream } from "../lib/api";

type Message = { id: string; role: "user" | "assistant"; content: string; profile: WeightProfile; interrupted?: boolean };
type Conversation = { messages: Message[]; question: string };
const empty: Conversation = { messages: [], question: "" };
const Context = createContext<{
  conversations: Record<string, Conversation>;
  update: (key: string, action: (value: Conversation) => Conversation) => void;
} | null>(null);
export function ConversationProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Record<string, Conversation>>({});
  const update = useCallback((key: string, action: (value: Conversation) => Conversation) => {
    setConversations(current => ({ ...current, [key]: action(current[key] ?? empty) }));
  }, []);
  return <Context.Provider value={{ conversations, update }}>{children}</Context.Provider>;
}

export function useConversation(key: string, endpoint: string, profile: WeightProfile, available: boolean, propertyIds?: string[]) {
  const context = useContext(Context);
  if (!context) throw new Error("ConversationProvider is required.");
  const { conversations, update } = context;
  const { messages, question } = conversations[key] ?? empty;
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");
  const active = useRef<{ controller: AbortController; id: string } | null>(null);
  useEffect(() => () => {
    const request = active.current;
    if (request) {
      request.controller.abort(); active.current = null;
      update(key, current => ({ ...current, messages: current.messages.map(message =>
        message.id === request.id ? { ...message, interrupted: true } : message) }));
    }
  }, [key, update]);
  function setQuestion(question: string) { update(key, current => ({ ...current, question })); }
  function clearConversation() {
    active.current?.controller.abort(); active.current = null;
    update(key, () => empty); setStatus("idle"); setError("");
  }
  async function askQuestion(raw: string) {
    const text = raw.trim();
    if (!available || !text || active.current) return;
    const controller = new AbortController(), id = crypto.randomUUID();
    active.current = { controller, id }; setStatus("loading"); setError("");
    update(key, current => ({ question: "", messages: [...current.messages,
      { id: crypto.randomUUID(), role: "user", content: text, profile },
      { id, role: "assistant", content: "", profile }] }));
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, profile, ...(propertyIds ? { propertyIds } : {}) }), signal: controller.signal });
      if (!response.ok) {
        const data = await readApiResult<Record<string, never>>(response, () => true);
        throw new Error(data.ok ? "Could not answer this question." : data.error);
      }
      await readTextStream(response, content => {
        if (controller.signal.aborted) return;
        update(key, current => ({ ...current, messages: current.messages.map(message => message.id === id ? { ...message, content } : message) }));
      });
    } catch (error) {
      if (!controller.signal.aborted) {
        setError(error instanceof Error ? error.message : "The analyst could not be reached. Please retry.");
        update(key, current => ({ ...current, messages: current.messages.map(message => message.id === id ? { ...message, interrupted: true } : message) }));
      }
    } finally {
      if (active.current?.id === id) { active.current = null; setStatus("idle"); }
    }
  }
  return { messages, question, setQuestion, status, error, askQuestion, clearConversation };
}
