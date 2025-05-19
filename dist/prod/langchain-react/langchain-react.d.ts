import { ChatAdapterOptions, StandardChatAdapter } from '@nlux/langchain';
export { ChatAdapter, ChatAdapterBuilder, ChatAdapterOptions, DataTransferMode, LangServeConfig, LangServeConfigItem, LangServeEndpointType, LangServeHeaders, StandardChatAdapter, StreamingAdapterObserver, createChatAdapter } from '@nlux/langchain';

declare const useChatAdapter: <AiMsg = string>(options: ChatAdapterOptions<AiMsg>) => StandardChatAdapter<AiMsg>;

export { useChatAdapter };
