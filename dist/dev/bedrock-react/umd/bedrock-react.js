(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('react'), require('@nlux/bedrock')) :
    typeof define === 'function' && define.amd ? define(['exports', 'react', '@nlux/bedrock'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global["@nlux/bedrock-react"] = {}, global.react, global.bedrock));
})(this, (function (exports, react, bedrock) { 'use strict';

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

    const source$1 = "hooks/getAdapterBuilder";
    const getAdapterBuilder = (options) => {
      const { model, credentials, dataTransferMode } = options || {};
      if (dataTransferMode && dataTransferMode !== "stream" && dataTransferMode !== "batch") {
        throw new NluxUsageError({
          source: source$1,
          message: 'Data transfer mode for Hugging Face Inference API must be either "stream" or "batch"'
        });
      }
      if (model === void 0) {
        throw new NluxUsageError({
          source: source$1,
          message: "You must provide either a model or an endpoint to use Hugging Face Inference API."
        });
      }
      let newAdapter = bedrock.createChatAdapter().withModel(model);
      if (credentials !== void 0) {
        newAdapter = newAdapter.withCredintial(credentials);
      }
      if (dataTransferMode !== void 0) {
        newAdapter = newAdapter.withDataTransferMode(dataTransferMode);
      }
      return newAdapter;
    };

    const source = "hooks/useChatAdapter";
    const useChatAdapter = (options) => {
      if (!options.model) {
        throw new Error(
          "You must provide either a model or an endpoint to use Hugging Face Inference API."
        );
      }
      const [isInitialized, setIsInitialized] = react.useState(false);
      const [adapter] = react.useState(
        getAdapterBuilder(options).create()
      );
      const { dataTransferMode, model } = options || {};
      react.useEffect(() => {
        if (!isInitialized) {
          setIsInitialized(true);
          return;
        }
        debug({
          source,
          message: "A new parameter has changed in useChatAdapter(). Adapter cannot be changed after initialization and the new parameter will not be applied. Please re-initialize the adapter with the new parameter. or user adapter methods to change the options and behaviour of the adapter."
        });
      }, [dataTransferMode, model]);
      return adapter;
    };

    exports.useChatAdapter = useChatAdapter;

}));
//# sourceMappingURL=bedrock-react.js.map
