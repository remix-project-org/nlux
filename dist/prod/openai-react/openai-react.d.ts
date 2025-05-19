import { ChatAdapterOptions, StandardChatAdapter } from '@nlux/openai';
export { ChatAdapter, ChatAdapterBuilder, ChatAdapterOptions, DataTransferMode, OpenAiModel, StandardChatAdapter, StreamingAdapterObserver, createUnsafeChatAdapter } from '@nlux/openai';

declare const useUnsafeChatAdapter: <AiMsg>(options: ChatAdapterOptions) => StandardChatAdapter<AiMsg>;

export { useUnsafeChatAdapter };
