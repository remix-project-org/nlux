'use strict';

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

class NLBridgeAbstractAdapter {
  constructor(options) {
    this.theAiContextToUse = void 0;
    this.theUsageMode = void 0;
    this.__instanceId = `${this.info.id}-${uid()}`;
    this.theUsageMode = options.mode;
    this.theEndpointUrlToUse = options.url;
    this.theAiContextToUse = options.context;
    this.theDataTransferModeToUse = options.mode === "copilot" && options.context ? "batch" : "stream";
    this.theHeaders = options.headers ?? {};
  }
  get context() {
    return this.theAiContextToUse;
  }
  get dataTransferMode() {
    return this.theDataTransferModeToUse;
  }
  get endpointUrl() {
    return this.theEndpointUrlToUse;
  }
  get headers() {
    return this.theHeaders;
  }
  get id() {
    return this.__instanceId;
  }
  get info() {
    return {
      id: "nlbridge-adapter",
      capabilities: {
        chat: true,
        fileUpload: false,
        textToSpeech: false,
        speechToText: false
      }
    };
  }
  get usageMode() {
    return this.theUsageMode;
  }
  preProcessAiBatchedMessage(message, extras) {
    if (typeof message === "string") {
      return message;
    }
    warn("NLBridge adapter received a non-string message from the server. Returning empty string.");
    return "";
  }
  preProcessAiStreamedChunk(chunk, extras) {
    if (typeof chunk === "string") {
      return chunk;
    }
    warn("NLBridge adapter received a non-string chunk from the server. Returning empty string.");
    return "";
  }
}
NLBridgeAbstractAdapter.defaultDataTransferMode = "stream";

class NLBridgeBatchAdapter extends NLBridgeAbstractAdapter {
  constructor(options) {
    super(options);
  }
  async batchText(message, extras) {
    if (this.context && this.context.contextId) {
      await this.context.flush();
    }
    const action = this.usageMode === "copilot" ? "assist" : "chat";
    const response = await fetch(this.endpointUrl, {
      method: "POST",
      headers: {
        ...this.headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action,
        payload: {
          message,
          conversationHistory: extras.conversationHistory,
          contextId: this.context?.contextId
        }
      })
    });
    if (!response.ok) {
      throw new NluxError({
        source: this.constructor.name,
        message: `NLBridge adapter returned status code: ${response.status}`
      });
    }
    const body = await response.json();
    if (typeof body === "object" && body !== null && body.success === true && typeof body.result === "object" && body.result !== null && typeof body.result.response === "string") {
      const { response: response2, task } = body.result;
      if (this.context && task && typeof task === "object" && typeof task.taskId === "string" && Array.isArray(task.parameters)) {
        this.context.runTask(task.taskId, task.parameters);
      }
      return response2;
    } else {
      throw new NluxError({
        source: this.constructor.name,
        message: "Invalid response from NLBridge: String expected."
      });
    }
  }
  streamText(message, observer, extras) {
    throw new NluxUsageError({
      source: this.constructor.name,
      message: "Cannot stream text from the batch adapter!"
    });
  }
}

class NLBridgeStreamAdapter extends NLBridgeAbstractAdapter {
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
    const submitPrompt = () => {
      fetch(this.endpointUrl, {
        method: "POST",
        headers: {
          ...this.headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "chat-stream",
          payload: {
            message,
            conversationHistory: extras.conversationHistory,
            contextId: this.context?.contextId
          }
        })
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error(`NLBridge adapter returned status code: ${response.status}`);
        }
        if (!response.body) {
          throw new Error(`NLBridge adapter returned status code: ${response.status}`);
        }
        const reader = response.body.getReader();
        const textDecoder = new TextDecoder();
        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }
          try {
            const chunk = textDecoder.decode(value);
            observer.next(chunk);
          } catch (err) {
            warn(`Error parsing chunk by NLBridgeStreamAdapter: ${err}`);
          }
        }
        observer.complete();
      });
    };
    if (this.context && this.context.contextId) {
      this.context.flush().then(() => submitPrompt()).catch(() => submitPrompt());
      return;
    }
    submitPrompt();
  }
}

