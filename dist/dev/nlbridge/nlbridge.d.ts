import { AiContext, ChatAdapterBuilder as ChatAdapterBuilder$1, StandardChatAdapter, ContextAdapterBuilder as ContextAdapterBuilder$1, ContextAdapter } from '@nlux/core';
export { ChatAdapter, ContextAdapter, DataTransferMode, StandardChatAdapter, StreamingAdapterObserver } from '@nlux/core';

type ChatAdapterUsageMode = 'chat' | 'copilot';
type ChatAdapterOptions = {
    /**
     * The URL of the NLBridge endpoint.
     *
     */
    url: string;
    /**
     * Indicates the usage mode of the adapter
     *
     * - When set to 'copilot', the adapter will additionally check for tasks that can be executed and trigger them.
     * - In copilot mode, data cannot be streamed and will be fetched in one request instead.
     * - The copilot mode requires the presence of a context. If not provided, the adapter will use 'chat' mode.
     *
     * Default: 'chat'
     */
    mode?: ChatAdapterUsageMode;
    /**
     * The context ID to use when communicating with NLBridge.
     * Optional. If not provided, the adapter will not use a context.
     */
    context?: AiContext;
    /**
     * Additional headers to include in the request.
     */
    headers?: Record<string, string>;
};

interface ChatAdapterBuilder<AiMsg> extends ChatAdapterBuilder$1<AiMsg> {
    create(): StandardChatAdapter<AiMsg>;
    withContext(context: AiContext): ChatAdapterBuilder<AiMsg>;
    withHeaders(headers: Record<string, string>): ChatAdapterBuilder<AiMsg>;
    withMode(mode: ChatAdapterUsageMode): ChatAdapterBuilder<AiMsg>;
    withUrl(endpointUrl: string): ChatAdapterBuilder<AiMsg>;
}

declare const createChatAdapter: <AiMsg = string>() => ChatAdapterBuilder<AiMsg>;

interface ContextAdapterBuilder extends ContextAdapterBuilder$1 {
    build(): ContextAdapter;
    withHeaders(headers: Record<string, string>): ContextAdapterBuilder;
    withUrl(endpointUrl: string): ContextAdapterBuilder;
}

declare const createContextAdapter: () => ContextAdapterBuilder;

export { type ChatAdapterBuilder, type ChatAdapterOptions, type ChatAdapterUsageMode, type ContextAdapterBuilder, createChatAdapter, createContextAdapter };
