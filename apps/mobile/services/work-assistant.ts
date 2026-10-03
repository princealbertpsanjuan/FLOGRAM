import { apiRequest } from './api';

/*
 * AI assistant — Seller mode and Rider mode.
 * The chat history lives on the device; the server adds
 * live shop / delivery data to each question.
 */

export type WorkChatMessage = { role: 'user' | 'assistant'; content: string };

type Wrapped<T> = { success: boolean; message: string; data: T };

export const askWorkAssistant = async (message: string, history: WorkChatMessage[]) =>
  (
    await apiRequest<Wrapped<{ mode: 'seller' | 'rider'; reply: string }>>('/assistant/work/chat', {
      method: 'POST',
      authenticated: true,
      body: JSON.stringify({ message, history: history.slice(-12) }),
    })
  ).data;
