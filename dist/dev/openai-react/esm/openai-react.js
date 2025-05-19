import { createUnsafeChatAdapter } from '@nlux/openai';
export { createUnsafeChatAdapter } from '@nlux/openai';
import { useState, useEffect } from 'react';

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
  let newAdapter = createUnsafeChatAdapter().withApiKey(apiKey);
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
  const [isInitialized, setIsInitialized] = useState(false);
  const [adapter, setAdapter] = useState(
    getAdapterBuilder(options).create()
  );
  const {
    apiKey,
    dataTransferMode,
    systemMessage,
    model
  } = options || {};
  useEffect(() => {
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

export { useUnsafeChatAdapter };
//# sourceMappingURL=openai-react.js.map