class ChatAdapterBuilderImpl {
  constructor(cloneFrom) {
    if (cloneFrom) {
      this.theUrl = cloneFrom.theUrl;
      this.theMode = cloneFrom.theMode;
      this.theContext = cloneFrom.theContext;
      this.theHeaders = cloneFrom.theHeaders;
    }
  }
  create() {
    if (!this.theUrl) {
      throw new NluxUsageError({
        source: this.constructor.name,
        message: "Unable to create NLBridge adapter. URL is missing. Make sure you are call withUrl() or provide url option before calling creating the adapter."
      });
    }
    const options = {
      url: this.theUrl,
      mode: this.theMode,
      context: this.theContext,
      headers: this.theHeaders
    };
    const dataTransferModeToUse = options.mode ?? NLBridgeAbstractAdapter.defaultDataTransferMode;
    if (dataTransferModeToUse === "stream") {
      return new NLBridgeStreamAdapter(options);
    }
    return new NLBridgeBatchAdapter(options);
  }
  withContext(context) {
    if (this.theContext !== void 0) {
      throw new NluxUsageError({
        source: this.constructor.name,
        message: "Cannot set the context ID option more than once"
      });
    }
    this.theContext = context;
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
  withMode(mode) {
    if (this.theMode !== void 0) {
      throw new NluxUsageError({
        source: this.constructor.name,
        message: "Cannot set the usage mode option more than once"
      });
    }
    this.theMode = mode;
    return this;
  }
  withUrl(endpointUrl) {
    if (this.theUrl !== void 0) {
      throw new NluxUsageError({
        source: this.constructor.name,
        message: "Cannot set the endpoint URL option more than once"
      });
    }
    this.theUrl = endpointUrl;
    return this;
  }
}

const createChatAdapter = () => {
  return new ChatAdapterBuilderImpl();
};

class NLBridgeContextAdapter {
  constructor(url, headers) {
    this.url = url;
    this.headers = headers ?? {};
  }
  async create(contextItems, extras) {
    try {
      const result = await fetch(this.url, {
        method: "POST",
        headers: {
          ...this.headers,
          ...extras?.headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "create-context",
          payload: contextItems ? { items: contextItems } : void 0
        })
      });
      if (!result.ok) {
        return {
          success: false,
          error: "Failed to set context"
        };
      }
      const data = await result.json();
      if (!data?.result?.contextId) {
        return {
          success: false,
          error: "Invalid context ID"
        };
      }
      return {
        success: true,
        contextId: data.result.contextId
      };
    } catch (_error) {
      return {
        success: false,
        error: "Failed to set context"
      };
    }
  }
  discard(contextId, extras) {
    return this.sendAction(
      contextId,
      "discard-context",
      void 0,
      extras
    );
  }
  removeItems(contextId, itemIds, extras) {
    return this.sendAction(
      contextId,
      "remove-context-items",
      { itemIds },
      extras
    );
  }
  async removeTasks(contextId, taskIds, extras) {
    return this.sendAction(
      contextId,
      "remove-context-tasks",
      { taskIds },
      extras
    );
  }
  resetItems(contextId, newItems, extras) {
    return this.sendAction(
      contextId,
      "reset-context-items",
      newItems ? { items: newItems } : void 0,
      extras
    );
  }
  resetTasks(contextId, newTasks, extras) {
    return this.sendAction(
      contextId,
      "reset-context-tasks",
      newTasks,
      extras
    );
  }
  async sendAction(contextId, action, payload, extras) {
    if (!contextId) {
      return {
        success: false,
        error: "Invalid context ID"
      };
    }
    try {
      const result = await fetch(this.url, {
        method: "POST",
        headers: {
          ...extras?.headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action,
          payload: {
            ...payload,
            contextId
          }
        })
      });
      if (!result.ok) {
        return {
          success: false,
          error: "Failed to send action"
        };
      }
      const items = await result.json();
      return {
        success: true,
        items
      };
    } catch (_error) {
      return {
        success: false,
        error: "Failed to send action"
      };
    }
  }
  async updateItems(contextId, itemsToUpdate, extras) {
    return this.sendAction(
      contextId,
      "update-context-items",
      { items: itemsToUpdate },
      extras
    );
  }
  async updateTasks(contextId, tasks, extras) {
    return this.sendAction(
      contextId,
      "update-context-tasks",
      { tasks },
      extras
    );
  }
}

class ContextAdapterBuilderImpl {
  constructor() {
    this.endpointUrl = void 0;
    this.headers = void 0;
  }
  build() {
    if (!this.endpointUrl) {
      throw new Error("Endpoint URL is required");
    }
    return new NLBridgeContextAdapter(
      this.endpointUrl,
      this.headers
    );
  }
  withHeaders(headers) {
    if (this.headers !== void 0) {
      throw new Error("Cannot set the headers more than once");
    }
    this.headers = headers;
    return this;
  }
  withUrl(endpointUrl) {
    if (this.endpointUrl !== void 0 && this.endpointUrl !== endpointUrl) {
      throw new Error("Cannot set the endpoint URL more than once");
    }
    this.endpointUrl = endpointUrl;
    return this;
  }
}

const createContextAdapter = () => {
  return new ContextAdapterBuilderImpl();
};

exports.createChatAdapter = createChatAdapter;
exports.createContextAdapter = createContextAdapter;
//# sourceMappingURL=nlbridge.js.map
