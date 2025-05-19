export { ChatAdapter, ChatAdapterBuilder, ChatAdapterOptions, ContextAdapter, ContextAdapterBuilder, DataTransferMode, StandardChatAdapter, StreamingAdapterObserver, createChatAdapter, createContextAdapter } from '@nlux/nlbridge';
import { AiContext, StandardChatAdapter } from '@nlux/react';

type ReactChatAdapterOptions = {
    url: string;
    mode?: 'chat' | 'copilot';
    context?: AiContext;
    headers?: Record<string, string>;
};
declare const useChatAdapter: <AiMsg = string>(options: ReactChatAdapterOptions) => StandardChatAdapter<AiMsg>;

export { type ReactChatAdapterOptions, useChatAdapter };
