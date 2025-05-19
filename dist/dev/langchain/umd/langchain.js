(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global["@nlux/langchain"] = {}));
})(this, (function (exports) { 'use strict';

    var __defProp = Object.defineProperty;
    var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
    class NluxError extends Error {
      constructor(rawError = {}) {
        super(rawError.message);
        __publicField(this, "exceptionId");
        __publicField(this, "message");
        __publicField(this, "source");
        __publicField(this, "type");
        this.message = rawError.message ?? "";
        this.source = rawError.source;
        this.type = this.constructor.name;
        this.exceptionId = rawError.exceptionId;
      }
    }
    class NluxUsageError extends NluxError {
    }

    const uid = () => {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
        const randomValue = Math.random() * 16 | 0;
        const value = character == "x" ? randomValue : randomValue & 3 | 8;
        return value.toString(16);
      });
    };

    const warn = (message) => {
      if (typeof message === "string") {
        console.warn(`[nlux] ${message}`);
        return;
      }
      if (message && typeof message.toString === "function") {
        console.warn(`[nlux] ${message.toString()}`);
        return;
      }
      console.warn("[nlux]");
      console.log(JSON.stringify(message, null, 2));
    };
    const warnedMessages = [];
    const warnOnce = (message) => {
      if (warnedMessages.includes(message)) {
        return;
      }
      warnedMessages.push(message);
      warn(message);
    };

    const getDataTransferModeFromEndpointType = (endpointAction) => {
      if (endpointAction === "stream") {
        return "stream";
      }
      return "batch";
    };

    const getEndpointTypeFromUrl = (url) => {
      const regEx = /\/.*\/(invoke|stream)$/g;
      const match = regEx.exec(url);
      if (!match || match.length < 2) {
        return void 0;
      }
      const extractedEndpoint = match[1];
      if (extractedEndpoint === "invoke" || extractedEndpoint === "stream") {
        return extractedEndpoint;
      }
      return void 0;
    };

    const getDataTransferModeToUse = (adapterOptions) => {
      const runnableEndpointAction = getEndpointTypeFromUrl(
        adapterOptions.url
      );
      const dataTransferModeFromOptions = adapterOptions.dataTransferMode;
      const dataTransferModeFromAction = runnableEndpointAction ? getDataTransferModeFromEndpointType(runnableEndpointAction) : void 0;
      const dataTransferMode = dataTransferModeFromAction ?? (adapterOptions.dataTransferMode ?? LangServeAbstractAdapter.defaultDataTransferMode);
      if (dataTransferModeFromOptions && dataTransferModeFromAction && dataTransferModeFromOptions !== dataTransferModeFromAction) {
        warnOnce(`The data transfer mode provided to LangServe adapter does not match the LangServe runnable URL action. When you provide a runnable URL that ends with '/${runnableEndpointAction}', the data transfer mode is automatically set to '${dataTransferModeFromAction}' and the 'dataTransferMode' option should not be provided or should be set to '${dataTransferModeFromAction}'`);
      }
      return dataTransferMode;
    };

    const isUrlWithSupportedEndpoint = (url) => {
      const regEx = /\/.*\/(invoke|stream)$/g;
      return regEx.test(url);
    };

    const getBaseUrlFromUrlOption = (adapterOptions) => {
      const urlOption = adapterOptions.url;
      if (!isUrlWithSupportedEndpoint(urlOption)) {
        return urlOption;
      }
      return urlOption.replace(/\/(invoke|stream)$/g, "");
    };

    const getEndpointTypeToUse = (adapterOptions) => {
      const urlFromOptions = adapterOptions.url;
      const actionFromUrl = getEndpointTypeFromUrl(urlFromOptions);
      if (actionFromUrl) {
        return actionFromUrl;
      }
      const dataTransferMode = getDataTransferModeToUse(adapterOptions);
      return dataTransferMode === "batch" ? "invoke" : "stream";
    };

    const getEndpointUrlToUse = (adapterOptions) => {
      const baseUrl = getBaseUrlFromUrlOption(adapterOptions).replace(/\/$/, "");
      const endpointType = getEndpointTypeToUse(adapterOptions);
      return `${baseUrl}/${endpointType}`;
    };

    const getHeadersToUse = (adapterOptions) => {
      return adapterOptions.headers || {};
    };

    const getRunnableNameToUse = (adapterOptions) => {
      const baseUrl = getBaseUrlFromUrlOption(adapterOptions).replace(/\/$/, "");
      const runnableName = baseUrl.split("/").pop();
      return runnableName || "langserve-runnable";
    };

    const getSchemaUrlToUse = (adapterOptions, type) => {
      const baseUrl = getBaseUrlFromUrlOption(adapterOptions).replace(/\/$/, "");
      {
        return `${baseUrl}/input_schema`;
      }
    };

    const transformInputBasedOnSchema = (message, conversationHistory, schema, runnableName) => {
      const typedSchema = schema;
      if (!typedSchema || typeof typedSchema.properties !== "object") {
        return message;
      }
      if (typeof typedSchema !== "object" || !typedSchema) {
        warn(
          `LangServer adapter cannot process the input schema fetched for runnable "${runnableName}". The user message will be sent to LangServe endpoint as is without transformations. To override this behavior, you can either set the "useInputSchema" option to false, or provide a custom input pre-processor via the "inputPreProcessor" option, or update your endpoint and input schema to have an object with a single string property or a string as input.`
        );
        return message;
      }
      if (typedSchema.type === "string") {
        return message;
      }
      if (typedSchema.type === "object") {
        const properties = typeof typedSchema.properties === "object" && typedSchema.properties ? typedSchema.properties : {};
        const schemaStringProps = Object.keys(properties).filter((key) => key && typeof properties[key].type === "string").map((key) => key);
        if (schemaStringProps.length !== 1) {
          warn(
            `LangServer adapter cannot find a valid property to match to user input inside the "\${runnableName}" input schema. The user message will be sent to LangServe endpoint as is without transformations. To override this behavior, you can either set the "useInputSchema" option to false, or provide a custom input pre-processor via the "inputPreProcessor" option, or update your endpoint and input schema to have an object with a single string property or a string accepted as part of input schema.`
          );
        } else {
          const propToUse = schemaStringProps[0];
          return {
            [propToUse]: message
          };
        }
      }
      return void 0;
    };

    class LangServeAbstractAdapter {
      constructor(options) {
        this.__instanceId = `${this.info.id}-${uid()}`;
        this.__options = { ...options };
        this.theDataTransferModeToUse = getDataTransferModeToUse(options);
        this.theHeadersToUse = getHeadersToUse(options);
        this.theUseInputSchemaOptionToUse = typeof options.useInputSchema === "boolean" ? options.useInputSchema : true;
        this.theEndpointUrlToUse = getEndpointUrlToUse(options);
        this.theRunnableNameToUse = getRunnableNameToUse(options);
        this.theInputSchemaUrlToUse = getSchemaUrlToUse(options);
        this.init();
      }
      get dataTransferMode() {
        return this.theDataTransferModeToUse;
      }
      get endpointUrl() {
        return this.theEndpointUrlToUse;
      }
      get headers() {
        return this.theHeadersToUse;
      }
      get id() {
        return this.__instanceId;
      }
      get info() {
        return {
          id: "langserve-adapter",
          capabilities: {
            chat: true,
            fileUpload: false,
            textToSpeech: false,
            speechToText: false
          }
        };
      }
      get inputPreProcessor() {
        return this.__options.inputPreProcessor;
      }
      get inputSchema() {
        return this.theInputSchemaToUse;
      }
      get outputPreProcessor() {
        return this.__options.outputPreProcessor;
      }
      get runnableName() {
        return this.theRunnableNameToUse;
      }
      get useInputSchema() {
        return this.theUseInputSchemaOptionToUse;
      }
      get config() {
        return this.__options.config;
      }
      get inputSchemaUrl() {
        return this.theInputSchemaUrlToUse;
      }
      async fetchSchema(url) {
        try {
          const response = await fetch(url);
          const result = await response.json();
          if (typeof result !== "object" || !result) {
            warn(`LangServe adapter is unable process schema loaded from: ${url}`);
            return void 0;
          }
          return result;
        } catch (_error) {
          warn(`LangServe adapter is unable to fetch schema from: ${url}`);
          return void 0;
        }
      }
      init() {
        if (this.useInputSchema) {
          this.fetchSchema(this.inputSchemaUrl).then((schema) => {
            this.theInputSchemaToUse = schema;
          });
        }
      }
      preProcessAiBatchedMessage(message, extras) {
        if (this.outputPreProcessor) {
          return this.outputPreProcessor(message);
        }
        if (typeof message === "string") {
          return message;
        }
        const content = message?.content;
        if (typeof content === "string") {
          return content;
        }
        warn(
          "LangServe adapter is unable to process the response from the runnable. Returning empty string. You may want to implement an output pre-processor to handle custom responses."
        );
        return void 0;
      }
      preProcessAiStreamedChunk(chunk, extras) {
        if (this.outputPreProcessor) {
          return this.outputPreProcessor(chunk);
        }
        if (typeof chunk === "string") {
          return chunk;
        }
        const content = chunk?.content;
        if (typeof content === "string") {
          return content;
        }
        warn(
          "LangServe adapter is unable to process the chunk from the runnable. Returning empty string. You may want to implement an output pre-processor to handle chunks of custom responses."
        );
        return void 0;
      }
      getRequestBody(message, config, conversationHistory) {
        if (this.inputPreProcessor) {
          const preProcessedInput = this.inputPreProcessor(message, conversationHistory);
          return JSON.stringify({
            input: preProcessedInput,
            config
          });
        }
        if (this.inputSchema) {
          const body = transformInputBasedOnSchema(message, conversationHistory, this.inputSchema, this.runnableName);
          if (typeof body !== "undefined") {
            return JSON.stringify({
              input: body,
              config
            });
          }
        }
        return JSON.stringify({
          input: message,
          config
        });
      }
    }
    LangServeAbstractAdapter.defaultDataTransferMode = "stream";

    class LangServeBatchAdapter extends LangServeAbstractAdapter {
      constructor(options) {
        super(options);
      }
      async batchText(message, extras) {
        const body = this.getRequestBody(
          message,
          this.config,
          extras.conversationHistory
        );
        const response = await fetch(this.endpointUrl, {
          method: "POST",
          headers: {
            ...this.headers,
            "Content-Type": "application/json"
          },
          body
        });
        if (!response.ok) {
          throw new Error(`LangServe runnable returned status code: ${response.status}`);
        }
        const result = await response.json();
        if (typeof result !== "object" || !result || result.output === void 0) {
          throw new Error(
            'Invalid response from LangServe runnable: Response is not an object or does not contain an "output" property'
          );
        }
        return typeof result === "object" && result ? result.output : void 0;
      }
      streamText(message, observer, extras) {
        throw new NluxUsageError({
          source: this.constructor.name,
          message: "Cannot stream text from the batch adapter!"
        });
      }
    }

    const debug = (...messages) => {
      for (const message of messages) {
        if (typeof message === "string") {
          console.log(`[nlux] ${message}`);
          continue;
        }
        if (message && typeof message.toString === "function") {
          console.log(`[nlux] ${message.toString()}`);
          continue;
        }
        console.log("[nlux] Debug:");
        console.log(JSON.stringify(message, null, 2));
      }
    };

    const parseStreamedEvent = (event) => {
      const regEx = /^event:\s+(?<event>[\w]+)((\r?)\n(\r?)data: (?<data>(.|\n)*))?/gm;
      const match = regEx.exec(event);
      if (!match) {
        return void 0;
      }
      const { event: eventName, data: rawData } = match.groups || {};
      if (!eventName) {
        return void 0;
      }
      if (eventName !== "data" && eventName !== "end") {
        debug(`LangServe stream adapter received unsupported event "${eventName}"`);
        return void 0;
      }
      try {
        const data = rawData ? JSON.parse(rawData) : void 0;
        return { event: eventName, data };
      } catch (_error) {
        warn(`LangServe stream adapter failed to parse data for chunk event "${eventName}" | Data: ${rawData}`);
        return { event: eventName, data: void 0 };
      }
    };

    const parseChunk = (chunk) => {
      if (!chunk) {
        return [];
      }
      const regEx = /(((?<=^)|(?<=\n))event:\s+(\w+))/g;
      const eventStartPositions = [];
      let match = regEx.exec(chunk);
      while (match) {
        eventStartPositions.push(match.index);
        match = regEx.exec(chunk);
      }
      const extractEvent = (startPosition, index) => {
        const endPosition = eventStartPositions[index + 1] || chunk.length;
        return chunk.substring(startPosition, endPosition);
      };
      try {
        return eventStartPositions.map(extractEvent).map(parseStreamedEvent).filter((event) => event !== void 0).map((event) => event);
      } catch (_error) {
        if (_error instanceof Error) {
          return _error;
        }
        return [];
      }
    };

    const adapterErrorToExceptionId = (error) => {
      if (typeof error === "object" && error !== null) {
        const errorAsObject = error;
        if (errorAsObject.message && typeof errorAsObject.message === "string" && errorAsObject.message.toLowerCase().includes("connection error")) {
          return "connection-error";
        }
      }
      return null;
    };

    class LangServeStreamAdapter extends LangServeAbstractAdapter {
      constructor(options) {
        super(options);
      }
      async batchText(message, extras) {
        throw new NluxUsageError({
          source: this.constructor.name,
          message: "Cannot fetch text using the stream adapter!"
        });
      }
      streamText(message, observer, extras) {
        const body = this.getRequestBody(
          message,
          this.config,
          extras.conversationHistory
        );
        fetch(this.endpointUrl, {
          method: "POST",
          headers: {
            ...this.headers,
            "Content-Type": "application/json"
          },
          body
        }).then(async (response) => {
          if (!response.ok) {
            throw new NluxError({
              source: this.constructor.name,
              message: `LangServe runnable returned status code: ${response.status}`
            });
          }
          if (!response.body) {
            throw new NluxError({
              source: this.constructor.name,
              message: `LangServe runnable returned status code: ${response.status}`
            });
          }
          const reader = response.body.getReader();
          const textDecoder = new TextDecoder();
          let doneReading = false;
          while (!doneReading) {
            const { value, done } = await reader.read();
            if (done) {
              doneReading = true;
              break;
            }
            const chunk = textDecoder.decode(value);
            const chunkContent = parseChunk(chunk);
            if (Array.isArray(chunkContent)) {
              for (const aiEvent of chunkContent) {
                if (aiEvent.event === "data" && aiEvent.data !== void 0) {
                  observer.next(aiEvent.data);
                }
                if (aiEvent.event === "end") {
                  observer.complete();
                  doneReading = true;
                  break;
                }
              }
            }
            if (chunkContent instanceof Error) {
              warn(chunkContent);
              observer.error(chunkContent);
              doneReading = true;
            }
          }
        }).catch((error) => {
          warn(error);
          observer.error(new NluxUsageError({
            source: this.constructor.name,
            message: error.message,
            exceptionId: adapterErrorToExceptionId(error) ?? void 0
          }));
        });
      }
    }

    class LangServeAdapterBuilderImpl {
      constructor(cloneFrom) {
        if (cloneFrom) {
          this.theDataTransferMode = cloneFrom.theDataTransferMode;
          this.theHeaders = cloneFrom.theHeaders;
          this.theConfig = cloneFrom.theConfig;
          this.theInputPreProcessor = cloneFrom.theInputPreProcessor;
          this.theOutputPreProcessor = cloneFrom.theOutputPreProcessor;
          this.theUrl = cloneFrom.theUrl;
        }
      }
      create() {
        if (!this.theUrl) {
          throw new NluxUsageError({
            source: this.constructor.name,
            message: "Unable to create LangServe adapter. URL is missing. Make sure you are calling withUrl() before calling create()."
          });
        }
        const options = {
          url: this.theUrl,
          dataTransferMode: this.theDataTransferMode,
          headers: this.theHeaders,
          config: this.theConfig,
          inputPreProcessor: this.theInputPreProcessor,
          outputPreProcessor: this.theOutputPreProcessor,
          useInputSchema: this.theUseInputSchema
        };
        const dataTransferModeToUse = getDataTransferModeToUse(options);
        if (dataTransferModeToUse === "stream") {
          return new LangServeStreamAdapter(options);
        }
        return new LangServeBatchAdapter(options);
      }
      withConfig(langServeConfig) {
        if (this.theConfig !== void 0) {
          throw new NluxUsageError({
            source: this.constructor.name,
            message: "Cannot set the config option more than once"
          });
        }
        this.theConfig = langServeConfig;
        return this;
      }
      withDataTransferMode(mode) {
        if (this.theDataTransferMode !== void 0) {
          throw new NluxUsageError({
            source: this.constructor.name,
            message: "Cannot set the data loading mode more than once"
          });
        }
        this.theDataTransferMode = mode;
        return this;
      }
      withHeaders(headers) {
        if (this.theHeaders !== void 0) {
          throw new NluxUsageError({
            source: this.constructor.name,
            message: "Cannot set the headers option more than once"
          });
        }
        this.theHeaders = headers;
        return this;
      }
      withInputPreProcessor(inputPreProcessor) {
        if (this.theInputPreProcessor !== void 0) {
          throw new NluxUsageError({
            source: this.constructor.name,
            message: "Cannot set the input pre-processor option more than once"
          });
        }
        this.theInputPreProcessor = inputPreProcessor;
        return this;
      }
      withInputSchema(useInputSchema) {
        if (this.theUseInputSchema !== void 0) {
          throw new NluxUsageError({
            source: this.constructor.name,
            message: "Cannot set the input schema option more than once"
          });
        }
        this.theUseInputSchema = useInputSchema;
        return this;
      }
      withOutputPreProcessor(outputPreProcessor) {
        if (this.theOutputPreProcessor !== void 0) {
          throw new NluxUsageError({
            source: this.constructor.name,
            message: "Cannot set the output pre-processor option more than once"
          });
        }
        this.theOutputPreProcessor = outputPreProcessor;
        return this;
      }
      withUrl(runnableUrl) {
        if (this.theUrl !== void 0) {
          throw new NluxUsageError({
            source: this.constructor.name,
            message: "Cannot set the runnable URL option more than once"
          });
        }
        this.theUrl = runnableUrl;
        return this;
      }
    }

    const createChatAdapter = () => {
      return new LangServeAdapterBuilderImpl();
    };

    exports.createChatAdapter = createChatAdapter;

}));
//# sourceMappingURL=langchain.js.map
