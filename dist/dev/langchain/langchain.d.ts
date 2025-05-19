import { ChatItem, ChatAdapterBuilder as ChatAdapterBuilder$1, StandardChatAdapter, DataTransferMode } from '@nlux/core';
export { ChatAdapter, DataTransferMode, StandardChatAdapter, StreamingAdapterObserver } from '@nlux/core';

/**
 * A function that can be used to pre-process the input before sending it to the runnable.
 * Whatever this function returns will be sent to the runnable under the "input" property.
 *
 * Example:
 * If your runnable expects an object with a "message" property and a "year" property, you can
 * enrich the user input with the "year" property by using the following input pre-processor:
 *
 * For the following input processor:
 * ```
 * (message) => ({ message, year: 1999 })
 *  ```
 *  The following input will be sent to the runnable when the user
 *  types "Hello world":
 *  ```
 *  {
 *    input: {
 *      message: 'Hello world',
 *      year: 1999,
 *    }
 *  }
 *  ```
 */
type LangServeInputPreProcessor<AiMsg> = (input: string, conversationHistory?: ChatItem<AiMsg>[]) => unknown;

type LangServeEndpointType = 'invoke' | 'stream';
type LangServeHeaders = Record<string, string>;
type LangServeConfigItem = string | number | boolean | {
    [key: string]: LangServeConfigItem;
} | LangServeConfigItem[];
type LangServeConfig = {
    [key: string]: LangServeConfigItem;
};

/**
 * A function that can be used to pre-process the output before sending it to the user.
 * The `output` parameter of this function will get the part of the response from the runnable
 * returned under the "output" property.
 *
 * This output is typically a JSON object containing the "content" property which
 * is often the actual response that the runnable wants to send to the user.
 * But it can also contain other properties, such as "metadata", or it can be a string.
 *
 * You check your runnable's documentation to see what it returns before you write this function.
 * This function should return a string that will be displayed to the user.
 */
type LangServeOutputPreProcessor<AiMsg> = (output: unknown) => AiMsg;

interface ChatAdapterBuilder<AiMsg> extends ChatAdapterBuilder$1<AiMsg> {
    create(): StandardChatAdapter<AiMsg>;
    withConfig(langServeConfig: LangServeConfig): ChatAdapterBuilder<AiMsg>;
    withDataTransferMode(mode: DataTransferMode): ChatAdapterBuilder<AiMsg>;
    withHeaders(headers: LangServeHeaders): ChatAdapterBuilder<AiMsg>;
    withInputPreProcessor(inputPreProcessor: LangServeInputPreProcessor<AiMsg>): ChatAdapterBuilder<AiMsg>;
    withInputSchema(useInputSchema: boolean): ChatAdapterBuilder<AiMsg>;
    withOutputPreProcessor(outputPreProcessor: LangServeOutputPreProcessor<AiMsg>): ChatAdapterBuilder<AiMsg>;
    withUrl(runnableUrl: string): ChatAdapterBuilder<AiMsg>;
}

type ChatAdapterOptions<AiMsg> = {
    /**
     * The URL of the LangServe runnable.
     *
     * You can either provide the path to the langserve runnable without the specific action
     * to perform. Example: https://api.example.com/v1/my_runnable
     *
     * Or you can provide the URL to the specific endpoint, with either `invoke` or `stream`
     * at the end of the URL. Example: https://api.example.com/v1/my_runnable/stream
     *
     */
    url: string;
    /**
     * The data transfer mode to use when communicating with the LangServe runnable.
     * If not provided, the `url` will be checked to see if it contains the action
     * to perform (either `/invoke` or `/stream`). If the action is not provided, the default
     * data transfer mode will be `stream`. If the action is provided, the data transfer mode
     * should match the action (either `batch` mode for `/invoke` or `stream` mode for `/stream`).
     */
    dataTransferMode?: DataTransferMode;
    /**
     * This contains the headers that implementers can use to send additional data such as authentication headers.
     */
    headers?: LangServeHeaders;
    /**
     * The configuration object that will be sent to the LangServe runnable.
     */
    config?: LangServeConfig;
    /**
     * A function to preprocess the user input before sending it to the LangServe runnable.
     * If this option is not provided, the adapter will attempt to call `input_schema` endpoint on
     * the LangServe runnable and build the input according to the schema.
     *
     * If no schema is available, or if the schema is non-decisive (example: complex schema where
     * no attribute can be matched to the user message), the adapter will send the user message
     * as a string.
     */
    inputPreProcessor?: LangServeInputPreProcessor<AiMsg>;
    /**
     * When no `inputPreProcessor` is provided, the adapter will attempt to call `input_schema`
     * endpoint on the LangServe runnable and build the input according to the schema.
     * Set this option to `false` to disable this behavior.
     *
     * Default: `true`
     */
    useInputSchema?: boolean;
    /**
     * A function to preprocess the LangServe runnable output before returning it to the user.
     * If this option is not provided, the adapter will attempt to call `output_schema` endpoint on
     * the LangServe runnable and build the output according to the schema.
     *
     * If no schema is available, or if the schema is non-decisive (example: complex schema where
     * no attribute can be matched to expected output), the adapter will return the LangServe runnable
     * output as a string.
     */
    outputPreProcessor?: LangServeOutputPreProcessor<AiMsg>;
};

declare const createChatAdapter: <AiMsg = string>() => ChatAdapterBuilder<AiMsg>;

export { type ChatAdapterBuilder, type ChatAdapterOptions, type LangServeConfig, type LangServeConfigItem, type LangServeEndpointType, type LangServeHeaders, createChatAdapter };
