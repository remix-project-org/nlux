import { createChatAdapter } from '@nlux/langchain';
export { createChatAdapter } from '@nlux/langchain';
import { useDeepCompareEffect } from '@nlux/react';
import { useState } from 'react';

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
  let newAdapter = createChatAdapter().withUrl(url);
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
  const [isInitialized, setIsInitialized] = useState(false);
  const [adapter, setAdapter] = useState(
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
  useDeepCompareEffect(() => {
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

export { useChatAdapter };
//# sourceMappingURL=langchain-react.js.map
