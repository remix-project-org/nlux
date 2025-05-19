import { createChatAdapter } from '@nlux/nlbridge';
export { createChatAdapter, createContextAdapter } from '@nlux/nlbridge';
import { useState, useEffect, useContext } from 'react';

const getChatAdapterBuilder = (options) => {
  const {
    url,
    mode,
    context,
    headers
  } = options || {};
  if (mode && mode !== "copilot" && mode !== "chat") {
    throw new Error(`Data transfer mode not supported`);
  }
  if (!url) {
    throw new Error(`Runnable URL is required`);
  }
  let newAdapter = createChatAdapter().withUrl(url);
  if (mode) {
    newAdapter = newAdapter.withMode(mode);
  }
  if (context) {
    newAdapter = newAdapter.withContext(context);
  }
  if (headers) {
    newAdapter = newAdapter.withHeaders(headers);
  }
  return newAdapter.create();
};

const useChatAdapter = (options) => {
  const {
    context,
    url,
    mode,
    headers
  } = options;
  const [
    headersToUse,
    setHeadersToUse
  ] = useState(headers);
  useEffect(() => {
    if (!headers && headersToUse) {
      setHeadersToUse(void 0);
      return;
    }
    if (headers && !headersToUse) {
      setHeadersToUse(headers);
      return;
    }
    if (headers && headersToUse) {
      if (Object.keys(headers).length !== Object.keys(headersToUse).length) {
        setHeadersToUse(headers);
        return;
      }
      for (const key in headers) {
        if (headers[key] !== headersToUse[key]) {
          setHeadersToUse(headers);
          return;
        }
      }
    }
  }, [headers]);
  const coreContext = context?.ref ? useContext(context.ref) : void 0;
  const [adapter, setAdapter] = useState(
    getChatAdapterBuilder({
      url,
      mode,
      context: coreContext,
      headers
    })
  );
  useEffect(() => {
    const newAdapter = getChatAdapterBuilder({
      url,
      mode,
      headers: headersToUse,
      context: coreContext
    });
    setAdapter(newAdapter);
  }, [
    url,
    mode,
    headersToUse,
    coreContext
  ]);
  return adapter;
};

export { useChatAdapter };
//# sourceMappingURL=nlbridge-react.js.map
