(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@nlux/nlbridge'), require('react')) :
    typeof define === 'function' && define.amd ? define(['exports', '@nlux/nlbridge', 'react'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global["@nlux/nlbridge-react"] = {}, global.nlbridge, global.react));
})(this, (function (exports, nlbridge, react) { 'use strict';

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
      let newAdapter = nlbridge.createChatAdapter().withUrl(url);
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
      ] = react.useState(headers);
      react.useEffect(() => {
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
      const coreContext = context?.ref ? react.useContext(context.ref) : void 0;
      const [adapter, setAdapter] = react.useState(
        getChatAdapterBuilder({
          url,
          mode,
          context: coreContext,
          headers
        })
      );
      react.useEffect(() => {
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

    Object.defineProperty(exports, "createChatAdapter", {
        enumerable: true,
        get: function () { return nlbridge.createChatAdapter; }
    });
    Object.defineProperty(exports, "createContextAdapter", {
        enumerable: true,
        get: function () { return nlbridge.createContextAdapter; }
    });
    exports.useChatAdapter = useChatAdapter;

}));
//# sourceMappingURL=nlbridge-react.js.map
