(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@nlux/openai'), require('react')) :
    typeof define === 'function' && define.amd ? define(['exports', '@nlux/openai', 'react'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global["@nlux/openai-react"] = {}, global.openai, global.react));
})(this, (function (exports, openai, react) { 'use strict';

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

    const source = "hooks/getAdapterBuilder";
    const getAdapterBuilder = (options) => {
      const {
        apiKey,
        dataTransferMode,
        systemMessage,
        model
      } = options || {};
      if (dataTransferMode && dataTransferMode !== "stream" && dataTransferMode !== "batch") {
        throw new NluxUsageError({
          source,
          message: "Data transfer mode not supported"
        });
      }
      if (!apiKey) {
        throw new NluxUsageError({
          source,
          message: "API key is required"
        });
      }
      let newAdapter = openai.createUnsafeChatAdapter().withApiKey(apiKey);
      if (model !== void 0) {
        newAdapter = newAdapter.withModel(model);
      }
      if (dataTransferMode) {
        newAdapter = newAdapter.withDataTransferMode(dataTransferMode);
      }
      if (systemMessage) {
        newAdapter = newAdapter.withSystemMessage(systemMessage);
      }
      return newAdapter;
    };

    const useUnsafeChatAdapter = (options) => {
      const [isInitialized, setIsInitialized] = react.useState(false);
      const [adapter, setAdapter] = react.useState(
        getAdapterBuilder(options).create()
      );
      const {
        apiKey,
        dataTransferMode,
        systemMessage,
        model
      } = options || {};
      react.useEffect(() => {
        if (!isInitialized) {
          setIsInitialized(true);
          return;
        }
        const newAdapter = getAdapterBuilder(options).create();
        setAdapter(newAdapter);
      }, [
        apiKey,
        dataTransferMode,
        systemMessage,
        model
      ]);
      return adapter;
    };

    Object.defineProperty(exports, "createUnsafeChatAdapter", {
        enumerable: true,
        get: function () { return openai.createUnsafeChatAdapter; }
    });
    exports.useUnsafeChatAdapter = useUnsafeChatAdapter;

}));
//# sourceMappingURL=openai-react.js.map
