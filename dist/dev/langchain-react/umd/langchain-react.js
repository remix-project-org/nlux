(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@nlux/langchain'), require('@nlux/react'), require('react')) :
    typeof define === 'function' && define.amd ? define(['exports', '@nlux/langchain', '@nlux/react', 'react'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global["@nlux/langchain-react"] = {}, global.langchain, global.react$1, global.react));
})(this, (function (exports, langchain, react$1, react) { 'use strict';

    const getAdapterBuilder = (options) => {
      const {
        url,
        dataTransferMode,
        headers,
        config,
        inputPreProcessor,
        outputPreProcessor,
        useInputSchema
      } = options || {};
      if (dataTransferMode && dataTransferMode !== "stream" && dataTransferMode !== "batch") {
        throw new Error(`Data transfer mode not supported`);
      }
      if (!url) {
        throw new Error(`Runnable URL is required`);
      }
      let newAdapter = langchain.createChatAdapter().withUrl(url);
      if (dataTransferMode) {
        newAdapter = newAdapter.withDataTransferMode(dataTransferMode);
      }
      if (headers) {
        newAdapter = newAdapter.withHeaders(headers);
      }
      if (config) {
        newAdapter = newAdapter.withConfig(config);
      }
      if (inputPreProcessor) {
        newAdapter = newAdapter.withInputPreProcessor(inputPreProcessor);
      }
      if (outputPreProcessor) {
        newAdapter = newAdapter.withOutputPreProcessor(outputPreProcessor);
      }
      if (useInputSchema !== void 0) {
        newAdapter = newAdapter.withInputSchema(useInputSchema);
      }
      return newAdapter;
    };

    const useChatAdapter = (options) => {
      const [isInitialized, setIsInitialized] = react.useState(false);
      const [adapter, setAdapter] = react.useState(
        getAdapterBuilder(options).create()
      );
      const {
        url,
        dataTransferMode,
        headers,
        config,
        inputPreProcessor,
        outputPreProcessor,
        useInputSchema
      } = options || {};
      react$1.useDeepCompareEffect(() => {
        if (!isInitialized) {
          setIsInitialized(true);
          return;
        }
        const newAdapter = getAdapterBuilder(options).create();
        setAdapter(newAdapter);
      }, [
        isInitialized,
        url,
        dataTransferMode,
        headers || {},
        config || {},
        inputPreProcessor,
        outputPreProcessor,
        useInputSchema
      ]);
      return adapter;
    };

    Object.defineProperty(exports, "createChatAdapter", {
        enumerable: true,
        get: function () { return langchain.createChatAdapter; }
    });
    exports.useChatAdapter = useChatAdapter;

}));
//# sourceMappingURL=langchain-react.js.map
