import { ChatAdapterOptions, StandardChatAdapter } from '@nlux/bedrock';
export { ChatAdapter, ChatAdapterBuilder, ChatAdapterOptions, DataTransferMode, StandardChatAdapter, StreamingAdapterObserver } from '@nlux/bedrock';

declare const useChatAdapter: <AiMsg = string>(options: ChatAdapterOptions) => StandardChatAdapter<AiMsg>;

export { useChatAdapter };
