import { ChatAdapterOptions, StandardChatAdapter } from '@nlux/hf';
export { ChatAdapter, ChatAdapterBuilder, ChatAdapterOptions, DataTransferMode, HfInputPreProcessor, StandardChatAdapter, StreamingAdapterObserver, createChatAdapter, llama2InputPreProcessor, llama2OutputPreProcessor } from '@nlux/hf';

declare const useChatAdapter: <AiMsg = string>(options: ChatAdapterOptions<AiMsg>) => StandardChatAdapter<AiMsg>;

export { useChatAdapter };
