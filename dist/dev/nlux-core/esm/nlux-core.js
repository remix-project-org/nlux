var __defProp$e = Object.defineProperty;
var __defNormalProp$6 = (obj, key, value) => key in obj ? __defProp$e(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$6 = (obj, key, value) => __defNormalProp$6(obj, typeof key !== "symbol" ? key + "" : key, value);
class NluxError extends Error {
  constructor(rawError = {}) {
    super(rawError.message);
    __publicField$6(this, "exceptionId");
    __publicField$6(this, "message");
    __publicField$6(this, "source");
    __publicField$6(this, "type");
    this.message = rawError.message ?? "";
    this.source = rawError.source;
    this.type = this.constructor.name;
    this.exceptionId = rawError.exceptionId;
  }
}
class NluxUsageError extends NluxError {
}
class NluxValidationError extends NluxError {
}
class NluxRenderingError extends NluxError {
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

const _CompRegistry = class _CompRegistry {
  static register(compClass) {
    const compId = compClass.__compId;
    if (!compId) {
      warn("Component definition missing valid id");
      return;
    }
    if (_CompRegistry.componentDefs.get(compId) !== void 0) {
      debug(`Component with id "${compId}" already registered`);
      return;
    }
    if (!compClass.__renderer || !compClass.__updater) {
      warn(`Component with id "${compId}" missing renderer or updater`);
      return;
    }
    _CompRegistry.componentDefs.set(compId, {
      id: compId,
      model: compClass,
      render: compClass.__renderer,
      update: compClass.__updater
    });
  }
  static retrieve(id) {
    const def = _CompRegistry.componentDefs.get(id);
    if (!def) {
      warn(`Component with id "${id}" not registered`);
      return void 0;
    }
    return def;
  }
};
_CompRegistry.componentDefs = /* @__PURE__ */ new Map();
let CompRegistry = _CompRegistry;

const globalMetaData = {
  version: "{versions.nlux}",
  [btoa("sectionsRegistered")]: false
};
const getGlobalMetaData = () => {
  if (typeof window === "undefined") {
    return void 0;
  }
  const theGlobalObject = window;
  if (typeof theGlobalObject.NLUX === "object" && typeof theGlobalObject.NLUX.version === "string") {
    return theGlobalObject.NLUX;
  }
  theGlobalObject.NLUX = globalMetaData;
  return globalMetaData;
};

const domOp = (op) => {
  const id = requestAnimationFrame(() => {
    op();
  });
  return () => {
    cancelAnimationFrame(id);
  };
};

const emptyInnerHtml = (element) => {
  element.replaceChildren();
};

const uid = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const randomValue = Math.random() * 16 | 0;
    const value = character == "x" ? randomValue : randomValue & 3 | 8;
    return value.toString(16);
  });
};

class BaseComp {
  constructor(context, props) {
    /**
     * Element IDs of the sub-components that are mounted in the DOM tree of the current component.
     * The key is the ID of the sub-component and the value is the ID of the element in the DOM tree.
     */
    this.subComponentElementIds = /* @__PURE__ */ new Map();
    /**
     * Sub-components that are mounted in the DOM tree of the current component.
     * This list should be filled by user by calling addPart() method in constructor of the component.
     */
    this.subComponents = /* @__PURE__ */ new Map();
    /**
     * The context of the current chat component.
     */
    this.__context = null;
    /**
     * A flag that indicates if the current component is destroyed.
     * This will prevent the component from being rendered, updated, or used in any way.
     */
    this.__destroyed = false;
    /**
     * The status of the current component.
     */
    this.__status = "unmounted";
    /**
     * A queue of actions that should be executed on the DOM tree when the component is rendered.
     * This queue is used to store actions that are called before the component is rendered.
     */
    this.actionsOnDomReady = [];
    this.compEventGetter = (eventName) => {
      if (this.destroyed) {
        return () => {
        };
      }
      const callback = this.rendererEventListeners.get(eventName);
      if (!callback) {
        throw new NluxError({
          source: this.constructor.name,
          message: `Unable to call renderer event "${eventName}" because no matching event listener was found. Make sure that the event listener is registered using @CompEventListener() decorator in the component model class, and use class methods instead of arrow function attributes.`
        });
      }
      return callback;
    };
    const compId = Object.getPrototypeOf(this).constructor.__compId;
    if (!compId) {
      throw new NluxUsageError({
        source: this.constructor.name,
        message: "Unable to instantiate component: missing compId in implementation. Component should be annotated using @Model() to set compId before iy can be instantiated."
      });
    }
    this.def = CompRegistry.retrieve(compId) ?? null;
    if (!this.def) {
      throw new NluxUsageError({
        source: this.constructor.name,
        message: `Unable to instantiate component "${compId}" because it's not registered. Component should be registered using CompRegistry.register(ComponentClass) before instantiating a component.`
      });
    }
    this.__instanceId = uid();
    this.__destroyed = false;
    this.__context = context;
    this.renderedDom = null;
    this.renderingRoot = null;
    this.props = props;
    const entries = props ? Object.entries(props) : [];
    this.elementProps = new Map(entries);
    this.rendererEventListeners = /* @__PURE__ */ new Map();
    const preDefinedEventListeners = this.constructor.__compEventListeners;
    if (preDefinedEventListeners) {
      preDefinedEventListeners.forEach((methodNames, eventName) => {
        methodNames.forEach((methodName) => {
          const method = Object.getPrototypeOf(this)[methodName];
          if (typeof method === "function") {
            this.addRendererEventListener(eventName, method.bind(this));
          } else {
            warn(`Unable to set event listener "${eventName}" because method "${methodName}" cannot be found on component "${this.constructor.name} at runtime!"`);
          }
        });
      });
    }
    this.rendererProps = Object.freeze(props);
  }
  get destroyed() {
    return this.__destroyed;
  }
  get id() {
    return this.__instanceId;
  }
  get rendered() {
    return this.renderedDom !== null;
  }
  get root() {
    this.throwIfDestroyed();
    if (!this.renderedDom || !this.renderingRoot) {
      return null;
    }
    return this.renderingRoot;
  }
  get status() {
    return this.__status;
  }
  get context() {
    if (!this.__context) {
      throw new NluxUsageError({
        source: this.constructor.name,
        message: "Unable to get context because it's not set"
      });
    }
    return this.__context;
  }
  destroy() {
    this.destroyComponent();
  }
  destroyListItemComponent() {
    this.destroyComponent(true);
  }
  getProp(name) {
    this.throwIfDestroyed();
    return this.elementProps.get(name) ?? null;
  }
  /**
   * Renders the current component in the DOM tree.
   * This method should be called by the component user to render the component. It should only be called once.
   * If the user attempts to render a mounted or destroyed component, an error will be thrown.
   *
   * You can use rendered property to check if the component is rendered before/after calling render().
   * You can use destroyed property to check if the component is already destroyed before calling render().
   *
   * @param root The root element where the component should be rendered.
   * @param insertBeforeElement The element before which the component should be inserted. If not provided, the
   * component will be appended to the root element. If provided, the component will be inserted before the
   * provided element if it exists in the root element.
   */
  render(root, insertBeforeElement) {
    if (!this.def) {
      return;
    }
    if (this.destroyed) {
      warn(`Unable to render component "${this.def?.id}" because it is already destroyed`);
      return;
    }
    if (this.rendered || this.renderedDom) {
      warn(`Unable to render component "${this.def.id}" because it is already rendered`);
      return;
    }
    const virtualRoot = document.createDocumentFragment();
    const compId = Object.getPrototypeOf(this).constructor.__compId;
    const renderedDom = this.executeRenderer(virtualRoot);
    if (!renderedDom) {
      throw new NluxError({
        source: this.constructor.name,
        message: `Unable to render component "${compId}" because renderer returned null`
      });
    }
    this.renderedDom = renderedDom;
    for (const [, subComponent] of this.subComponents) {
      const portal = this.getSubComponentPortal(subComponent.id);
      if (portal) {
        this.mountSubComponentToPortal(subComponent.id, portal);
      }
    }
    domOp(() => {
      if (this.destroyed) {
        return;
      }
      if (insertBeforeElement) {
        root.insertBefore(virtualRoot, insertBeforeElement);
      } else {
        root.append(virtualRoot);
      }
      this.renderingRoot = root;
    });
  }
  updateSubComponent(subComponentId, propName, newValue) {
    this.throwIfDestroyed();
    const subComp = this.subComponents.get(subComponentId);
    if (subComp && !subComp.destroyed) {
      subComp.setProp(propName, newValue);
    }
  }
  addSubComponent(id, subComponent, rendererElementId) {
    this.throwIfDestroyed();
    if (this.subComponents.has(id)) {
      throw new NluxUsageError({
        source: this.constructor.name,
        message: `Unable to add sub-component "${id}" because it already exists`
      });
    }
    this.subComponents.set(id, subComponent);
    if (rendererElementId) {
      this.subComponentElementIds.set(id, rendererElementId);
    }
    if (this.renderedDom) {
      const portal = this.getSubComponentPortal(id);
      if (portal) {
        this.mountSubComponentToPortal(id, portal);
      }
    }
  }
  /**
   * Executes a DOM action on the current component.
   * DOM actions are defined by the renderer and are used to call DOM-defined functions.
   * DOM actions should not be used to update the DOM tree. Use setProp() to update the DOM tree.
   *
   * Example of DOM actions: Focus on an input, scroll to a specific element, select text.
   *
   * @param actionName
   * @param args
   * @protected
   */
  executeDomAction(actionName, ...args) {
    this.throwIfDestroyed();
    if (!this.renderedDom) {
      this.actionsOnDomReady.push(() => this.executeDomAction(actionName, ...args));
      return;
    }
    if (!this.renderingRoot) {
      throw new NluxError({
        source: this.constructor.name,
        message: "Unable to execute DOM action because renderingRoot is not set"
      });
    }
    const action = this.renderedDom.actions[actionName];
    if (!action) {
      throw new NluxError({
        source: this.constructor.name,
        message: `Unable to execute DOM action "${String(actionName)}" because it does not exist`
      });
    }
    return domOp(() => action(...args));
  }
  executeRenderer(root) {
    const renderer = this.def?.render;
    if (!renderer) {
      return null;
    }
    if (this.renderingRoot) {
      throw new NluxError({
        source: this.constructor.name,
        message: "Unable to render component because renderingRoot is already set"
      });
    }
    const result = renderer({
      appendToRoot: (element) => {
        root.append(element);
        this.runDomActionsQueue();
      },
      compEvent: this.compEventGetter,
      props: this.rendererProps,
      context: this.context
    });
    if (result) {
      this.renderingRoot = root;
    }
    return result;
  }
  removeSubComponent(id) {
    this.throwIfDestroyed();
    domOp(() => {
      const subComp = this.subComponents.get(id);
      if (subComp) {
        subComp.renderingRoot = null;
        subComp.destroy();
        this.subComponents.delete(id);
      }
    });
  }
  runDomActionsQueue() {
    if (this.actionsOnDomReady.length > 0 && this.rendered) {
      const actionsOnDomReady = this.actionsOnDomReady;
      this.actionsOnDomReady = [];
      for (const action of actionsOnDomReady) {
        domOp(() => action());
      }
    }
  }
  /**
   * Sets a property of the current component.
   * This method can be called by the component to change property values.
   * New values will be passed to updater function to update the DOM tree.
   *
   * @param name
   * @param value
   * @protected
   */
  setProp(name, value) {
    if (this.destroyed) {
      warn(`Unable to set prop "${String(name)}" because component "${this.constructor.name}" is destroyed`);
      return;
    }
    if (!this.elementProps.has(name)) {
      warn(`Unable to set prop "${String(name)}" because it does not exist in the component props`);
      return;
    }
    this.schedulePropUpdate(
      name,
      this.elementProps.get(name),
      value
    );
    this.props = Object.freeze(Object.fromEntries(this.elementProps));
    this.elementProps.set(name, value);
  }
  throwIfDestroyed() {
    if (this.__destroyed) {
      throw new NluxUsageError({
        source: this.constructor.name,
        message: "Unable to call method on destroyed component"
      });
    }
  }
  addRendererEventListener(eventType, listener) {
    this.throwIfDestroyed();
    if (this.rendererEventListeners.has(eventType)) {
      throw new NluxUsageError({
        source: this.constructor.name,
        message: `Unable to add event listener to rendererEvents "${eventType}" because it already exists`
      });
    }
    this.rendererEventListeners.set(eventType, listener);
  }
  destroyComponent(isListItem = false) {
    this.throwIfDestroyed();
    this.subComponents.forEach((subComp) => {
      subComp.destroy();
    });
    if (this.renderedDom) {
      if (this.renderedDom.elements) {
        this.renderedDom.elements = void 0;
      }
      if (this.renderedDom.actions) {
        this.renderedDom.actions = void 0;
      }
      if (this.renderedDom.onDestroy) {
        this.renderedDom.onDestroy();
      }
      const renderingRoot = this.renderingRoot;
      domOp(() => {
        if (!renderingRoot) {
          return;
        }
        if (renderingRoot instanceof DocumentFragment) {
          while (renderingRoot.firstChild) {
            renderingRoot.removeChild(renderingRoot.firstChild);
          }
        } else {
          if (isListItem) {
            renderingRoot.parentElement?.removeChild(renderingRoot);
          } else {
            emptyInnerHtml(renderingRoot);
          }
        }
      });
      this.renderedDom = null;
      this.renderingRoot = null;
    }
    this.__destroyed = true;
    this.__context = null;
    this.props = void 0;
    this.elementProps.clear();
    this.rendererEventListeners.clear();
    this.subComponents.clear();
  }
  getSubComponentPortal(id) {
    const subComp = this.subComponents.get(id);
    const rendererElementId = this.subComponentElementIds.get(id);
    if (!subComp || !rendererElementId) {
      return null;
    }
    const value = (this.renderedDom?.elements)[rendererElementId];
    return value instanceof HTMLElement ? value : null;
  }
  mountSubComponentToPortal(subComponentId, portal) {
    const subComp = this.subComponents.get(subComponentId);
    subComp?.render(portal);
  }
  schedulePropUpdate(propName, currentValue, newValue) {
    if (!this.renderedDom || !this.def?.update) {
      return;
    }
    const renderedDom = this.renderedDom;
    const renderingRoot = this.renderingRoot;
    const updater = this.def.update;
    if (!renderingRoot) {
      return;
    }
    domOp(() => {
      updater({
        propName,
        currentValue,
        newValue,
        dom: {
          root: renderingRoot,
          elements: renderedDom.elements,
          actions: renderedDom.actions
        },
        updateSubComponent: this.updateSubComponent
      });
    });
  }
}
BaseComp.__compEventListeners = null;
BaseComp.__compId = null;
BaseComp.__renderer = null;
BaseComp.__updater = null;

const Model = (compId, renderer, updater) => {
  return (target) => {
    target.__compId = compId;
    target.__renderer = renderer;
    target.__updater = updater;
  };
};
const CompEventListener = (eventName) => (target, methodName) => {
  const typedTarget = target;
  if (typeof typedTarget.constructor !== "function") {
    throw new NluxUsageError({
      source: "CallbackFor",
      message: `@CallbackFor can only be used on methods of a class!`
    });
  }
  if (!typedTarget.constructor.hasOwnProperty("__compEventListeners") || typedTarget.constructor.__compEventListeners === null) {
    typedTarget.constructor.__compEventListeners = /* @__PURE__ */ new Map();
  }
  const compEventListeners = typedTarget.constructor.__compEventListeners;
  const methodNames = compEventListeners.get(eventName);
  if (!methodNames) {
    compEventListeners.set(eventName, [methodName]);
  } else {
    methodNames.push(methodName);
  }
};

const renderedPhotoContainerClassName = "nlux-comp-avatarContainer";
const renderedPhotoClassName = "nlux-comp-avatarPicture";
const createPhotoContainerFromUrl = (url, name) => {
  const photoContainer = document.createElement("div");
  photoContainer.classList.add(renderedPhotoContainerClassName);
  if (url) {
    const photoDomElement = document.createElement("div");
    photoDomElement.classList.add(renderedPhotoClassName);
    photoDomElement.style.backgroundImage = `url("${encodeURI(url)}")`;
    photoContainer.append(photoDomElement);
  }
  return photoContainer;
};

const className$7 = "nlux-comp-avatar";
const createAvatarDom = (props) => {
  const element = document.createElement("div");
  element.classList.add(className$7);
  if (!props.avatar && !props.name) {
    return element;
  }
  if (props.name) {
    element.title = props.name;
  }
  if (props.avatar && props.avatar instanceof HTMLElement) {
    element.append(props.avatar.cloneNode(true));
    return element;
  }
  element.append(createPhotoContainerFromUrl(props.avatar));
  return element;
};

const directionClassName$1 = {
  received: "nlux_msg_received",
  sent: "nlux_msg_sent"
};
const applyNewDirectionClassName$1 = (element, direction) => {
  const directions = Object.keys(directionClassName$1);
  directions.forEach((directionName) => {
    element.classList.remove(directionClassName$1[directionName]);
  });
  if (directionClassName$1[direction]) {
    element.classList.add(directionClassName$1[direction]);
  }
};

const statusClassName$1 = {
  streaming: "nlux_msg_streaming",
  complete: "nlux_msg_complete"
};
const applyNewStatusClassName$1 = (element, status) => {
  const statuses = Object.keys(statusClassName$1);
  statuses.forEach((statusName) => {
    element.classList.remove(statusClassName$1[statusName]);
  });
  if (statusClassName$1[status]) {
    element.classList.add(statusClassName$1[status]);
  }
};

const addListenersToCopyButton = (copyButton) => {
  if (!(copyButton instanceof HTMLButtonElement)) {
    return;
  }
  if (copyButton.dataset.clickListenerSet === "true") {
    return;
  }
  let clicked = false;
  const codeBlock = copyButton.nextElementSibling;
  copyButton.addEventListener("click", () => {
    if (clicked || !codeBlock) {
      return;
    }
    const code = codeBlock.innerText;
    navigator.clipboard.writeText(code ?? "");
    clicked = true;
    copyButton.classList.add("clicked");
    setTimeout(() => {
      clicked = false;
      copyButton.classList.remove("clicked");
    }, 1e3);
  });
  copyButton.dataset.clickListenerSet = "true";
};
const attachCopyClickListener = (markdownContainer) => {
  const copyButtonCssClass = "nlux-comp-copyButton";
  if (markdownContainer instanceof HTMLButtonElement && markdownContainer.classList.contains(copyButtonCssClass)) {
    addListenersToCopyButton(markdownContainer);
    return;
  }
  markdownContainer.querySelectorAll(`.${copyButtonCssClass}`).forEach(addListenersToCopyButton);
};

const insertCopyToClipboardButton = (markdownContainer) => {
  markdownContainer.querySelectorAll(".code-block").forEach((codeBlockContainer) => {
    const codeBlock = codeBlockContainer.querySelector("pre");
    if (!codeBlock) {
      return;
    }
    if (codeBlockContainer.previousElementSibling?.classList.contains("nlux-comp-copyButton")) {
      return;
    }
    const title = "Copy code block to clipboard";
    const copyButton = document.createElement("button");
    copyButton.classList.add("nlux-comp-copyButton");
    copyButton.setAttribute("aria-label", title);
    copyButton.setAttribute("title", title);
    const copyIcon = document.createElement("span");
    copyIcon.classList.add("icon-copy");
    copyButton.appendChild(copyIcon);
    codeBlockContainer.appendChild(copyButton);
  });
};

function _getDefaults() {
  return {
    async: false,
    breaks: false,
    extensions: null,
    gfm: true,
    hooks: null,
    pedantic: false,
    renderer: null,
    silent: false,
    tokenizer: null,
    walkTokens: null
  };
}
let _defaults = _getDefaults();
function changeDefaults(newDefaults) {
  _defaults = newDefaults;
}

var __defProp$d = Object.defineProperty;
var __defNormalProp$5 = (obj, key, value) => key in obj ? __defProp$d(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$5 = (obj, key, value) => __defNormalProp$5(obj, typeof key !== "symbol" ? key + "" : key, value);
class _Hooks {
  constructor(options) {
    __publicField$5(this, "options");
    this.options = options || _defaults;
  }
  /**
   * Process HTML after marked is finished
   */
  postprocess(html) {
    return html;
  }
  /**
   * Process markdown before marked
   */
  preprocess(markdown) {
    return markdown;
  }
  /**
   * Process all tokens before walk tokens
   */
  processAllTokens(tokens) {
    return tokens;
  }
}
__publicField$5(_Hooks, "passThroughHooks", /* @__PURE__ */ new Set([
  "preprocess",
  "postprocess",
  "processAllTokens"
]));

const escapeTest = /[&<>"']/;
const escapeReplace = new RegExp(escapeTest.source, "g");
const escapeTestNoEncode = /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/;
const escapeReplaceNoEncode = new RegExp(escapeTestNoEncode.source, "g");
const escapeReplacements = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};
const getEscapeReplacement = (ch) => escapeReplacements[ch];
function escape$1(html, encode) {
  if (encode) {
    if (escapeTest.test(html)) {
      return html.replace(escapeReplace, getEscapeReplacement);
    }
  } else {
    if (escapeTestNoEncode.test(html)) {
      return html.replace(escapeReplaceNoEncode, getEscapeReplacement);
    }
  }
  return html;
}
const unescapeTest = /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig;
function unescape(html) {
  return html.replace(unescapeTest, (_, n) => {
    n = n.toLowerCase();
    if (n === "colon") {
      return ":";
    }
    if (n.charAt(0) === "#") {
      return n.charAt(1) === "x" ? String.fromCharCode(parseInt(n.substring(2), 16)) : String.fromCharCode(+n.substring(1));
    }
    return "";
  });
}
const caret = /(^|[^\[])\^/g;
function edit(regex, opt) {
  let source = typeof regex === "string" ? regex : regex.source;
  opt = opt || "";
  const obj = {
    replace: (name, val) => {
      let valSource = typeof val === "string" ? val : val.source;
      valSource = valSource.replace(caret, "$1");
      source = source.replace(name, valSource);
      return obj;
    },
    getRegex: () => {
      return new RegExp(source, opt);
    }
  };
  return obj;
}
function cleanUrl(href) {
  try {
    href = encodeURI(href).replace(/%25/g, "%");
  } catch (e) {
    return null;
  }
  return href;
}
const noopTest = { exec: () => null };
function splitCells(tableRow, count) {
  const row = tableRow.replace(/\|/g, (match, offset, str) => {
    let escaped = false;
    let curr = offset;
    while (--curr >= 0 && str[curr] === "\\") {
      escaped = !escaped;
    }
    if (escaped) {
      return "|";
    } else {
      return " |";
    }
  }), cells = row.split(/ \|/);
  let i = 0;
  if (!cells[0].trim()) {
    cells.shift();
  }
  if (cells.length > 0 && !cells[cells.length - 1].trim()) {
    cells.pop();
  }
  if (count) {
    if (cells.length > count) {
      cells.splice(count);
    } else {
      while (cells.length < count) {
        cells.push("");
      }
    }
  }
  for (; i < cells.length; i++) {
    cells[i] = cells[i].trim().replace(/\\\|/g, "|");
  }
  return cells;
}
function rtrim(str, c, invert) {
  const l = str.length;
  if (l === 0) {
    return "";
  }
  let suffLen = 0;
  while (suffLen < l) {
    const currChar = str.charAt(l - suffLen - 1);
    if (currChar === c && !invert) {
      suffLen++;
    } else {
      if (currChar !== c && invert) {
        suffLen++;
      } else {
        break;
      }
    }
  }
  return str.slice(0, l - suffLen);
}
function findClosingBracket(str, b) {
  if (str.indexOf(b[1]) === -1) {
    return -1;
  }
  let level = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "\\") {
      i++;
    } else {
      if (str[i] === b[0]) {
        level++;
      } else {
        if (str[i] === b[1]) {
          level--;
          if (level < 0) {
            return i;
          }
        }
      }
    }
  }
  return -1;
}

const newline = /^(?: *(?:\n|$))+/;
const blockCode = /^( {4}[^\n]+(?:\n(?: *(?:\n|$))*)?)+/;
const fences = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/;
const hr = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/;
const heading = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/;
const bullet = /(?:[*+-]|\d{1,9}[.)])/;
const lheading = edit(
  /^(?!bull |blockCode|fences|blockquote|heading|html)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html))+?)\n {0,3}(=+|-+) *(?:\n+|$)/
).replace(/bull/g, bullet).replace(/blockCode/g, / {4}/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).getRegex();
const _paragraph = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/;
const blockText = /^[^\n]+/;
const _blockLabel = /(?!\s*\])(?:\\.|[^\[\]\\])+/;
const def = edit(/^ {0,3}\[(label)\]: *(?:\n *)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n *)?| *\n *)(title))? *(?:\n+|$)/).replace("label", _blockLabel).replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex();
const list = edit(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g, bullet).getRegex();
const _tag = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";
const _comment = /<!--(?:-?>|[\s\S]*?(?:-->|$))/;
const html = edit(
  "^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n *)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n *)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n *)+\\n|$))",
  "i"
).replace("comment", _comment).replace("tag", _tag).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex();
const paragraph = edit(_paragraph).replace("hr", hr).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", _tag).getRegex();
const blockquote = edit(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph", paragraph).getRegex();
const blockNormal = {
  blockquote,
  code: blockCode,
  def,
  fences,
  heading,
  hr,
  html,
  lheading,
  list,
  newline,
  paragraph,
  table: noopTest,
  text: blockText
};
const gfmTable = edit(
  "^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)"
).replace("hr", hr).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", " {4}[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", _tag).getRegex();
const blockGfm = {
  ...blockNormal,
  table: gfmTable,
  paragraph: edit(_paragraph).replace("hr", hr).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", gfmTable).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", _tag).getRegex()
};
const blockPedantic = {
  ...blockNormal,
  html: edit(
    `^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`
  ).replace("comment", _comment).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),
  def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
  heading: /^(#{1,6})(.*)(?:\n+|$)/,
  fences: noopTest,
  // fences not supported
  lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,
  paragraph: edit(_paragraph).replace("hr", hr).replace("heading", " *#{1,6} *[^\n]").replace("lheading", lheading).replace("|table", "").replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").replace("|tag", "").getRegex()
};
const escape = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/;
const inlineCode = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/;
const br = /^( {2,}|\\)\n(?!\s*$)/;
const inlineText = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/;
const _punctuation = "\\p{P}\\p{S}";
const punctuation = edit(/^((?![*_])[\spunctuation])/, "u").replace(/punctuation/g, _punctuation).getRegex();
const blockSkip = /\[[^[\]]*?\]\([^\(\)]*?\)|`[^`]*?`|<[^<>]*?>/g;
const emStrongLDelim = edit(/^(?:\*+(?:((?!\*)[punct])|[^\s*]))|^_+(?:((?!_)[punct])|([^\s_]))/, "u").replace(/punct/g, _punctuation).getRegex();
const emStrongRDelimAst = edit(
  "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)[punct](\\*+)(?=[\\s]|$)|[^punct\\s](\\*+)(?!\\*)(?=[punct\\s]|$)|(?!\\*)[punct\\s](\\*+)(?=[^punct\\s])|[\\s](\\*+)(?!\\*)(?=[punct])|(?!\\*)[punct](\\*+)(?!\\*)(?=[punct])|[^punct\\s](\\*+)(?=[^punct\\s])",
  "gu"
).replace(/punct/g, _punctuation).getRegex();
const emStrongRDelimUnd = edit(
  "^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)[punct](_+)(?=[\\s]|$)|[^punct\\s](_+)(?!_)(?=[punct\\s]|$)|(?!_)[punct\\s](_+)(?=[^punct\\s])|[\\s](_+)(?!_)(?=[punct])|(?!_)[punct](_+)(?!_)(?=[punct])",
  "gu"
).replace(/punct/g, _punctuation).getRegex();
const anyPunctuation = edit(/\\([punct])/, "gu").replace(/punct/g, _punctuation).getRegex();
const autolink = edit(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace(
  "email",
  /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/
).getRegex();
const _inlineComment = edit(_comment).replace("(?:-->|$)", "-->").getRegex();
const tag = edit(
  "^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>"
).replace("comment", _inlineComment).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex();
const _inlineLabel = /(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/;
const link = edit(/^!?\[(label)\]\(\s*(href)(?:\s+(title))?\s*\)/).replace("label", _inlineLabel).replace("href", /<(?:\\.|[^\n<>\\])+>|[^\s\x00-\x1f]*/).replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex();
const reflink = edit(/^!?\[(label)\]\[(ref)\]/).replace("label", _inlineLabel).replace("ref", _blockLabel).getRegex();
const nolink = edit(/^!?\[(ref)\](?:\[\])?/).replace("ref", _blockLabel).getRegex();
const reflinkSearch = edit("reflink|nolink(?!\\()", "g").replace("reflink", reflink).replace("nolink", nolink).getRegex();
const inlineNormal = {
  _backpedal: noopTest,
  // only used for GFM url
  anyPunctuation,
  autolink,
  blockSkip,
  br,
  code: inlineCode,
  del: noopTest,
  emStrongLDelim,
  emStrongRDelimAst,
  emStrongRDelimUnd,
  escape,
  link,
  nolink,
  punctuation,
  reflink,
  reflinkSearch,
  tag,
  text: inlineText,
  url: noopTest
};
const inlinePedantic = {
  ...inlineNormal,
  link: edit(/^!?\[(label)\]\((.*?)\)/).replace("label", _inlineLabel).getRegex(),
  reflink: edit(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", _inlineLabel).getRegex()
};
const inlineGfm = {
  ...inlineNormal,
  escape: edit(escape).replace("])", "~|])").getRegex(),
  url: edit(/^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/, "i").replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),
  _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,
  del: /^(~~?)(?=[^\s~])([\s\S]*?[^\s~])\1(?=[^~]|$)/,
  text: /^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/
};
const inlineBreaks = {
  ...inlineGfm,
  br: edit(br).replace("{2,}", "*").getRegex(),
  text: edit(inlineGfm.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex()
};
const block = {
  normal: blockNormal,
  gfm: blockGfm,
  pedantic: blockPedantic
};
const inline = {
  normal: inlineNormal,
  gfm: inlineGfm,
  breaks: inlineBreaks,
  pedantic: inlinePedantic
};

var __defProp$c = Object.defineProperty;
var __defNormalProp$4 = (obj, key, value) => key in obj ? __defProp$c(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$4 = (obj, key, value) => __defNormalProp$4(obj, typeof key !== "symbol" ? key + "" : key, value);
function outputLink(cap, link, raw, lexer) {
  const href = link.href;
  const title = link.title ? escape$1(link.title) : null;
  const text = cap[1].replace(/\\([\[\]])/g, "$1");
  if (cap[0].charAt(0) !== "!") {
    lexer.state.inLink = true;
    const token = {
      type: "link",
      raw,
      href,
      title,
      text,
      tokens: lexer.inlineTokens(text)
    };
    lexer.state.inLink = false;
    return token;
  }
  return {
    type: "image",
    raw,
    href,
    title,
    text: escape$1(text)
  };
}
function indentCodeCompensation(raw, text) {
  const matchIndentToCode = raw.match(/^(\s+)(?:```)/);
  if (matchIndentToCode === null) {
    return text;
  }
  const indentToCode = matchIndentToCode[1];
  return text.split("\n").map((node) => {
    const matchIndentInNode = node.match(/^\s+/);
    if (matchIndentInNode === null) {
      return node;
    }
    const [indentInNode] = matchIndentInNode;
    if (indentInNode.length >= indentToCode.length) {
      return node.slice(indentToCode.length);
    }
    return node;
  }).join("\n");
}
class _Tokenizer {
  // set by the lexer
  constructor(options) {
    __publicField$4(this, "lexer");
    // set by the lexer
    __publicField$4(this, "options");
    __publicField$4(this, "rules");
    this.options = options || _defaults;
  }
  autolink(src) {
    const cap = this.rules.inline.autolink.exec(src);
    if (cap) {
      let text, href;
      if (cap[2] === "@") {
        text = escape$1(cap[1]);
        href = "mailto:" + text;
      } else {
        text = escape$1(cap[1]);
        href = text;
      }
      return {
        type: "link",
        raw: cap[0],
        text,
        href,
        tokens: [
          {
            type: "text",
            raw: text,
            text
          }
        ]
      };
    }
  }
  blockquote(src) {
    const cap = this.rules.block.blockquote.exec(src);
    if (cap) {
      let text = cap[0].replace(/\n {0,3}((?:=+|-+) *)(?=\n|$)/g, "\n    $1");
      text = rtrim(text.replace(/^ *>[ \t]?/gm, ""), "\n");
      const top = this.lexer.state.top;
      this.lexer.state.top = true;
      const tokens = this.lexer.blockTokens(text);
      this.lexer.state.top = top;
      return {
        type: "blockquote",
        raw: cap[0],
        tokens,
        text
      };
    }
  }
  br(src) {
    const cap = this.rules.inline.br.exec(src);
    if (cap) {
      return {
        type: "br",
        raw: cap[0]
      };
    }
  }
  code(src) {
    const cap = this.rules.block.code.exec(src);
    if (cap) {
      const text = cap[0].replace(/^ {1,4}/gm, "");
      return {
        type: "code",
        raw: cap[0],
        codeBlockStyle: "indented",
        text: !this.options.pedantic ? rtrim(text, "\n") : text
      };
    }
  }
  codespan(src) {
    const cap = this.rules.inline.code.exec(src);
    if (cap) {
      let text = cap[2].replace(/\n/g, " ");
      const hasNonSpaceChars = /[^ ]/.test(text);
      const hasSpaceCharsOnBothEnds = /^ /.test(text) && / $/.test(text);
      if (hasNonSpaceChars && hasSpaceCharsOnBothEnds) {
        text = text.substring(1, text.length - 1);
      }
      text = escape$1(text, true);
      return {
        type: "codespan",
        raw: cap[0],
        text
      };
    }
  }
  def(src) {
    const cap = this.rules.block.def.exec(src);
    if (cap) {
      const tag = cap[1].toLowerCase().replace(/\s+/g, " ");
      const href = cap[2] ? cap[2].replace(/^<(.*)>$/, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "";
      const title = cap[3] ? cap[3].substring(1, cap[3].length - 1).replace(
        this.rules.inline.anyPunctuation,
        "$1"
      ) : cap[3];
      return {
        type: "def",
        tag,
        raw: cap[0],
        href,
        title
      };
    }
  }
  del(src) {
    const cap = this.rules.inline.del.exec(src);
    if (cap) {
      return {
        type: "del",
        raw: cap[0],
        text: cap[2],
        tokens: this.lexer.inlineTokens(cap[2])
      };
    }
  }
  emStrong(src, maskedSrc, prevChar = "") {
    let match = this.rules.inline.emStrongLDelim.exec(src);
    if (!match) {
      return;
    }
    if (match[3] && prevChar.match(/[\p{L}\p{N}]/u)) {
      return;
    }
    const nextChar = match[1] || match[2] || "";
    if (!nextChar || !prevChar || this.rules.inline.punctuation.exec(prevChar)) {
      const lLength = [...match[0]].length - 1;
      let rDelim, rLength, delimTotal = lLength, midDelimTotal = 0;
      const endReg = match[0][0] === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
      endReg.lastIndex = 0;
      maskedSrc = maskedSrc.slice(-1 * src.length + lLength);
      while ((match = endReg.exec(maskedSrc)) != null) {
        rDelim = match[1] || match[2] || match[3] || match[4] || match[5] || match[6];
        if (!rDelim) {
          continue;
        }
        rLength = [...rDelim].length;
        if (match[3] || match[4]) {
          delimTotal += rLength;
          continue;
        } else {
          if (match[5] || match[6]) {
            if (lLength % 3 && !((lLength + rLength) % 3)) {
              midDelimTotal += rLength;
              continue;
            }
          }
        }
        delimTotal -= rLength;
        if (delimTotal > 0) {
          continue;
        }
        rLength = Math.min(rLength, rLength + delimTotal + midDelimTotal);
        const lastCharLength = [...match[0]][0].length;
        const raw = src.slice(0, lLength + match.index + lastCharLength + rLength);
        if (Math.min(lLength, rLength) % 2) {
          const text2 = raw.slice(1, -1);
          return {
            type: "em",
            raw,
            text: text2,
            tokens: this.lexer.inlineTokens(text2)
          };
        }
        const text = raw.slice(2, -2);
        return {
          type: "strong",
          raw,
          text,
          tokens: this.lexer.inlineTokens(text)
        };
      }
    }
  }
  escape(src) {
    const cap = this.rules.inline.escape.exec(src);
    if (cap) {
      return {
        type: "escape",
        raw: cap[0],
        text: escape$1(cap[1])
      };
    }
  }
  fences(src) {
    const cap = this.rules.block.fences.exec(src);
    if (cap) {
      const raw = cap[0];
      const text = indentCodeCompensation(raw, cap[3] || "");
      return {
        type: "code",
        raw,
        lang: cap[2] ? cap[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : cap[2],
        text
      };
    }
  }
  heading(src) {
    const cap = this.rules.block.heading.exec(src);
    if (cap) {
      let text = cap[2].trim();
      if (/#$/.test(text)) {
        const trimmed = rtrim(text, "#");
        if (this.options.pedantic) {
          text = trimmed.trim();
        } else {
          if (!trimmed || / $/.test(trimmed)) {
            text = trimmed.trim();
          }
        }
      }
      return {
        type: "heading",
        raw: cap[0],
        depth: cap[1].length,
        text,
        tokens: this.lexer.inline(text)
      };
    }
  }
  hr(src) {
    const cap = this.rules.block.hr.exec(src);
    if (cap) {
      return {
        type: "hr",
        raw: cap[0]
      };
    }
  }
  html(src) {
    const cap = this.rules.block.html.exec(src);
    if (cap) {
      const token = {
        type: "html",
        block: true,
        raw: cap[0],
        pre: cap[1] === "pre" || cap[1] === "script" || cap[1] === "style",
        text: cap[0]
      };
      return token;
    }
  }
  inlineText(src) {
    const cap = this.rules.inline.text.exec(src);
    if (cap) {
      let text;
      if (this.lexer.state.inRawBlock) {
        text = cap[0];
      } else {
        text = escape$1(cap[0]);
      }
      return {
        type: "text",
        raw: cap[0],
        text
      };
    }
  }
  lheading(src) {
    const cap = this.rules.block.lheading.exec(src);
    if (cap) {
      return {
        type: "heading",
        raw: cap[0],
        depth: cap[2].charAt(0) === "=" ? 1 : 2,
        text: cap[1],
        tokens: this.lexer.inline(cap[1])
      };
    }
  }
  link(src) {
    const cap = this.rules.inline.link.exec(src);
    if (cap) {
      const trimmedUrl = cap[2].trim();
      if (!this.options.pedantic && /^</.test(trimmedUrl)) {
        if (!/>$/.test(trimmedUrl)) {
          return;
        }
        const rtrimSlash = rtrim(trimmedUrl.slice(0, -1), "\\");
        if ((trimmedUrl.length - rtrimSlash.length) % 2 === 0) {
          return;
        }
      } else {
        const lastParenIndex = findClosingBracket(cap[2], "()");
        if (lastParenIndex > -1) {
          const start = cap[0].indexOf("!") === 0 ? 5 : 4;
          const linkLen = start + cap[1].length + lastParenIndex;
          cap[2] = cap[2].substring(0, lastParenIndex);
          cap[0] = cap[0].substring(0, linkLen).trim();
          cap[3] = "";
        }
      }
      let href = cap[2];
      let title = "";
      if (this.options.pedantic) {
        const link = /^([^'"]*[^\s])\s+(['"])(.*)\2/.exec(href);
        if (link) {
          href = link[1];
          title = link[3];
        }
      } else {
        title = cap[3] ? cap[3].slice(1, -1) : "";
      }
      href = href.trim();
      if (/^</.test(href)) {
        if (this.options.pedantic && !/>$/.test(trimmedUrl)) {
          href = href.slice(1);
        } else {
          href = href.slice(1, -1);
        }
      }
      return outputLink(cap, {
        href: href ? href.replace(this.rules.inline.anyPunctuation, "$1") : href,
        title: title ? title.replace(this.rules.inline.anyPunctuation, "$1") : title
      }, cap[0], this.lexer);
    }
  }
  list(src) {
    let cap = this.rules.block.list.exec(src);
    if (cap) {
      let bull = cap[1].trim();
      const isordered = bull.length > 1;
      const list = {
        type: "list",
        raw: "",
        ordered: isordered,
        start: isordered ? +bull.slice(0, -1) : "",
        loose: false,
        items: []
      };
      bull = isordered ? `\\d{1,9}\\${bull.slice(-1)}` : `\\${bull}`;
      if (this.options.pedantic) {
        bull = isordered ? bull : "[*+-]";
      }
      const itemRegex = new RegExp(`^( {0,3}${bull})((?:[	 ][^\\n]*)?(?:\\n|$))`);
      let raw = "";
      let itemContents = "";
      let endsWithBlankLine = false;
      while (src) {
        let endEarly = false;
        if (!(cap = itemRegex.exec(src))) {
          break;
        }
        if (this.rules.block.hr.test(src)) {
          break;
        }
        raw = cap[0];
        src = src.substring(raw.length);
        let line = cap[2].split("\n", 1)[0].replace(/^\t+/, (t) => " ".repeat(3 * t.length));
        let nextLine = src.split("\n", 1)[0];
        let indent = 0;
        if (this.options.pedantic) {
          indent = 2;
          itemContents = line.trimStart();
        } else {
          indent = cap[2].search(/[^ ]/);
          indent = indent > 4 ? 1 : indent;
          itemContents = line.slice(indent);
          indent += cap[1].length;
        }
        let blankLine = false;
        if (!line && /^ *$/.test(nextLine)) {
          raw += nextLine + "\n";
          src = src.substring(nextLine.length + 1);
          endEarly = true;
        }
        if (!endEarly) {
          const nextBulletRegex = new RegExp(
            `^ {0,${Math.min(3, indent - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`
          );
          const hrRegex = new RegExp(
            `^ {0,${Math.min(3, indent - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`
          );
          const fencesBeginRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:\`\`\`|~~~)`);
          const headingBeginRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}#`);
          while (src) {
            const rawLine = src.split("\n", 1)[0];
            nextLine = rawLine;
            if (this.options.pedantic) {
              nextLine = nextLine.replace(/^ {1,4}(?=( {4})*[^ ])/g, "  ");
            }
            if (fencesBeginRegex.test(nextLine)) {
              break;
            }
            if (headingBeginRegex.test(nextLine)) {
              break;
            }
            if (nextBulletRegex.test(nextLine)) {
              break;
            }
            if (hrRegex.test(src)) {
              break;
            }
            if (nextLine.search(/[^ ]/) >= indent || !nextLine.trim()) {
              itemContents += "\n" + nextLine.slice(indent);
            } else {
              if (blankLine) {
                break;
              }
              if (line.search(/[^ ]/) >= 4) {
                break;
              }
              if (fencesBeginRegex.test(line)) {
                break;
              }
              if (headingBeginRegex.test(line)) {
                break;
              }
              if (hrRegex.test(line)) {
                break;
              }
              itemContents += "\n" + nextLine;
            }
            if (!blankLine && !nextLine.trim()) {
              blankLine = true;
            }
            raw += rawLine + "\n";
            src = src.substring(rawLine.length + 1);
            line = nextLine.slice(indent);
          }
        }
        if (!list.loose) {
          if (endsWithBlankLine) {
            list.loose = true;
          } else {
            if (/\n *\n *$/.test(raw)) {
              endsWithBlankLine = true;
            }
          }
        }
        let istask = null;
        let ischecked;
        if (this.options.gfm) {
          istask = /^\[[ xX]\] /.exec(itemContents);
          if (istask) {
            ischecked = istask[0] !== "[ ] ";
            itemContents = itemContents.replace(/^\[[ xX]\] +/, "");
          }
        }
        list.items.push({
          type: "list_item",
          raw,
          task: !!istask,
          checked: ischecked,
          loose: false,
          text: itemContents,
          tokens: []
        });
        list.raw += raw;
      }
      list.items[list.items.length - 1].raw = raw.trimEnd();
      list.items[list.items.length - 1].text = itemContents.trimEnd();
      list.raw = list.raw.trimEnd();
      for (let i = 0; i < list.items.length; i++) {
        this.lexer.state.top = false;
        list.items[i].tokens = this.lexer.blockTokens(list.items[i].text, []);
        if (!list.loose) {
          const spacers = list.items[i].tokens.filter((t) => t.type === "space");
          const hasMultipleLineBreaks = spacers.length > 0 && spacers.some((t) => /\n.*\n/.test(t.raw));
          list.loose = hasMultipleLineBreaks;
        }
      }
      if (list.loose) {
        for (let i = 0; i < list.items.length; i++) {
          list.items[i].loose = true;
        }
      }
      return list;
    }
  }
  paragraph(src) {
    const cap = this.rules.block.paragraph.exec(src);
    if (cap) {
      const text = cap[1].charAt(cap[1].length - 1) === "\n" ? cap[1].slice(0, -1) : cap[1];
      return {
        type: "paragraph",
        raw: cap[0],
        text,
        tokens: this.lexer.inline(text)
      };
    }
  }
  reflink(src, links) {
    let cap;
    if ((cap = this.rules.inline.reflink.exec(src)) || (cap = this.rules.inline.nolink.exec(src))) {
      const linkString = (cap[2] || cap[1]).replace(/\s+/g, " ");
      const link = links[linkString.toLowerCase()];
      if (!link) {
        const text = cap[0].charAt(0);
        return {
          type: "text",
          raw: text,
          text
        };
      }
      return outputLink(cap, link, cap[0], this.lexer);
    }
  }
  space(src) {
    const cap = this.rules.block.newline.exec(src);
    if (cap && cap[0].length > 0) {
      return {
        type: "space",
        raw: cap[0]
      };
    }
  }
  table(src) {
    const cap = this.rules.block.table.exec(src);
    if (!cap) {
      return;
    }
    if (!/[:|]/.test(cap[2])) {
      return;
    }
    const headers = splitCells(cap[1]);
    const aligns = cap[2].replace(/^\||\| *$/g, "").split("|");
    const rows = cap[3] && cap[3].trim() ? cap[3].replace(/\n[ \t]*$/, "").split("\n") : [];
    const item = {
      type: "table",
      raw: cap[0],
      header: [],
      align: [],
      rows: []
    };
    if (headers.length !== aligns.length) {
      return;
    }
    for (const align of aligns) {
      if (/^ *-+: *$/.test(align)) {
        item.align.push("right");
      } else {
        if (/^ *:-+: *$/.test(align)) {
          item.align.push("center");
        } else {
          if (/^ *:-+ *$/.test(align)) {
            item.align.push("left");
          } else {
            item.align.push(null);
          }
        }
      }
    }
    for (const header of headers) {
      item.header.push({
        text: header,
        tokens: this.lexer.inline(header)
      });
    }
    for (const row of rows) {
      item.rows.push(splitCells(row, item.header.length).map((cell) => {
        return {
          text: cell,
          tokens: this.lexer.inline(cell)
        };
      }));
    }
    return item;
  }
  tag(src) {
    const cap = this.rules.inline.tag.exec(src);
    if (cap) {
      if (!this.lexer.state.inLink && /^<a /i.test(cap[0])) {
        this.lexer.state.inLink = true;
      } else {
        if (this.lexer.state.inLink && /^<\/a>/i.test(cap[0])) {
          this.lexer.state.inLink = false;
        }
      }
      if (!this.lexer.state.inRawBlock && /^<(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
        this.lexer.state.inRawBlock = true;
      } else {
        if (this.lexer.state.inRawBlock && /^<\/(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
          this.lexer.state.inRawBlock = false;
        }
      }
      return {
        type: "html",
        raw: cap[0],
        inLink: this.lexer.state.inLink,
        inRawBlock: this.lexer.state.inRawBlock,
        block: false,
        text: cap[0]
      };
    }
  }
  text(src) {
    const cap = this.rules.block.text.exec(src);
    if (cap) {
      return {
        type: "text",
        raw: cap[0],
        text: cap[0],
        tokens: this.lexer.inline(cap[0])
      };
    }
  }
  url(src) {
    let cap;
    if (cap = this.rules.inline.url.exec(src)) {
      let text, href;
      if (cap[2] === "@") {
        text = escape$1(cap[0]);
        href = "mailto:" + text;
      } else {
        let prevCapZero;
        do {
          prevCapZero = cap[0];
          cap[0] = this.rules.inline._backpedal.exec(cap[0])?.[0] ?? "";
        } while (prevCapZero !== cap[0]);
        text = escape$1(cap[0]);
        if (cap[1] === "www.") {
          href = "http://" + cap[0];
        } else {
          href = cap[0];
        }
      }
      return {
        type: "link",
        raw: cap[0],
        text,
        href,
        tokens: [
          {
            type: "text",
            raw: text,
            text
          }
        ]
      };
    }
  }
}

var __defProp$b = Object.defineProperty;
var __defNormalProp$3 = (obj, key, value) => key in obj ? __defProp$b(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$3 = (obj, key, value) => __defNormalProp$3(obj, typeof key !== "symbol" ? key + "" : key, value);
class _Lexer {
  constructor(options) {
    __publicField$3(this, "options");
    __publicField$3(this, "state");
    __publicField$3(this, "tokens");
    __publicField$3(this, "inlineQueue");
    __publicField$3(this, "tokenizer");
    this.tokens = [];
    this.tokens.links = /* @__PURE__ */ Object.create(null);
    this.options = options || _defaults;
    this.options.tokenizer = this.options.tokenizer || new _Tokenizer();
    this.tokenizer = this.options.tokenizer;
    this.tokenizer.options = this.options;
    this.tokenizer.lexer = this;
    this.inlineQueue = [];
    this.state = {
      inLink: false,
      inRawBlock: false,
      top: true
    };
    const rules = {
      block: block.normal,
      inline: inline.normal
    };
    if (this.options.pedantic) {
      rules.block = block.pedantic;
      rules.inline = inline.pedantic;
    } else {
      if (this.options.gfm) {
        rules.block = block.gfm;
        if (this.options.breaks) {
          rules.inline = inline.breaks;
        } else {
          rules.inline = inline.gfm;
        }
      }
    }
    this.tokenizer.rules = rules;
  }
  /**
   * Expose Rules
   */
  static get rules() {
    return {
      block,
      inline
    };
  }
  /**
   * Static Lex Method
   */
  static lex(src, options) {
    const lexer = new _Lexer(options);
    return lexer.lex(src);
  }
  /**
   * Static Lex Inline Method
   */
  static lexInline(src, options) {
    const lexer = new _Lexer(options);
    return lexer.inlineTokens(src);
  }
  blockTokens(src, tokens = []) {
    if (this.options.pedantic) {
      src = src.replace(/\t/g, "    ").replace(/^ +$/gm, "");
    } else {
      src = src.replace(/^( *)(\t+)/gm, (_, leading, tabs) => {
        return leading + "    ".repeat(tabs.length);
      });
    }
    let token;
    let lastToken;
    let cutSrc;
    let lastParagraphClipped;
    while (src) {
      if (this.options.extensions && this.options.extensions.block && this.options.extensions.block.some((extTokenizer) => {
        if (token = extTokenizer.call({ lexer: this }, src, tokens)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          return true;
        }
        return false;
      })) {
        continue;
      }
      if (token = this.tokenizer.space(src)) {
        src = src.substring(token.raw.length);
        if (token.raw.length === 1 && tokens.length > 0) {
          tokens[tokens.length - 1].raw += "\n";
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (token = this.tokenizer.code(src)) {
        src = src.substring(token.raw.length);
        lastToken = tokens[tokens.length - 1];
        if (lastToken && (lastToken.type === "paragraph" || lastToken.type === "text")) {
          lastToken.raw += "\n" + token.raw;
          lastToken.text += "\n" + token.text;
          this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (token = this.tokenizer.fences(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.heading(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.hr(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.blockquote(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.list(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.html(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.def(src)) {
        src = src.substring(token.raw.length);
        lastToken = tokens[tokens.length - 1];
        if (lastToken && (lastToken.type === "paragraph" || lastToken.type === "text")) {
          lastToken.raw += "\n" + token.raw;
          lastToken.text += "\n" + token.raw;
          this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
        } else {
          if (!this.tokens.links[token.tag]) {
            this.tokens.links[token.tag] = {
              href: token.href,
              title: token.title
            };
          }
        }
        continue;
      }
      if (token = this.tokenizer.table(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.lheading(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      cutSrc = src;
      if (this.options.extensions && this.options.extensions.startBlock) {
        let startIndex = Infinity;
        const tempSrc = src.slice(1);
        let tempStart;
        this.options.extensions.startBlock.forEach((getStartIndex) => {
          tempStart = getStartIndex.call({ lexer: this }, tempSrc);
          if (typeof tempStart === "number" && tempStart >= 0) {
            startIndex = Math.min(startIndex, tempStart);
          }
        });
        if (startIndex < Infinity && startIndex >= 0) {
          cutSrc = src.substring(0, startIndex + 1);
        }
      }
      if (this.state.top && (token = this.tokenizer.paragraph(cutSrc))) {
        lastToken = tokens[tokens.length - 1];
        if (lastParagraphClipped && lastToken.type === "paragraph") {
          lastToken.raw += "\n" + token.raw;
          lastToken.text += "\n" + token.text;
          this.inlineQueue.pop();
          this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
        } else {
          tokens.push(token);
        }
        lastParagraphClipped = cutSrc.length !== src.length;
        src = src.substring(token.raw.length);
        continue;
      }
      if (token = this.tokenizer.text(src)) {
        src = src.substring(token.raw.length);
        lastToken = tokens[tokens.length - 1];
        if (lastToken && lastToken.type === "text") {
          lastToken.raw += "\n" + token.raw;
          lastToken.text += "\n" + token.text;
          this.inlineQueue.pop();
          this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (src) {
        const errMsg = "Infinite loop on byte: " + src.charCodeAt(0);
        if (this.options.silent) {
          console.error(errMsg);
          break;
        } else {
          throw new Error(errMsg);
        }
      }
    }
    this.state.top = true;
    return tokens;
  }
  inline(src, tokens = []) {
    this.inlineQueue.push({ src, tokens });
    return tokens;
  }
  /**
   * Lexing/Compiling
   */
  inlineTokens(src, tokens = []) {
    let token, lastToken, cutSrc;
    let maskedSrc = src;
    let match;
    let keepPrevChar, prevChar;
    if (this.tokens.links) {
      const links = Object.keys(this.tokens.links);
      if (links.length > 0) {
        while ((match = this.tokenizer.rules.inline.reflinkSearch.exec(maskedSrc)) != null) {
          if (links.includes(match[0].slice(match[0].lastIndexOf("[") + 1, -1))) {
            maskedSrc = maskedSrc.slice(0, match.index) + "[" + "a".repeat(match[0].length - 2) + "]" + maskedSrc.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex);
          }
        }
      }
    }
    while ((match = this.tokenizer.rules.inline.blockSkip.exec(maskedSrc)) != null) {
      maskedSrc = maskedSrc.slice(0, match.index) + "[" + "a".repeat(match[0].length - 2) + "]" + maskedSrc.slice(
        this.tokenizer.rules.inline.blockSkip.lastIndex
      );
    }
    while ((match = this.tokenizer.rules.inline.anyPunctuation.exec(maskedSrc)) != null) {
      maskedSrc = maskedSrc.slice(0, match.index) + "++" + maskedSrc.slice(
        this.tokenizer.rules.inline.anyPunctuation.lastIndex
      );
    }
    while (src) {
      if (!keepPrevChar) {
        prevChar = "";
      }
      keepPrevChar = false;
      if (this.options.extensions && this.options.extensions.inline && this.options.extensions.inline.some((extTokenizer) => {
        if (token = extTokenizer.call({ lexer: this }, src, tokens)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          return true;
        }
        return false;
      })) {
        continue;
      }
      if (token = this.tokenizer.escape(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.tag(src)) {
        src = src.substring(token.raw.length);
        lastToken = tokens[tokens.length - 1];
        if (lastToken && token.type === "text" && lastToken.type === "text") {
          lastToken.raw += token.raw;
          lastToken.text += token.text;
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (token = this.tokenizer.link(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.reflink(src, this.tokens.links)) {
        src = src.substring(token.raw.length);
        lastToken = tokens[tokens.length - 1];
        if (lastToken && token.type === "text" && lastToken.type === "text") {
          lastToken.raw += token.raw;
          lastToken.text += token.text;
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (token = this.tokenizer.emStrong(src, maskedSrc, prevChar)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.codespan(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.br(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.del(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.autolink(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (!this.state.inLink && (token = this.tokenizer.url(src))) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      cutSrc = src;
      if (this.options.extensions && this.options.extensions.startInline) {
        let startIndex = Infinity;
        const tempSrc = src.slice(1);
        let tempStart;
        this.options.extensions.startInline.forEach((getStartIndex) => {
          tempStart = getStartIndex.call({ lexer: this }, tempSrc);
          if (typeof tempStart === "number" && tempStart >= 0) {
            startIndex = Math.min(startIndex, tempStart);
          }
        });
        if (startIndex < Infinity && startIndex >= 0) {
          cutSrc = src.substring(0, startIndex + 1);
        }
      }
      if (token = this.tokenizer.inlineText(cutSrc)) {
        src = src.substring(token.raw.length);
        if (token.raw.slice(-1) !== "_") {
          prevChar = token.raw.slice(-1);
        }
        keepPrevChar = true;
        lastToken = tokens[tokens.length - 1];
        if (lastToken && lastToken.type === "text") {
          lastToken.raw += token.raw;
          lastToken.text += token.text;
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (src) {
        const errMsg = "Infinite loop on byte: " + src.charCodeAt(0);
        if (this.options.silent) {
          console.error(errMsg);
          break;
        } else {
          throw new Error(errMsg);
        }
      }
    }
    return tokens;
  }
  /**
   * Preprocessing
   */
  lex(src) {
    src = src.replace(/\r\n|\r/g, "\n");
    this.blockTokens(src, this.tokens);
    for (let i = 0; i < this.inlineQueue.length; i++) {
      const next = this.inlineQueue[i];
      this.inlineTokens(next.src, next.tokens);
    }
    this.inlineQueue = [];
    return this.tokens;
  }
}

var __defProp$a = Object.defineProperty;
var __defNormalProp$2 = (obj, key, value) => key in obj ? __defProp$a(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$2 = (obj, key, value) => __defNormalProp$2(obj, key + "" , value);
class _Renderer {
  constructor(options) {
    __publicField$2(this, "options");
    this.options = options || _defaults;
  }
  blockquote(quote) {
    return `<blockquote>
${quote}</blockquote>
`;
  }
  br() {
    return "<br>";
  }
  checkbox(checked) {
    return "<input " + (checked ? 'checked="" ' : "") + 'disabled="" type="checkbox">';
  }
  code(code, infostring, escaped) {
    const lang = (infostring || "").match(/^\S*/)?.[0];
    code = code.replace(/\n$/, "") + "\n";
    if (!lang) {
      return "<pre><code>" + (escaped ? code : escape$1(code, true)) + "</code></pre>\n";
    }
    return '<pre><code class="language-' + escape$1(lang) + '">' + (escaped ? code : escape$1(code, true)) + "</code></pre>\n";
  }
  codespan(text) {
    return `<code>${text}</code>`;
  }
  del(text) {
    return `<del>${text}</del>`;
  }
  em(text) {
    return `<em>${text}</em>`;
  }
  heading(text, level, raw) {
    return `<h${level}>${text}</h${level}>
`;
  }
  hr() {
    return "<hr>\n";
  }
  html(html, block) {
    return html;
  }
  image(href, title, text) {
    const cleanHref = cleanUrl(href);
    if (cleanHref === null) {
      return text;
    }
    href = cleanHref;
    let out = `<img src="${href}" alt="${text}"`;
    if (title) {
      out += ` title="${title}"`;
    }
    out += ">";
    return out;
  }
  link(href, title, text) {
    const cleanHref = cleanUrl(href);
    if (cleanHref === null) {
      return text;
    }
    href = cleanHref;
    let out = '<a href="' + href + '"';
    if (title) {
      out += ' title="' + title + '"';
    }
    out += ">" + text + "</a>";
    return out;
  }
  list(body, ordered, start) {
    const type = ordered ? "ol" : "ul";
    const startatt = ordered && start !== 1 ? ' start="' + start + '"' : "";
    return "<" + type + startatt + ">\n" + body + "</" + type + ">\n";
  }
  listitem(text, task, checked) {
    return `<li>${text}</li>
`;
  }
  paragraph(text) {
    return `<p>${text}</p>
`;
  }
  /**
   * span level renderer
   */
  strong(text) {
    return `<strong>${text}</strong>`;
  }
  table(header, body) {
    if (body) {
      body = `<tbody>${body}</tbody>`;
    }
    return "<table>\n<thead>\n" + header + "</thead>\n" + body + "</table>\n";
  }
  tablecell(content, flags) {
    const type = flags.header ? "th" : "td";
    const tag = flags.align ? `<${type} align="${flags.align}">` : `<${type}>`;
    return tag + content + `</${type}>
`;
  }
  tablerow(content) {
    return `<tr>
${content}</tr>
`;
  }
  text(text) {
    return text;
  }
}

class _TextRenderer {
  br() {
    return "";
  }
  codespan(text) {
    return text;
  }
  del(text) {
    return text;
  }
  em(text) {
    return text;
  }
  html(text) {
    return text;
  }
  image(href, title, text) {
    return "" + text;
  }
  link(href, title, text) {
    return "" + text;
  }
  // no need for block level renderers
  strong(text) {
    return text;
  }
  text(text) {
    return text;
  }
}

var __defProp$9 = Object.defineProperty;
var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$9(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$1 = (obj, key, value) => __defNormalProp$1(obj, typeof key !== "symbol" ? key + "" : key, value);
class _Parser {
  constructor(options) {
    __publicField$1(this, "options");
    __publicField$1(this, "renderer");
    __publicField$1(this, "textRenderer");
    this.options = options || _defaults;
    this.options.renderer = this.options.renderer || new _Renderer();
    this.renderer = this.options.renderer;
    this.renderer.options = this.options;
    this.textRenderer = new _TextRenderer();
  }
  /**
   * Static Parse Method
   */
  static parse(tokens, options) {
    const parser = new _Parser(options);
    return parser.parse(tokens);
  }
  /**
   * Static Parse Inline Method
   */
  static parseInline(tokens, options) {
    const parser = new _Parser(options);
    return parser.parseInline(tokens);
  }
  /**
   * Parse Loop
   */
  parse(tokens, top = true) {
    let out = "";
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (this.options.extensions && this.options.extensions.renderers && this.options.extensions.renderers[token.type]) {
        const genericToken = token;
        const ret = this.options.extensions.renderers[genericToken.type].call({ parser: this }, genericToken);
        if (ret !== false || ![
          "space",
          "hr",
          "heading",
          "code",
          "table",
          "blockquote",
          "list",
          "html",
          "paragraph",
          "text"
        ].includes(genericToken.type)) {
          out += ret || "";
          continue;
        }
      }
      switch (token.type) {
        case "space": {
          continue;
        }
        case "hr": {
          out += this.renderer.hr();
          continue;
        }
        case "heading": {
          const headingToken = token;
          out += this.renderer.heading(
            this.parseInline(headingToken.tokens),
            headingToken.depth,
            unescape(this.parseInline(headingToken.tokens, this.textRenderer))
          );
          continue;
        }
        case "code": {
          const codeToken = token;
          out += this.renderer.code(
            codeToken.text,
            codeToken.lang,
            !!codeToken.escaped
          );
          continue;
        }
        case "table": {
          const tableToken = token;
          let header = "";
          let cell = "";
          for (let j = 0; j < tableToken.header.length; j++) {
            cell += this.renderer.tablecell(
              this.parseInline(tableToken.header[j].tokens),
              { header: true, align: tableToken.align[j] }
            );
          }
          header += this.renderer.tablerow(cell);
          let body = "";
          for (let j = 0; j < tableToken.rows.length; j++) {
            const row = tableToken.rows[j];
            cell = "";
            for (let k = 0; k < row.length; k++) {
              cell += this.renderer.tablecell(
                this.parseInline(row[k].tokens),
                { header: false, align: tableToken.align[k] }
              );
            }
            body += this.renderer.tablerow(cell);
          }
          out += this.renderer.table(header, body);
          continue;
        }
        case "blockquote": {
          const blockquoteToken = token;
          const body = this.parse(blockquoteToken.tokens);
          out += this.renderer.blockquote(body);
          continue;
        }
        case "list": {
          const listToken = token;
          const ordered = listToken.ordered;
          const start = listToken.start;
          const loose = listToken.loose;
          let body = "";
          for (let j = 0; j < listToken.items.length; j++) {
            const item = listToken.items[j];
            const checked = item.checked;
            const task = item.task;
            let itemBody = "";
            if (item.task) {
              const checkbox = this.renderer.checkbox(!!checked);
              if (loose) {
                if (item.tokens.length > 0 && item.tokens[0].type === "paragraph") {
                  item.tokens[0].text = checkbox + " " + item.tokens[0].text;
                  if (item.tokens[0].tokens && item.tokens[0].tokens.length > 0 && item.tokens[0].tokens[0].type === "text") {
                    item.tokens[0].tokens[0].text = checkbox + " " + item.tokens[0].tokens[0].text;
                  }
                } else {
                  item.tokens.unshift({
                    type: "text",
                    text: checkbox + " "
                  });
                }
              } else {
                itemBody += checkbox + " ";
              }
            }
            itemBody += this.parse(item.tokens, loose);
            body += this.renderer.listitem(itemBody, task, !!checked);
          }
          out += this.renderer.list(body, ordered, start);
          continue;
        }
        case "html": {
          const htmlToken = token;
          out += this.renderer.html(htmlToken.text, htmlToken.block);
          continue;
        }
        case "paragraph": {
          const paragraphToken = token;
          out += this.renderer.paragraph(this.parseInline(paragraphToken.tokens));
          continue;
        }
        case "text": {
          let textToken = token;
          let body = textToken.tokens ? this.parseInline(textToken.tokens) : textToken.text;
          while (i + 1 < tokens.length && tokens[i + 1].type === "text") {
            textToken = tokens[++i];
            body += "\n" + (textToken.tokens ? this.parseInline(textToken.tokens) : textToken.text);
          }
          out += top ? this.renderer.paragraph(body) : body;
          continue;
        }
        default: {
          const errMsg = 'Token with "' + token.type + '" type was not found.';
          if (this.options.silent) {
            console.error(errMsg);
            return "";
          } else {
            throw new Error(errMsg);
          }
        }
      }
    }
    return out;
  }
  /**
   * Parse Inline Tokens
   */
  parseInline(tokens, renderer) {
    renderer = renderer || this.renderer;
    let out = "";
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (this.options.extensions && this.options.extensions.renderers && this.options.extensions.renderers[token.type]) {
        const ret = this.options.extensions.renderers[token.type].call({ parser: this }, token);
        if (ret !== false || ![
          "escape",
          "html",
          "link",
          "image",
          "strong",
          "em",
          "codespan",
          "br",
          "del",
          "text"
        ].includes(token.type)) {
          out += ret || "";
          continue;
        }
      }
      switch (token.type) {
        case "escape": {
          const escapeToken = token;
          out += renderer.text(escapeToken.text);
          break;
        }
        case "html": {
          const tagToken = token;
          out += renderer.html(tagToken.text);
          break;
        }
        case "link": {
          const linkToken = token;
          out += renderer.link(linkToken.href, linkToken.title, this.parseInline(linkToken.tokens, renderer));
          break;
        }
        case "image": {
          const imageToken = token;
          out += renderer.image(imageToken.href, imageToken.title, imageToken.text);
          break;
        }
        case "strong": {
          const strongToken = token;
          out += renderer.strong(this.parseInline(strongToken.tokens, renderer));
          break;
        }
        case "em": {
          const emToken = token;
          out += renderer.em(this.parseInline(emToken.tokens, renderer));
          break;
        }
        case "codespan": {
          const codespanToken = token;
          out += renderer.codespan(codespanToken.text);
          break;
        }
        case "br": {
          out += renderer.br();
          break;
        }
        case "del": {
          const delToken = token;
          out += renderer.del(this.parseInline(delToken.tokens, renderer));
          break;
        }
        case "text": {
          const textToken = token;
          out += renderer.text(textToken.text);
          break;
        }
        default: {
          const errMsg = 'Token with "' + token.type + '" type was not found.';
          if (this.options.silent) {
            console.error(errMsg);
            return "";
          } else {
            throw new Error(errMsg);
          }
        }
      }
    }
    return out;
  }
}

var __defProp$8 = Object.defineProperty;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp$8(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var _Marked_instances, onError_fn, parseMarkdown_fn;
class Marked {
  constructor(...args) {
    __privateAdd(this, _Marked_instances);
    __publicField(this, "Hooks", _Hooks);
    __publicField(this, "Lexer", _Lexer);
    __publicField(this, "Parser", _Parser);
    __publicField(this, "Renderer", _Renderer);
    __publicField(this, "TextRenderer", _TextRenderer);
    __publicField(this, "Tokenizer", _Tokenizer);
    __publicField(this, "defaults", _getDefaults());
    __publicField(this, "options", this.setOptions);
    __publicField(this, "parse", __privateMethod(this, _Marked_instances, parseMarkdown_fn).call(this, _Lexer.lex, _Parser.parse));
    __publicField(this, "parseInline", __privateMethod(this, _Marked_instances, parseMarkdown_fn).call(this, _Lexer.lexInline, _Parser.parseInline));
    this.use(...args);
  }
  lexer(src, options) {
    return _Lexer.lex(src, options ?? this.defaults);
  }
  parser(tokens, options) {
    return _Parser.parse(tokens, options ?? this.defaults);
  }
  setOptions(opt) {
    this.defaults = { ...this.defaults, ...opt };
    return this;
  }
  use(...args) {
    const extensions = this.defaults.extensions || { renderers: {}, childTokens: {} };
    args.forEach((pack) => {
      const opts = { ...pack };
      opts.async = this.defaults.async || opts.async || false;
      if (pack.extensions) {
        pack.extensions.forEach((ext) => {
          if (!ext.name) {
            throw new Error("extension name required");
          }
          if ("renderer" in ext) {
            const prevRenderer = extensions.renderers[ext.name];
            if (prevRenderer) {
              extensions.renderers[ext.name] = function(...args2) {
                let ret = ext.renderer.apply(this, args2);
                if (ret === false) {
                  ret = prevRenderer.apply(this, args2);
                }
                return ret;
              };
            } else {
              extensions.renderers[ext.name] = ext.renderer;
            }
          }
          if ("tokenizer" in ext) {
            if (!ext.level || ext.level !== "block" && ext.level !== "inline") {
              throw new Error("extension level must be 'block' or 'inline'");
            }
            const extLevel = extensions[ext.level];
            if (extLevel) {
              extLevel.unshift(ext.tokenizer);
            } else {
              extensions[ext.level] = [ext.tokenizer];
            }
            if (ext.start) {
              if (ext.level === "block") {
                if (extensions.startBlock) {
                  extensions.startBlock.push(ext.start);
                } else {
                  extensions.startBlock = [ext.start];
                }
              } else {
                if (ext.level === "inline") {
                  if (extensions.startInline) {
                    extensions.startInline.push(ext.start);
                  } else {
                    extensions.startInline = [ext.start];
                  }
                }
              }
            }
          }
          if ("childTokens" in ext && ext.childTokens) {
            extensions.childTokens[ext.name] = ext.childTokens;
          }
        });
        opts.extensions = extensions;
      }
      if (pack.renderer) {
        const renderer = this.defaults.renderer || new _Renderer(this.defaults);
        for (const prop in pack.renderer) {
          if (!(prop in renderer)) {
            throw new Error(`renderer '${prop}' does not exist`);
          }
          if (prop === "options") {
            continue;
          }
          const rendererProp = prop;
          const rendererFunc = pack.renderer[rendererProp];
          const prevRenderer = renderer[rendererProp];
          renderer[rendererProp] = (...args2) => {
            let ret = rendererFunc.apply(renderer, args2);
            if (ret === false) {
              ret = prevRenderer.apply(renderer, args2);
            }
            return ret || "";
          };
        }
        opts.renderer = renderer;
      }
      if (pack.tokenizer) {
        const tokenizer = this.defaults.tokenizer || new _Tokenizer(this.defaults);
        for (const prop in pack.tokenizer) {
          if (!(prop in tokenizer)) {
            throw new Error(`tokenizer '${prop}' does not exist`);
          }
          if (["options", "rules", "lexer"].includes(prop)) {
            continue;
          }
          const tokenizerProp = prop;
          const tokenizerFunc = pack.tokenizer[tokenizerProp];
          const prevTokenizer = tokenizer[tokenizerProp];
          tokenizer[tokenizerProp] = (...args2) => {
            let ret = tokenizerFunc.apply(tokenizer, args2);
            if (ret === false) {
              ret = prevTokenizer.apply(tokenizer, args2);
            }
            return ret;
          };
        }
        opts.tokenizer = tokenizer;
      }
      if (pack.hooks) {
        const hooks = this.defaults.hooks || new _Hooks();
        for (const prop in pack.hooks) {
          if (!(prop in hooks)) {
            throw new Error(`hook '${prop}' does not exist`);
          }
          if (prop === "options") {
            continue;
          }
          const hooksProp = prop;
          const hooksFunc = pack.hooks[hooksProp];
          const prevHook = hooks[hooksProp];
          if (_Hooks.passThroughHooks.has(prop)) {
            hooks[hooksProp] = (arg) => {
              if (this.defaults.async) {
                return Promise.resolve(hooksFunc.call(hooks, arg)).then((ret2) => {
                  return prevHook.call(hooks, ret2);
                });
              }
              const ret = hooksFunc.call(hooks, arg);
              return prevHook.call(hooks, ret);
            };
          } else {
            hooks[hooksProp] = (...args2) => {
              let ret = hooksFunc.apply(hooks, args2);
              if (ret === false) {
                ret = prevHook.apply(hooks, args2);
              }
              return ret;
            };
          }
        }
        opts.hooks = hooks;
      }
      if (pack.walkTokens) {
        const walkTokens = this.defaults.walkTokens;
        const packWalktokens = pack.walkTokens;
        opts.walkTokens = function(token) {
          let values = [];
          values.push(packWalktokens.call(this, token));
          if (walkTokens) {
            values = values.concat(walkTokens.call(this, token));
          }
          return values;
        };
      }
      this.defaults = { ...this.defaults, ...opts };
    });
    return this;
  }
  /**
   * Run callback for every token
   */
  walkTokens(tokens, callback) {
    let values = [];
    for (const token of tokens) {
      values = values.concat(callback.call(this, token));
      switch (token.type) {
        case "table": {
          const tableToken = token;
          for (const cell of tableToken.header) {
            values = values.concat(this.walkTokens(cell.tokens, callback));
          }
          for (const row of tableToken.rows) {
            for (const cell of row) {
              values = values.concat(this.walkTokens(cell.tokens, callback));
            }
          }
          break;
        }
        case "list": {
          const listToken = token;
          values = values.concat(this.walkTokens(listToken.items, callback));
          break;
        }
        default: {
          const genericToken = token;
          if (this.defaults.extensions?.childTokens?.[genericToken.type]) {
            this.defaults.extensions.childTokens[genericToken.type].forEach((childTokens) => {
              const tokens2 = genericToken[childTokens].flat(Infinity);
              values = values.concat(this.walkTokens(tokens2, callback));
            });
          } else {
            if (genericToken.tokens) {
              values = values.concat(this.walkTokens(genericToken.tokens, callback));
            }
          }
        }
      }
    }
    return values;
  }
}
_Marked_instances = new WeakSet();
// @ts-ignore
onError_fn = function(silent, async) {
  return (e) => {
    e.message += "\nPlease report this to https://github.com/markedjs/marked.";
    if (silent) {
      const msg = "<p>An error occurred:</p><pre>" + escape$1(e.message + "", true) + "</pre>";
      if (async) {
        return Promise.resolve(msg);
      }
      return msg;
    }
    if (async) {
      return Promise.reject(e);
    }
    throw e;
  };
};
// @ts-ignore
parseMarkdown_fn = function(lexer, parser) {
  return (src, options) => {
    const origOpt = { ...options };
    const opt = { ...this.defaults, ...origOpt };
    if (this.defaults.async === true && origOpt.async === false) {
      if (!opt.silent) {
        console.warn(
          "marked(): The async option was set to true by an extension. The async: false option sent to parse will be ignored."
        );
      }
      opt.async = true;
    }
    const throwError = __privateMethod(this, _Marked_instances, onError_fn).call(this, !!opt.silent, !!opt.async);
    if (typeof src === "undefined" || src === null) {
      return throwError(new Error("marked(): input parameter is undefined or null"));
    }
    if (typeof src !== "string") {
      return throwError(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(src) + ", string expected"));
    }
    if (opt.hooks) {
      opt.hooks.options = opt;
    }
    if (opt.async) {
      return Promise.resolve(opt.hooks ? opt.hooks.preprocess(src) : src).then((src2) => lexer(src2, opt)).then((tokens) => opt.hooks ? opt.hooks.processAllTokens(tokens) : tokens).then(
        (tokens) => opt.walkTokens ? Promise.all(this.walkTokens(tokens, opt.walkTokens)).then(
          () => tokens
        ) : tokens
      ).then((tokens) => parser(tokens, opt)).then((html) => opt.hooks ? opt.hooks.postprocess(html) : html).catch(throwError);
    }
    try {
      if (opt.hooks) {
        src = opt.hooks.preprocess(src);
      }
      let tokens = lexer(src, opt);
      if (opt.hooks) {
        tokens = opt.hooks.processAllTokens(tokens);
      }
      if (opt.walkTokens) {
        this.walkTokens(tokens, opt.walkTokens);
      }
      let html = parser(tokens, opt);
      if (opt.hooks) {
        html = opt.hooks.postprocess(html);
      }
      return html;
    } catch (e) {
      return throwError(e);
    }
  };
};

const markedInstance = new Marked();
function marked(src, opt) {
  return markedInstance.parse(src, opt);
}
marked.options = marked.setOptions = function(options2) {
  markedInstance.setOptions(options2);
  marked.defaults = markedInstance.defaults;
  changeDefaults(marked.defaults);
  return marked;
};
marked.getDefaults = _getDefaults;
marked.defaults = _defaults;
marked.use = function(...args) {
  markedInstance.use(...args);
  marked.defaults = markedInstance.defaults;
  changeDefaults(marked.defaults);
  return marked;
};
marked.walkTokens = function(tokens, callback) {
  return markedInstance.walkTokens(tokens, callback);
};
marked.parseInline = markedInstance.parseInline;
marked.Parser = _Parser;
marked.parser = _Parser.parse;
marked.Renderer = _Renderer;
marked.TextRenderer = _TextRenderer;
marked.Lexer = _Lexer;
marked.lexer = _Lexer.lex;
marked.Tokenizer = _Tokenizer;
marked.Hooks = _Hooks;
marked.parse = marked;

const parseMdSnapshot = (snapshot, options) => {
  const {
    showCodeBlockCopyButton,
    markdownLinkTarget,
    syntaxHighlighter,
    htmlSanitizer
  } = options || {};
  const parsedMarkdown = marked(snapshot, {
    async: false,
    breaks: true
  });
  if (typeof parsedMarkdown !== "string") {
    throw new Error("Markdown parsing failed");
  }
  const element = document.createElement("div");
  element.innerHTML = htmlSanitizer ? htmlSanitizer(parsedMarkdown) : parsedMarkdown;
  element.querySelectorAll("pre").forEach((block) => {
    const newBlock = document.createElement("div");
    newBlock.className = "code-block";
    const codeElement = block.querySelector("code");
    if (!codeElement) {
      const html = block.innerHTML;
      newBlock.innerHTML = htmlSanitizer ? htmlSanitizer(html) : html;
      block.replaceWith(newBlock);
      return;
    }
    let language;
    for (let i = 0; i < codeElement.classList.length; i++) {
      const className = codeElement.classList[i];
      if (className.startsWith("language-")) {
        language = className.slice(9);
        break;
      }
    }
    const newCodeElement = document.createElement("pre");
    const newHtml = "<div>" + codeElement.innerHTML + "</div>";
    newCodeElement.innerHTML = options?.htmlSanitizer ? options.htmlSanitizer(newHtml) : newHtml;
    if (language) {
      newCodeElement.setAttribute("data-language", language);
      if (syntaxHighlighter) {
        const highlight = syntaxHighlighter.createHighlighter();
        const newHtml2 = "<div>" + highlight(codeElement.textContent || "", language) + "</div>";
        newCodeElement.innerHTML = htmlSanitizer ? htmlSanitizer(newHtml2) : newHtml2;
        newCodeElement.className = "highlighter-dark";
      }
    }
    emptyInnerHtml(newBlock);
    newBlock.appendChild(newCodeElement);
    block.replaceWith(newBlock);
  });
  if (showCodeBlockCopyButton !== false) {
    insertCopyToClipboardButton(element);
  }
  if (markdownLinkTarget !== "self") {
    element.querySelectorAll("a").forEach((link) => {
      link.setAttribute("target", "_blank");
    });
  }
  return element.innerHTML;
};

const createMessageContent = (message, format = "text", markdownOptions) => {
  if (format === "markdown") {
    const htmlElement = document.createElement("div");
    const html = parseMdSnapshot(message, markdownOptions);
    htmlElement.innerHTML = markdownOptions?.htmlSanitizer ? markdownOptions.htmlSanitizer(html) : html;
    attachCopyClickListener(htmlElement);
    const fragment = document.createDocumentFragment();
    while (htmlElement.firstChild) {
      fragment.appendChild(htmlElement.firstChild);
    }
    return fragment;
  }
  return document.createTextNode(message);
};

const className$6 = "nlux-comp-message";
const createMessageDom = (props) => {
  const element = document.createElement("div");
  element.classList.add(className$6);
  const status = props.status ? props.status : "complete";
  applyNewStatusClassName$1(element, status);
  applyNewDirectionClassName$1(element, props.direction);
  if (status === "streaming") {
    return element;
  }
  return element;
};

const directionClassName = {
  received: "nlux-comp-chatItem--received",
  sent: "nlux-comp-chatItem--sent"
};
const applyNewDirectionClassName = (element, direction) => {
  const directions = Object.keys(directionClassName);
  directions.forEach((directionName) => {
    element.classList.remove(directionClassName[directionName]);
  });
  if (directionClassName[direction]) {
    element.classList.add(directionClassName[direction]);
  }
};

const conversationLayoutClassName = {
  bubbles: "nlux-comp-chatItem--bubblesLayout",
  list: "nlux-comp-chatItem--listLayout"
};
const applyNewLayoutClassName = (element, layout) => {
  const layouts = Object.keys(conversationLayoutClassName);
  layouts.forEach((layoutName) => {
    element.classList.remove(conversationLayoutClassName[layoutName]);
  });
  if (conversationLayoutClassName[layout]) {
    element.classList.add(conversationLayoutClassName[layout]);
  }
};

const className$5 = "nlux-comp-chatItem";
const participantInfoContainerClassName = "nlux-comp-chatItem-participantInfo";
const participantNameClassName = "nlux-comp-chatItem-participantName";
const createChatItemDom = (props) => {
  const element = document.createElement("div");
  element.classList.add(className$5);
  const messageProps = {
    direction: props.direction,
    status: props.status,
    message: props.message,
    htmlSanitizer: props.htmlSanitizer
  };
  let avatarDom;
  if (props.avatar !== void 0) {
    const avatarProps = {
      name: props.name,
      avatar: props.avatar
    };
    avatarDom = createAvatarDom(avatarProps);
  }
  const participantNameDom = document.createElement("span");
  participantNameDom.classList.add(participantNameClassName);
  participantNameDom.textContent = props.name;
  {
    const participantInfoContainer = document.createElement("div");
    participantInfoContainer.classList.add(participantInfoContainerClassName);
    if (avatarDom !== void 0) {
      participantInfoContainer.append(avatarDom);
    }
    participantInfoContainer.append(participantNameDom);
    element.append(participantInfoContainer);
  }
  applyNewDirectionClassName(element, props.direction);
  applyNewLayoutClassName(element, props.layout);
  const message = createMessageDom(messageProps);
  element.append(message);
  return element;
};

const updateContentOnAvatarChange = (element, propsBefore, propsAfter) => {
  if (propsBefore.avatar === propsAfter.avatar) {
    return;
  }
  if (typeof propsAfter.avatar === "string" && typeof propsBefore.avatar === "string") {
    const photoDomElement = element.querySelector(
      "* > .nlux-comp-avatarContainer > .nlux-comp-avatarPicture"
    );
    if (photoDomElement !== null) {
      photoDomElement.style.backgroundImage = `url("${encodeURI(propsAfter.avatar)}")`;
    }
  } else {
    if (typeof propsAfter.avatar === "string") {
      const newPhotoDomElement = createPhotoContainerFromUrl(
        propsAfter.avatar);
      element.replaceChildren(newPhotoDomElement);
    } else {
      if (propsAfter.avatar) {
        element.replaceChildren(propsAfter.avatar.cloneNode(true));
      } else {
        emptyInnerHtml(element);
      }
    }
  }
};

const updateNameOnAvatar = (element, propsBefore, propsAfter) => {
  if (propsBefore.name === propsAfter.name) {
    return;
  }
  if (typeof propsAfter.avatar === "string") {
    const letter = propsAfter.name && propsAfter.name.length > 0 ? propsAfter.name[0].toUpperCase() : "";
    const letterContainer = element.querySelector(
      "* > .nlux-comp-avatarContainer > .avtr_ltr"
    );
    letterContainer?.replaceChildren(letter);
  }
};

const updateAvatarDom = (element, propsBefore, propsAfter) => {
  if (propsBefore.avatar === propsAfter.avatar && propsBefore.name === propsAfter.name) {
    return;
  }
  if (propsBefore.avatar !== propsAfter.avatar) {
    updateContentOnAvatarChange(element, propsBefore, propsAfter);
  }
  if (propsAfter.name) {
    if (propsBefore.name !== propsAfter.name) {
      element.title = propsAfter.name;
      updateNameOnAvatar(element, propsBefore, propsAfter);
    }
  } else {
    element.title = "";
    updateNameOnAvatar(element, propsBefore, propsAfter);
  }
};

const updateContentOnMessageChange = (element, propsBefore, propsAfter) => {
  if (propsBefore.message === propsAfter.message && propsBefore.format === propsAfter.format) {
    return;
  }
  emptyInnerHtml(element);
  element.append(
    createMessageContent(propsAfter.message ?? "", propsAfter.format, {
      htmlSanitizer: propsAfter.htmlSanitizer
    })
  );
};

const updateContentOnStatusChange$1 = (element, propsBefore, propsAfter) => {
  const newStatus = propsAfter.status;
  if (newStatus === "streaming") {
    return;
  }
  if (newStatus === "complete") {
    const innerHtml = propsAfter.message ? propsAfter.message : "";
    const textNode = document.createTextNode(innerHtml);
    element.classList.add(statusClassName$1[newStatus]);
    emptyInnerHtml(element);
    element.append(textNode);
    return;
  }
};

const updateMessageDom = (element, propsBefore, propsAfter) => {
  if (propsBefore.message === propsAfter.message && propsBefore.status === propsAfter.status && propsBefore.direction === propsAfter.direction) {
    return;
  }
  if (!propsAfter || !propsAfter.hasOwnProperty("message") && !propsAfter.hasOwnProperty("status") && !propsAfter.hasOwnProperty("direction")) {
    return;
  }
  if (propsBefore.direction !== propsAfter.direction) {
    applyNewDirectionClassName$1(element, propsAfter.direction);
  }
  const currentStatus = propsAfter.status;
  if (propsBefore.status !== currentStatus) {
    applyNewStatusClassName$1(element, propsAfter.status);
    updateContentOnStatusChange$1(element, propsBefore, propsAfter);
    return;
  }
  if (currentStatus === "complete") {
    if (propsBefore.message !== propsAfter.message || propsBefore.format !== propsAfter.format) {
      updateContentOnMessageChange(element, propsBefore, propsAfter);
    }
  }
};

const updateChatItemDom = (element, propsBefore, propsAfter) => {
  if (propsBefore.direction === propsAfter.direction && propsBefore.layout === propsAfter.layout && propsBefore.status === propsAfter.status && propsBefore.message === propsAfter.message && propsBefore.name === propsAfter.name && propsBefore.avatar === propsAfter.avatar) {
    return;
  }
  if (!propsAfter || !propsAfter.hasOwnProperty("direction") && !propsAfter.hasOwnProperty("layout") && !propsAfter.hasOwnProperty("status") && !propsAfter.hasOwnProperty("message") && !propsAfter.hasOwnProperty("loader") && !propsAfter.hasOwnProperty("name") && !propsAfter.hasOwnProperty("avatar")) {
    return;
  }
  if (propsBefore.direction !== propsAfter.direction) {
    applyNewDirectionClassName(element, propsAfter.direction);
  }
  if (propsBefore.layout !== propsAfter.layout) {
    applyNewLayoutClassName(element, propsAfter.layout);
  }
  if (propsBefore.direction !== propsAfter.direction || propsBefore.status !== propsAfter.status || propsBefore.message !== propsAfter.message) {
    const messageDom = element.querySelector(`.${className$6}`);
    if (messageDom) {
      updateMessageDom(messageDom, {
        direction: propsBefore.direction,
        status: propsBefore.status,
        message: propsBefore.message,
        htmlSanitizer: propsBefore.htmlSanitizer
      }, {
        direction: propsAfter.direction,
        status: propsAfter.status,
        message: propsAfter.message,
        htmlSanitizer: propsBefore.htmlSanitizer
      });
    }
  }
  if (propsBefore.name !== propsAfter.name || propsBefore.avatar !== propsAfter.avatar) {
    const avatarDom = element.querySelector(`.${className$7}`);
    if (!propsAfter.name && !propsAfter.avatar) {
      avatarDom?.remove();
      return;
    } else {
      if (avatarDom) {
        updateAvatarDom(avatarDom, {
          name: propsBefore.name,
          avatar: propsBefore.avatar
        }, {
          name: propsAfter.name,
          avatar: propsAfter.avatar
        });
      } else {
        if (propsAfter.name !== void 0 || propsAfter.avatar !== void 0) {
          const avatarProps = {
            name: propsAfter.name,
            avatar: propsAfter.avatar
          };
          const persona = createAvatarDom(avatarProps);
          const participantInfoDom = element.querySelector(
            `.${participantInfoContainerClassName}`
          );
          if (participantInfoDom) {
            participantInfoDom.prepend(persona);
          }
        }
      }
    }
  }
  if (propsBefore.name !== propsAfter.name) {
    const participantNameContainer = element.querySelector(`.${participantNameClassName}`);
    if (participantNameContainer) {
      participantNameContainer.textContent = propsAfter.name || "";
    }
  }
};

const defaultDelayInMsBeforeComplete = 2e3;
const defaultDelayInMsBetweenBufferChecks = 8;
const endOfStreamChar = "\n";
const getScheduler = (type) => {
  if (type === "timeout") {
    return (callback) => setTimeout(callback, 0);
  }
  return (callback) => requestAnimationFrame(callback);
};
const createMdStreamRenderer = (root, options) => {
  let streamIsComplete = false;
  const { onComplete } = options || {};
  const buffer = [];
  const scheduler = getScheduler(
    options?.skipStreamingAnimation ? "timeout" : "animationFrame"
  );
  const wipContainer = document.createElement("div");
  wipContainer.classList.add("md-in-progress");
  root.append(wipContainer);
  const commitWipContent = () => {
    while (wipContainer.firstChild) {
      const childToCommit = wipContainer.firstChild;
      if (childToCommit instanceof HTMLElement) {
        attachCopyClickListener(childToCommit);
      }
      wipContainer.before(childToCommit);
    }
  };
  const completeParsing = () => {
    streamIsComplete = true;
    if (parsingInterval) {
      clearInterval(parsingInterval);
      parsingInterval = void 0;
    }
    commitWipContent();
    wipContainer.remove();
    onComplete?.();
  };
  const delayBetweenBufferChecks = !options?.skipStreamingAnimation && options?.streamingAnimationSpeed && options.streamingAnimationSpeed >= 0 ? options.streamingAnimationSpeed : options?.skipStreamingAnimation ? 0 : defaultDelayInMsBetweenBufferChecks;
  const parsingContext = {
    timeSinceLastProcessing: (/* @__PURE__ */ new Date()).getTime(),
    currentMarkdown: "",
    previousHtml: void 0
  };
  let parsingInterval = setInterval(() => {
    const nowTime = (/* @__PURE__ */ new Date()).getTime();
    const shouldAutomaticallyCompleteAfterDelay = options?.waitTimeBeforeStreamCompletion !== "never";
    if (buffer.length === 0 && shouldAutomaticallyCompleteAfterDelay) {
      const delayBeforeCompleteParsing = typeof options?.waitTimeBeforeStreamCompletion === "number" ? options.waitTimeBeforeStreamCompletion : defaultDelayInMsBeforeComplete;
      if (streamIsComplete || nowTime - parsingContext.timeSinceLastProcessing > delayBeforeCompleteParsing) {
        completeParsing();
      }
      return;
    }
    parsingContext.timeSinceLastProcessing = nowTime;
    const chunk = buffer.shift();
    if (chunk === void 0 || typeof chunk !== "string") {
      return;
    }
    scheduler(() => {
      const markdownToParse = parsingContext.currentMarkdown + chunk;
      const parsedHtml = parseMdSnapshot(markdownToParse, options).trim();
      if (typeof parsedHtml !== "string") {
        parsingContext.currentMarkdown = parsingContext.currentMarkdown.slice(0, -chunk.length);
        warn("Markdown parsing failed");
        return;
      }
      if (parsingContext.previousHtml && parsedHtml.length > parsingContext.previousHtml.length && parsedHtml.startsWith(parsingContext.previousHtml)) {
        commitWipContent();
        const currentHtml = parsedHtml.slice(parsingContext.previousHtml.length).trim();
        wipContainer.innerHTML = options?.htmlSanitizer ? options.htmlSanitizer(currentHtml) : currentHtml;
        parsingContext.currentMarkdown = chunk;
        parsingContext.previousHtml = void 0;
      } else {
        wipContainer.innerHTML = options?.htmlSanitizer ? options.htmlSanitizer(parsedHtml) : parsedHtml;
        parsingContext.currentMarkdown = markdownToParse;
        parsingContext.previousHtml = parsedHtml;
      }
    });
  }, delayBetweenBufferChecks);
  return {
    next: (chunk) => {
      if (streamIsComplete) {
        warn("Stream is already complete. No more chunks can be added");
        return;
      }
      {
        for (const char of chunk) {
          buffer.push(char);
        }
      }
    },
    complete: () => {
      buffer.push(endOfStreamChar);
      streamIsComplete = true;
    },
    cancel: () => {
      if (parsingInterval) {
        clearInterval(parsingInterval);
        parsingInterval = void 0;
      }
      streamIsComplete = true;
      wipContainer.remove();
    },
    error: () => {
      streamIsComplete = true;
    }
  };
};

const createMarkdownStreamParser = (domElement, options) => {
  const nluxMarkdownStreamRenderer = createMdStreamRenderer(
    domElement,
    {
      syntaxHighlighter: options?.syntaxHighlighter,
      htmlSanitizer: options?.htmlSanitizer,
      markdownLinkTarget: options?.markdownLinkTarget,
      showCodeBlockCopyButton: options?.showCodeBlockCopyButton,
      skipStreamingAnimation: options?.skipStreamingAnimation,
      streamingAnimationSpeed: options?.streamingAnimationSpeed,
      waitTimeBeforeStreamCompletion: options?.waitTimeBeforeStreamCompletion,
      onComplete: options?.onComplete
    }
  );
  return {
    next(value) {
      nluxMarkdownStreamRenderer.next(value);
    },
    complete() {
      nluxMarkdownStreamRenderer.complete();
    }
  };
};

const source$2 = "dom/getElement";
const getElement = (root, query) => {
  const element = root.querySelector(query);
  if (!element) {
    throw new NluxRenderingError({
      source: source$2,
      message: `Could not find element with query "${query}". Make sure the query provided matches an element that exists in the root element.`
    });
  }
  if (!(element instanceof HTMLElement)) {
    throw new NluxRenderingError({
      source: source$2,
      message: `Element with query "${query}" is not a valid HTMLElement.`
    });
  }
  return element;
};

const renderChatItem = ({
  props,
  appendToRoot,
  compEvent
}) => {
  const root = createChatItemDom({
    ...props.domProps,
    htmlSanitizer: props.htmlSanitizer,
    message: void 0
  });
  const messageContainer = getElement(root, ".nlux-comp-message");
  if (!messageContainer) {
    throw new Error("Message container not found");
  }
  const streamingRoot = document.createElement("div");
  streamingRoot.classList.add("nlux-markdownStream-root");
  const markdownContainer = document.createElement("div");
  markdownContainer.classList.add("nlux-markdown-container");
  markdownContainer.setAttribute("nlux-message-id", props.uid);
  streamingRoot.append(markdownContainer);
  messageContainer.append(streamingRoot);
  if (props.domProps.message) {
    const parsedMessage = createMessageContent(
      props.domProps.message ?? "",
      "markdown",
      {
        markdownLinkTarget: props.markdownLinkTarget,
        syntaxHighlighter: props.syntaxHighlighter,
        htmlSanitizer: props.htmlSanitizer
      }
    );
    markdownContainer.append(parsedMessage);
  }
  appendToRoot(root);
  let markdownStreamParser = void 0;
  let markdownStreamProps = { ...props };
  const initMarkdownStreamParser = (newProps) => {
    return createMarkdownStreamParser(markdownContainer, {
      syntaxHighlighter: newProps.syntaxHighlighter,
      htmlSanitizer: newProps.htmlSanitizer,
      markdownLinkTarget: newProps.markdownLinkTarget,
      showCodeBlockCopyButton: newProps.showCodeBlockCopyButton,
      skipStreamingAnimation: newProps.skipStreamingAnimation,
      streamingAnimationSpeed: newProps.streamingAnimationSpeed,
      onComplete: () => compEvent("markdown-stream-complete")
    });
  };
  return {
    elements: {
      chatItemContainer: root
    },
    actions: {
      focus: () => {
        root.focus();
      },
      processStreamedChunk: (chunk) => {
        if (!markdownStreamParser) {
          markdownStreamParser = initMarkdownStreamParser(markdownStreamProps);
        }
        markdownStreamParser.next(chunk);
      },
      commitStreamedChunks: () => {
        if (markdownStreamParser) {
          markdownStreamParser.complete();
        }
      },
      updateMarkdownStreamRenderer: (newProps) => {
        markdownStreamProps = {
          ...markdownStreamProps,
          ...newProps
        };
        initMarkdownStreamParser(markdownStreamProps);
      },
      updateDomProps: (oldProps, newProps) => {
        updateChatItemDom(
          root,
          oldProps,
          newProps
        );
      }
    },
    onDestroy: () => {
      root.remove();
      markdownStreamParser = void 0;
    }
  };
};

const updateChatItem = ({
  propName,
  newValue,
  dom
}) => {
  switch (propName) {
    case "markdownLinkTarget":
    case "skipStreamingAnimation":
    case "syntaxHighlighter":
    case "htmlSanitizer":
    case "showCodeBlockCopyButton":
    case "streamingAnimationSpeed":
      dom.actions?.updateMarkdownStreamRenderer({
        [propName]: newValue
      });
      break;
  }
};

var __defProp$7 = Object.defineProperty;
var __getOwnPropDesc$7 = Object.getOwnPropertyDescriptor;
var __decorateClass$7 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$7(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp$7(target, key, result);
  return result;
};
let CompChatItem = class extends BaseComp {
  constructor(context, props) {
    super(context, props);
    this.serverResponse = [];
    this.stringContent = "";
    if (props.domProps.message !== void 0) {
      this.stringContent = props.domProps.message;
    }
  }
  addChunk(chunk, serverResponse) {
    this.throwIfDestroyed();
    this.executeDomAction("processStreamedChunk", chunk);
    if (typeof chunk === "string") {
      this.stringContent += chunk;
    }
    this.serverResponse.push(serverResponse);
  }
  commitChunks() {
    this.throwIfDestroyed();
    this.executeDomAction("commitStreamedChunks");
  }
  getChatSegmentItem() {
    const domProps = this.getProp("domProps");
    if (domProps.direction === "received") {
      return {
        uid: this.props.uid,
        participantRole: "assistant",
        content: this.getItemContent(),
        contentType: "text",
        serverResponse: this.serverResponse,
        status: "complete",
        dataTransferMode: "batch",
        time: /* @__PURE__ */ new Date()
      };
    }
    return {
      uid: this.props.uid,
      participantRole: "user",
      content: this.getItemContent(),
      contentType: "text",
      status: "complete",
      time: /* @__PURE__ */ new Date()
    };
  }
  getItemContent() {
    return this.aiMessageContent ?? this.stringContent;
  }
  updateDomProps(updatedProps) {
    const oldProps = this.getProp("domProps");
    const newProps = {
      ...oldProps,
      ...updatedProps
    };
    this.setProp("domProps", newProps);
    this.executeDomAction("updateDomProps", oldProps, newProps);
  }
  updateMarkdownStreamRenderer(newProp, newValue) {
    this.setProp(newProp, newValue);
    if (newProp === "syntaxHighlighter") {
      const typedNewValue = newValue;
      this.executeDomAction("updateMarkdownStreamRenderer", {
        syntaxHighlighter: typedNewValue
      });
    }
    if (newProp === "htmlSanitizer") {
      const typedNewValue = newValue;
      this.executeDomAction("updateMarkdownStreamRenderer", {
        htmlSanitizer: typedNewValue
      });
    }
  }
  onMarkdownStreamComplete(messageRendered) {
    this.context.emit("messageRendered", { uid: this.props.uid });
  }
};
__decorateClass$7([
  CompEventListener("markdown-stream-complete")
], CompChatItem.prototype, "onMarkdownStreamComplete", 1);
CompChatItem = __decorateClass$7([
  Model("chatItem", renderChatItem, updateChatItem)
], CompChatItem);

const throttle = (callback, limitInMilliseconds) => {
  let waiting = false;
  if (typeof callback !== "function") {
    throw new NluxError({
      source: "x/throttle",
      message: "Callback must be a function"
    });
  }
  const throttled = (...args) => {
    if (!waiting) {
      callback.apply(void 0, args);
      waiting = true;
      setTimeout(function() {
        waiting = false;
      }, limitInMilliseconds);
    }
  };
  return throttled;
};

const createConversationScrollHandler = (callback) => {
  let lastScrollTop = void 0;
  let lastHeight = void 0;
  return (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const {
      scrollTop,
      clientHeight,
      scrollHeight
    } = target;
    const minExpectedScrollTop = scrollHeight - 30;
    const scrolledToBottom = Math.ceil(scrollTop + clientHeight) >= minExpectedScrollTop;
    const scrollDirection = lastScrollTop === void 0 || lastHeight === void 0 ? void 0 : scrollTop > lastScrollTop && lastHeight === scrollHeight ? "down" : scrollTop < lastScrollTop && lastHeight === scrollHeight ? "up" : void 0;
    lastHeight = scrollHeight;
    lastScrollTop = scrollTop;
    callback({ scrolledToBottom, scrollDirection });
  };
};

const createAutoScrollController = (newConversationContainer, autoScroll) => {
  let shouldScrollWhenGenerating = autoScroll;
  let conversationContainer = newConversationContainer;
  let scrollingStickToConversationEnd = true;
  let activeChatSegment = void 0;
  const scrollHandler = throttle(createConversationScrollHandler(({
    scrolledToBottom,
    scrollDirection
  }) => {
    if (scrollingStickToConversationEnd) {
      if (scrollDirection === "up") {
        scrollingStickToConversationEnd = false;
      }
    } else {
      if (scrollDirection === "down" && scrolledToBottom) {
        scrollingStickToConversationEnd = true;
      }
    }
  }), 50);
  const initConversationContainer = (newConversationContainer2) => {
    newConversationContainer2.addEventListener("scroll", scrollHandler);
  };
  const resetConversationContainer = (oldConversationContainer) => {
    oldConversationContainer?.removeEventListener("scroll", scrollHandler);
  };
  const handleDoneWithSegment = (segmentId) => {
    if (activeChatSegment?.uid === segmentId) {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      activeChatSegment = void 0;
      resizeObserver = void 0;
      mutationObserver = void 0;
    }
  };
  let resizeObserver;
  let mutationObserver;
  const scrollToBottom = () => {
    conversationContainer?.scrollTo({
      top: 5e4,
      behavior: "instant"
    });
  };
  const handleActiveChatSegmentResized = () => {
    if (conversationContainer && shouldScrollWhenGenerating && scrollingStickToConversationEnd) {
      scrollToBottom();
    }
  };
  const handleActiveChatSegmentDomChanged = () => {
    handleActiveChatSegmentResized();
  };
  initConversationContainer(conversationContainer);
  return {
    updateConversationContainer: (newConversationContainer2) => {
      resetConversationContainer(conversationContainer);
      initConversationContainer(newConversationContainer2);
      conversationContainer = newConversationContainer2;
    },
    updateProps: ({ autoScroll: autoScroll2 }) => {
      shouldScrollWhenGenerating = autoScroll2;
    },
    handleNewChatSegmentAdded: (segmentId, segmentContainer) => {
      if (activeChatSegment) {
        resizeObserver?.disconnect();
        mutationObserver?.disconnect();
      }
      activeChatSegment = { uid: segmentId, container: segmentContainer };
      resizeObserver = new ResizeObserver(handleActiveChatSegmentResized);
      resizeObserver.observe(segmentContainer);
      mutationObserver = new MutationObserver(handleActiveChatSegmentDomChanged);
      mutationObserver.observe(segmentContainer, {
        childList: true,
        subtree: true,
        characterData: true
      });
      if (shouldScrollWhenGenerating) {
        scrollToBottom();
      }
    },
    handleChatSegmentRemoved: (segmentId) => handleDoneWithSegment(segmentId),
    handleChatSegmentComplete: (segmentId) => handleDoneWithSegment(segmentId),
    destroy: () => {
      if (activeChatSegment) {
        handleDoneWithSegment(activeChatSegment.uid);
        activeChatSegment = void 0;
      }
      resetConversationContainer(conversationContainer);
      conversationContainer = void 0;
    }
  };
};

const comp = (compClass) => {
  const compId = typeof compClass === "function" ? compClass.__compId : void 0;
  if (!compId) {
    throw new Error("Invalid compClass! Component should be registered before using");
  }
  const CompClass = CompRegistry.retrieve(compId)?.model;
  if (!CompClass || typeof CompClass !== "function") {
    throw new Error(`Component "${compId}" is not registered`);
  }
  return {
    withContext: (newContext) => {
      return {
        create: () => {
          return new CompClass(newContext, {});
        },
        withProps: (newProps) => {
          return {
            create: () => {
              return new CompClass(
                newContext,
                newProps
              );
            }
          };
        }
      };
    }
  };
};

const propsToCorePropsInEvents = (props) => {
  const excludeKeys = [
    "adapter",
    "events"
  ];
  const keys = Object.keys(props).filter(
    (key) => !excludeKeys.includes(key)
  );
  const result = {};
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    result[key] = props[key];
  }
  return result;
};

const className$4 = "nlux-comp-messageLoader";
const createLoaderDom = () => {
  const loader = document.createElement("div");
  loader.classList.add(className$4);
  const spinnerLoader = document.createElement("span");
  spinnerLoader.classList.add("spinning-loader");
  const spinnerLoaderContainer = document.createElement("div");
  spinnerLoaderContainer.classList.add("nlux-comp-loaderContainer");
  spinnerLoaderContainer.appendChild(spinnerLoader);
  loader.appendChild(spinnerLoaderContainer);
  return loader;
};

const className$3 = "nlux-comp-sendIcon";
const createSendIconDom = () => {
  const sendIcon = document.createElement("div");
  sendIcon.classList.add(className$3);
  const sndIcnCtn = document.createElement("div");
  sndIcnCtn.classList.add("nlux-comp-sendIcon-container");
  sendIcon.appendChild(sndIcnCtn);
  return sendIcon;
};

const statusClassName = {
  typing: "nlux-composer--typing",
  "submitting-prompt": "nlux-composer--submitting",
  "submitting-conversation-starter": "nlux-composer--submitting",
  waiting: "nlux-composer--waiting"
};
const applyNewStatusClassName = (element, status) => {
  const statuses = Object.keys(statusClassName);
  statuses.forEach((statusName) => {
    element.classList.remove(statusClassName[statusName]);
  });
  element.classList.add(statusClassName[status]);
};

const className$2 = "nlux-comp-composer";
const createComposerDom = (props) => {
  const element = document.createElement("div");
  element.classList.add(className$2);
  const textarea = document.createElement("textarea");
  textarea.placeholder = props.placeholder ?? "";
  textarea.value = props.message ?? "";
  if (props.autoFocus) {
    textarea.autofocus = true;
  }
  const submitButton = document.createElement("button");
  submitButton.append(createSendIconDom());
  submitButton.append(createLoaderDom());
  element.append(textarea);
  element.append(submitButton);
  applyNewStatusClassName(element, props.status);
  if (props.status === "submitting-conversation-starter" || props.status === "submitting-prompt") {
    textarea.disabled = true;
    submitButton.disabled = true;
  }
  if (props.status === "waiting") {
    submitButton.disabled = true;
  }
  if (props.status === "typing") {
    submitButton.disabled = props.disableSubmitButton ?? textarea.value === "";
  }
  return element;
};

const source$1 = "dom/listenTo";
const listenToElement = (element, query) => {
  let used = false;
  const queryResult = query ? element.querySelector(query) : element;
  const elementToReturn = queryResult instanceof HTMLElement ? queryResult : void 0;
  if (!elementToReturn) {
    throw new NluxRenderingError({
      source: source$1,
      message: `Could not find element with query "${query}". Make sure the query provided matches an element that exists in the root element.`
    });
  }
  const domListeners = /* @__PURE__ */ new Map();
  const userCallbacks = /* @__PURE__ */ new Map();
  const removeListeners = () => {
    if (!elementToReturn) {
      return;
    }
    domListeners.forEach((callback, eventName) => {
      elementToReturn.removeEventListener(eventName, callback);
    });
    domListeners.clear();
    userCallbacks.clear();
  };
  const result = {
    on: (eventName, callback) => {
      if (!callback || !elementToReturn) {
        return result;
      }
      if (!domListeners.has(eventName)) {
        const onEvent = (event) => {
          userCallbacks.get(eventName)?.forEach((callback2) => callback2(event));
        };
        domListeners.set(eventName, onEvent);
        elementToReturn.addEventListener(eventName, onEvent);
      }
      if (!userCallbacks.has(eventName)) {
        userCallbacks.set(eventName, /* @__PURE__ */ new Set());
      }
      const callbacksForEvent = userCallbacks.get(eventName);
      callbacksForEvent.add(callback);
      return result;
    },
    get: () => {
      if (used) {
        throw new Error("listenTo().get() can only be used once!");
      }
      used = true;
      return [elementToReturn, removeListeners];
    }
  };
  return result;
};

const source = (component, file) => {
  return `#${component}/${file}`;
};

const renderChatbox = ({
  appendToRoot,
  props,
  compEvent
}) => {
  const composerRoot = createComposerDom(props.domCompProps);
  appendToRoot(composerRoot);
  const [textBoxElement, removeTextBoxListeners] = listenToElement(composerRoot, ":scope > textarea").on("input", compEvent("text-updated")).on("keydown", (event) => {
    const isEnter = event.key === "Enter" && !event.isComposing;
    const aModifierKeyIsPressed = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
    if (isEnter && !aModifierKeyIsPressed) {
      compEvent("enter-key-pressed")(event);
      return;
    }
    const isCommandEnter = event.getModifierState("Meta") && event.key === "Enter";
    const isControlEnter = event.getModifierState("Control") && event.key === "Enter";
    if (isCommandEnter || isControlEnter) {
      compEvent("command-enter-key-pressed")(event);
      return;
    }
  }).get();
  const [sendButtonElement, removeSendButtonListeners] = listenToElement(composerRoot, ":scope > button").on("click", compEvent("send-message-clicked")).get();
  if (!(sendButtonElement instanceof HTMLButtonElement)) {
    throw new Error("Expected a button element");
  }
  if (!(textBoxElement instanceof HTMLTextAreaElement)) {
    throw new NluxRenderingError({
      source: source("composer", "render"),
      message: "Expected a textarea element"
    });
  }
  const focusTextInput = () => domOp(() => {
    textBoxElement.focus();
    textBoxElement.setSelectionRange(textBoxElement.value.length, textBoxElement.value.length);
  });
  return {
    elements: {
      root: composerRoot,
      textInput: textBoxElement,
      sendButton: sendButtonElement
    },
    actions: {
      focusTextInput
    },
    onDestroy: () => {
      removeTextBoxListeners();
      removeSendButtonListeners();
    }
  };
};

const updateContentOnStatusChange = (element, propsBefore, propsAfter) => {
  if (propsBefore.status === propsAfter.status) {
    return;
  }
  const textArea = element.querySelector("* > textarea");
  if ((propsAfter.status === "typing" || propsAfter.status === "waiting") && textArea.disabled) {
    textArea.disabled = false;
  } else {
    if ((propsAfter.status === "submitting-prompt" || propsAfter.status === "submitting-conversation-starter") && !textArea.disabled) {
      textArea.disabled = true;
    }
  }
  const submitButton = element.querySelector("* > button");
  if (propsAfter.status === "typing") {
    const disableSubmitButton = propsBefore.disableSubmitButton !== propsAfter.disableSubmitButton ? propsAfter.disableSubmitButton : propsBefore.disableSubmitButton;
    const shouldDisableSubmit = disableSubmitButton ?? textArea.value === "";
    if (submitButton.disabled !== shouldDisableSubmit) {
      submitButton.disabled = shouldDisableSubmit;
    }
  } else {
    if ((propsAfter.status === "waiting" || propsAfter.status === "submitting-prompt" || propsAfter.status === "submitting-conversation-starter") && !submitButton.disabled) {
      submitButton.disabled = true;
    }
  }
  if (propsBefore.placeholder !== propsAfter.placeholder) {
    textArea.placeholder = propsAfter.placeholder ?? "";
  }
  if (propsBefore.message !== propsAfter.message) {
    textArea.value = propsAfter.message ?? "";
  }
  if (propsBefore.autoFocus !== propsAfter.autoFocus) {
    textArea.autofocus = propsAfter.autoFocus ?? false;
  }
};

const updateComposerDom = (element, propsBefore, propsAfter) => {
  if (propsBefore.status === propsAfter.status && propsBefore.message === propsAfter.message && propsBefore.placeholder === propsAfter.placeholder && propsBefore.autoFocus === propsAfter.autoFocus && propsBefore.disableSubmitButton === propsAfter.disableSubmitButton) {
    return;
  }
  const textArea = element.querySelector("* > textarea");
  if (propsBefore.status !== propsAfter.status) {
    applyNewStatusClassName(element, propsAfter.status);
    updateContentOnStatusChange(element, propsBefore, propsAfter);
    adjustHeight(textArea);
    return;
  }
  if (propsBefore.placeholder !== propsAfter.placeholder) {
    textArea.placeholder = propsAfter.placeholder ?? "";
  }
  if (propsBefore.autoFocus !== propsAfter.autoFocus) {
    textArea.autofocus = propsAfter.autoFocus ?? false;
  }
  if (propsBefore.message !== propsAfter.message) {
    textArea.value = propsAfter.message ?? "";
    adjustHeight(textArea);
  }
  if (propsBefore.status === "typing") {
    const button = element.querySelector("* > button");
    const disableSubmitButton = propsBefore.disableSubmitButton !== propsAfter.disableSubmitButton ? propsAfter.disableSubmitButton : propsBefore.disableSubmitButton;
    const shouldDisableSubmit = disableSubmitButton ?? textArea.value === "";
    if (button.disabled !== shouldDisableSubmit) {
      button.disabled = shouldDisableSubmit;
    }
  }
};
const adjustHeight = (target) => {
  target.style.height = "auto";
  target.style.height = `${target.scrollHeight}px`;
};

const updateChatbox = ({
  propName,
  currentValue,
  newValue,
  dom
}) => {
  if (propName === "domCompProps" && dom.elements?.root) {
    updateComposerDom(dom.elements.root, currentValue, newValue);
  }
};

var __defProp$6 = Object.defineProperty;
var __getOwnPropDesc$6 = Object.getOwnPropertyDescriptor;
var __decorateClass$6 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$6(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp$6(target, key, result);
  return result;
};
let CompComposer = class extends BaseComp {
  constructor(context, { props, eventListeners }) {
    super(context, props);
    this.userEventListeners = eventListeners;
  }
  focusTextInput() {
    this.executeDomAction("focusTextInput");
  }
  handleCommandEnterKeyPressed(event) {
    const submitShortcut = this.getProp("domCompProps")?.submitShortcut;
    if (submitShortcut === "CommandEnter") {
      this.handleSendButtonClick();
      event?.preventDefault();
    }
  }
  handleEnterKeyPressed(event) {
    const submitShortcut = this.getProp("domCompProps")?.submitShortcut;
    if (!submitShortcut || submitShortcut === "Enter" && !event?.isComposing) {
      this.handleSendButtonClick();
      event?.preventDefault();
    }
  }
  handleSendButtonClick() {
    const domCompProps = this.getProp("domCompProps");
    if (domCompProps?.disableSubmitButton) {
      return;
    }
    const message = domCompProps?.message;
    if (!message) {
      return;
    }
    const callback = this.userEventListeners?.onSubmit;
    if (callback) {
      callback();
    }
  }
  handleTextChange(newValue) {
    const callback = this.userEventListeners?.onTextUpdated;
    if (callback) {
      callback(newValue);
    }
    const currentCompProps = this.getProp("domCompProps");
    this.setDomProps({
      ...currentCompProps,
      message: newValue
    });
  }
  handleTextInputUpdated(event) {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement)) {
      return;
    }
    this.handleTextChange(target.value);
  }
  setDomProps(props) {
    this.setProp("domCompProps", props);
  }
};
__decorateClass$6([
  CompEventListener("command-enter-key-pressed")
], CompComposer.prototype, "handleCommandEnterKeyPressed", 1);
__decorateClass$6([
  CompEventListener("enter-key-pressed")
], CompComposer.prototype, "handleEnterKeyPressed", 1);
__decorateClass$6([
  CompEventListener("send-message-clicked")
], CompComposer.prototype, "handleSendButtonClick", 1);
__decorateClass$6([
  CompEventListener("text-updated")
], CompComposer.prototype, "handleTextInputUpdated", 1);
CompComposer = __decorateClass$6([
  Model("composer", renderChatbox, updateChatbox)
], CompComposer);

const chatSegmentsToChatItems = (chatSegments) => {
  const chatItems = [];
  chatSegments.forEach((segment) => {
    segment.items.forEach((item) => {
      if (item.status !== "complete") {
        return;
      }
      if (item.participantRole === "assistant") {
        chatItems.push({
          role: "assistant",
          message: item.content
        });
      } else {
        if (item.participantRole === "user") {
          return chatItems.push({
            role: "user",
            message: item.content
          });
        }
      }
    });
  });
  return chatItems;
};

const getChatSegmentClassName = (status) => {
  const baseClassName = "nlux-chatSegment";
  if (status === "complete") {
    return `${baseClassName} nlux-chatSegment--complete`;
  }
  if (status === "error") {
    return `${baseClassName} nlux-chatSegment--error`;
  }
  return `${baseClassName} nlux-chatSegment--active`;
};

const renderChatSegment = ({
  props,
  compEvent,
  appendToRoot
}) => {
  let loaderContainer;
  const container = document.createElement("div");
  container.className = getChatSegmentClassName(props.status);
  const showLoader = () => {
    if (!loaderContainer) {
      loaderContainer = document.createElement("div");
      loaderContainer.className = "nlux-chatSegment-loader-container";
      const loaderDom = createLoaderDom();
      loaderContainer.appendChild(loaderDom);
      container.appendChild(loaderContainer);
      compEvent("loader-shown")(loaderContainer);
    }
  };
  const hideLoader = () => {
    if (loaderContainer) {
      loaderContainer.remove();
      loaderContainer = void 0;
      compEvent("loader-hidden")();
    }
  };
  if (props.status === "active") {
    showLoader();
  }
  appendToRoot(container);
  compEvent("chat-segment-ready")();
  return {
    elements: {
      chatSegmentContainer: container,
      loaderContainer
    },
    actions: {
      showLoader,
      hideLoader
    },
    onDestroy: () => {
      container.remove();
    }
  };
};

const updateChatSegment = ({ propName, newValue, dom }) => {
  if (propName === "status") {
    const rootContainer = dom.elements?.chatSegmentContainer;
    if (!rootContainer) {
      return;
    }
    const newStatus = newValue;
    rootContainer.className = getChatSegmentClassName(newStatus);
    if (newStatus === "active") {
      dom.actions?.showLoader();
    } else {
      dom.actions?.hideLoader();
    }
  }
  if (propName === "uid") {
    debug("updateChatSegment \u2014 uid is not updatable");
  }
};

const defaultAiName = "Assistant";
const defaultHumanName = "User";
const participantNameFromRoleAndPersona = (role, personaOptions) => {
  if (role === "assistant") {
    return personaOptions?.assistant?.name ?? defaultAiName;
  }
  if (role === "user") {
    return personaOptions?.user?.name ?? defaultHumanName;
  }
  return "";
};

const conversationDefaultLayout = "bubbles";
const getConversationLayout = (layout) => {
  return layout ?? conversationDefaultLayout;
};

const stringifyRandomResponse = (randomResponse) => {
  if (typeof randomResponse === "string") {
    return randomResponse;
  }
  if (typeof randomResponse === "object") {
    return `${randomResponse}`;
  }
  if (randomResponse === null || randomResponse === void 0) {
    return "";
  }
  if (typeof randomResponse.toString === "function") {
    return randomResponse.toString();
  }
  return JSON.stringify(randomResponse);
};

const getChatItemPropsFromSegmentItem = (segmentItem, conversationLayout, userPersona, assistantPersona) => {
  const layout = conversationLayout ?? conversationDefaultLayout;
  if (segmentItem.participantRole === "assistant") {
    const status = segmentItem.status === "complete" ? "complete" : "streaming";
    if (segmentItem.dataTransferMode === "stream") {
      return {
        status,
        layout,
        direction: "received",
        name: participantNameFromRoleAndPersona("assistant", { assistant: assistantPersona }),
        avatar: assistantPersona?.avatar
        // We do not provide am received message for streaming segments - As it's rendered by the chat item
        // while it's being streamed.
      };
    }
    if (segmentItem.status === "complete") {
      return {
        status,
        layout,
        direction: "received",
        name: participantNameFromRoleAndPersona("assistant", { assistant: assistantPersona }),
        avatar: assistantPersona?.avatar,
        message: stringifyRandomResponse(segmentItem.content)
      };
    }
    return {
      status,
      layout,
      direction: "received",
      name: participantNameFromRoleAndPersona("assistant", { assistant: assistantPersona }),
      avatar: assistantPersona?.avatar
    };
  }
  return {
    status: "complete",
    layout,
    direction: "sent",
    message: segmentItem.content,
    name: participantNameFromRoleAndPersona("user", { user: userPersona }),
    avatar: userPersona?.avatar
  };
};

var __defProp$5 = Object.defineProperty;
var __getOwnPropDesc$5 = Object.getOwnPropertyDescriptor;
var __decorateClass$5 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$5(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp$5(target, key, result);
  return result;
};
let CompChatSegment = class extends BaseComp {
  constructor(context, props) {
    super(context, props);
    this.chatItemCompIdsByIndex = [];
    this.chatItemComponentsById = /* @__PURE__ */ new Map();
  }
  addChatItem(item) {
    this.throwIfDestroyed();
    if (this.chatItemComponentsById.has(item.uid)) {
      throw new Error(`CompChatSegment: chat item with id "${item.uid}" already exists`);
    }
    const compChatItemProps = getChatItemPropsFromSegmentItem(
      item,
      this.getProp("conversationLayout"),
      this.getProp("userPersona"),
      this.getProp("assistantPersona")
    );
    if (!compChatItemProps) {
      throw new Error(`CompChatSegment: chat item with id "${item.uid}" has invalid props`);
    }
    const newChatItemComp = comp(CompChatItem).withContext(this.context).withProps({
      uid: item.uid,
      domProps: compChatItemProps,
      markdownLinkTarget: this.getProp("markdownLinkTarget"),
      showCodeBlockCopyButton: this.getProp("showCodeBlockCopyButton"),
      skipStreamingAnimation: this.getProp("skipStreamingAnimation"),
      syntaxHighlighter: this.getProp("syntaxHighlighter"),
      htmlSanitizer: this.getProp("htmlSanitizer"),
      streamingAnimationSpeed: this.getProp("streamingAnimationSpeed")
    }).create();
    this.chatItemComponentsById.set(item.uid, newChatItemComp);
    this.chatItemCompIdsByIndex.push(item.uid);
    if (!this.rendered) {
      return;
    }
    if (!this.renderedDom?.elements?.chatSegmentContainer) {
      warnOnce("CompChatSegment: chatSegmentContainer is not available");
      return;
    }
    newChatItemComp.render(
      this.renderedDom.elements.chatSegmentContainer,
      this.renderedDom.elements.loaderContainer
    );
  }
  addChunk(chatItemId, chunk, serverResponse) {
    if (this.destroyed) {
      return;
    }
    const chatItem = this.chatItemComponentsById.get(chatItemId);
    if (!chatItem) {
      throw new Error(`CompChatSegment: chat item with id "${chatItemId}" not found`);
    }
    chatItem.addChunk(chunk, serverResponse);
  }
  complete() {
    this.throwIfDestroyed();
    this.chatItemComponentsById.forEach((comp2) => comp2.commitChunks());
    this.setProp("status", "complete");
  }
  destroy() {
    this.chatItemComponentsById.forEach((comp2) => comp2.destroy());
    this.chatItemComponentsById.clear();
    this.chatItemCompIdsByIndex = [];
    super.destroy();
  }
  getChatItems() {
    return this.chatItemCompIdsByIndex.map(
      (id) => this.chatItemComponentsById.get(id)
    ).filter((comp2) => !!comp2);
  }
  onLoaderShown(loader) {
    if (this.renderedDom?.elements) {
      this.renderedDom.elements.loaderContainer = loader;
    }
  }
  setAssistantPersona(assistantPersona) {
    this.setProp("assistantPersona", assistantPersona);
    const newProps = {
      name: assistantPersona?.name,
      avatar: assistantPersona?.avatar
    };
    this.chatItemComponentsById.forEach((comp2) => {
      if (comp2.getChatSegmentItem().participantRole === "assistant") {
        comp2.updateDomProps(newProps);
      }
    });
  }
  setLayout(conversationLayout) {
    this.setProp("conversationLayout", conversationLayout);
    this.chatItemComponentsById.forEach((comp2) => {
      comp2.updateDomProps({
        layout: conversationLayout
      });
    });
  }
  setUserPersona(userPersona) {
    this.setProp("userPersona", userPersona);
    const newProps = {
      name: userPersona?.name,
      avatar: userPersona?.avatar
    };
    this.chatItemComponentsById.forEach((comp2) => {
      if (comp2.getChatSegmentItem().participantRole === "user") {
        comp2.updateDomProps(newProps);
      }
    });
  }
  updateMarkdownStreamRenderer(newProp, newValue) {
    this.setProp(newProp, newValue);
  }
  setProp(key, value) {
    super.setProp(key, value);
    if (key === "markdownLinkTarget" || key === "syntaxHighlighter" || key === "htmlSanitizer" || key === "skipStreamingAnimation" || key === "streamingAnimationSpeed") {
      this.chatItemComponentsById.forEach((comp2) => {
        comp2.updateMarkdownStreamRenderer(
          key,
          value
        );
      });
    }
  }
  onChatSegmentReady() {
    domOp(() => {
      if (!this.renderedDom?.elements?.chatSegmentContainer) {
        return;
      }
      const chatSegmentContainer = this.renderedDom?.elements?.chatSegmentContainer;
      this.chatItemComponentsById.forEach((comp2) => {
        if (!comp2.rendered) {
          comp2.render(chatSegmentContainer);
        }
      });
    });
  }
  onLoaderHidden() {
    if (this.renderedDom?.elements) {
      this.renderedDom.elements.loaderContainer = void 0;
    }
  }
};
__decorateClass$5([
  CompEventListener("loader-shown")
], CompChatSegment.prototype, "onLoaderShown", 1);
__decorateClass$5([
  CompEventListener("chat-segment-ready")
], CompChatSegment.prototype, "onChatSegmentReady", 1);
__decorateClass$5([
  CompEventListener("loader-hidden")
], CompChatSegment.prototype, "onLoaderHidden", 1);
CompChatSegment = __decorateClass$5([
  Model("chatSegment", renderChatSegment, updateChatSegment)
], CompChatSegment);

const renderConversation = ({ appendToRoot }) => {
  const segmentsContainer = document.createElement("div");
  segmentsContainer.classList.add("nlux-chatSegments-container");
  appendToRoot(segmentsContainer);
  return {
    elements: {
      segmentsContainer
    },
    actions: {}
  };
};

const updateConversation = () => {
};

var __defProp$4 = Object.defineProperty;
var __getOwnPropDesc$4 = Object.getOwnPropertyDescriptor;
var __decorateClass$4 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$4(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp$4(target, key, result);
  return result;
};
let CompConversation = class extends BaseComp {
  constructor(context, props) {
    super(context, props);
    this.chatSegmentCompIdsByIndex = [];
    this.chatSegmentComponentsById = /* @__PURE__ */ new Map();
    if (props.messages && props.messages.length > 0) {
      this.addChatSegment("complete", props.messages);
    }
  }
  addChatItem(segmentId, item) {
    const chatSegment = this.chatSegmentComponentsById.get(segmentId);
    if (!chatSegment) {
      throw new Error(`CompConversation: chat segment with id "${segmentId}" not found`);
    }
    if (chatSegment.destroyed) {
      warnOnce(`CompConversation: chat segment with id "${segmentId}" is destroyed and cannot be used`);
      return;
    }
    chatSegment.addChatItem(item);
  }
  addChatSegment(status = "active", initialConversation) {
    this.throwIfDestroyed();
    const segmentId = uid();
    const newChatSegmentComp = comp(CompChatSegment).withContext(this.context).withProps({
      uid: segmentId,
      status,
      conversationLayout: this.getProp("conversationLayout"),
      userPersona: this.getProp("userPersona"),
      assistantPersona: this.getProp("assistantPersona"),
      markdownLinkTarget: this.getProp("markdownLinkTarget"),
      showCodeBlockCopyButton: this.getProp("showCodeBlockCopyButton"),
      skipStreamingAnimation: this.getProp("skipStreamingAnimation"),
      syntaxHighlighter: this.getProp("syntaxHighlighter"),
      htmlSanitizer: this.getProp("htmlSanitizer"),
      streamingAnimationSpeed: this.getProp("streamingAnimationSpeed")
    }).create();
    if (initialConversation) {
      for (const item of initialConversation) {
        if (item.role === "assistant") {
          newChatSegmentComp.addChatItem({
            uid: uid(),
            participantRole: "assistant",
            time: /* @__PURE__ */ new Date(),
            dataTransferMode: "batch",
            status: "complete",
            content: item.message,
            serverResponse: item.serverResponse,
            contentType: "text"
          });
        } else {
          if (item.role === "user") {
            newChatSegmentComp.addChatItem({
              uid: uid(),
              participantRole: "user",
              time: /* @__PURE__ */ new Date(),
              status: "complete",
              content: item.message,
              contentType: "text"
            });
          }
        }
      }
    }
    this.chatSegmentComponentsById.set(segmentId, newChatSegmentComp);
    this.chatSegmentCompIdsByIndex.push(segmentId);
    const segmentComponentId = newChatSegmentComp.id;
    this.addSubComponent(segmentComponentId, newChatSegmentComp, "segmentsContainer");
    this.notifyAboutSegmentCountChange(this.chatSegmentCompIdsByIndex.length);
    return segmentId;
  }
  addChunk(segmentId, chatItemId, chunk, serverResponse) {
    const chatSegment = this.chatSegmentComponentsById.get(segmentId);
    if (!chatSegment) {
      throw new Error(`CompConversation: chat segment with id "${segmentId}" not found`);
    }
    chatSegment.addChunk(chatItemId, chunk, serverResponse);
  }
  completeChatSegment(segmentId) {
    const chatSegment = this.chatSegmentComponentsById.get(segmentId);
    if (!chatSegment) {
      throw new Error(`CompConversation: chat segment with id "${segmentId}" not found`);
    }
    if (chatSegment.destroyed) {
      debug(`CompConversation: chat segment with id "${segmentId}" is destroyed and cannot be used`);
      return;
    }
    chatSegment.complete();
  }
  getChatSegmentContainer(segmentId) {
    const chatSegment = this.chatSegmentComponentsById.get(segmentId);
    if (chatSegment?.root instanceof HTMLElement) {
      return chatSegment.root;
    }
  }
  getConversationContentForAdapter(historyPayloadSize = "max") {
    if (typeof historyPayloadSize === "number" && historyPayloadSize < 0) {
      warnOnce(
        `Invalid value provided for 'historyPayloadSize' : "${historyPayloadSize}"! Value must be a positive integer or 'max'.`
      );
      return void 0;
    }
    if (historyPayloadSize === 0) {
      return void 0;
    }
    const allSegmentsSorted = this.chatSegmentCompIdsByIndex.map(
      (segmentId) => this.chatSegmentComponentsById.get(segmentId)
    ).filter(
      (item) => item !== void 0
    ).map(
      (item) => {
        return {
          uid: item.id,
          status: "complete",
          items: item.getChatItems().map(
            (compChatItem) => compChatItem.getChatSegmentItem()
          )
        };
      }
    );
    const allChatItems = chatSegmentsToChatItems(allSegmentsSorted);
    if (historyPayloadSize === "max") {
      return allChatItems;
    }
    return allChatItems.slice(-historyPayloadSize);
  }
  removeChatSegment(segmentId) {
    const chatSegment = this.chatSegmentComponentsById.get(segmentId);
    if (!chatSegment) {
      return;
    }
    const segmentCompId = chatSegment.id;
    if (this.subComponents.has(segmentCompId)) {
      this.removeSubComponent(segmentCompId);
    }
    this.chatSegmentComponentsById.delete(chatSegment.id);
    const index = this.chatSegmentCompIdsByIndex.indexOf(segmentId);
    if (index >= 0) {
      this.chatSegmentCompIdsByIndex.splice(index, 1);
    }
    this.notifyAboutSegmentCountChange(this.chatSegmentCompIdsByIndex.length);
  }
  setAssistantPersona(assistantPersona) {
    this.setProp("assistantPersona", assistantPersona);
    this.chatSegmentComponentsById.forEach((comp2) => {
      comp2.setAssistantPersona(assistantPersona);
    });
  }
  setConversationLayout(layout) {
    this.setProp("conversationLayout", layout);
    this.chatSegmentComponentsById.forEach((comp2) => {
      comp2.setLayout(layout);
    });
  }
  setUserPersona(userPersona) {
    this.setProp("userPersona", userPersona);
    this.chatSegmentComponentsById.forEach((comp2) => {
      comp2.setUserPersona(userPersona);
    });
  }
  updateMarkdownStreamRenderer(newProp, newValue) {
    this.setProp(newProp, newValue);
  }
  setProp(key, value) {
    super.setProp(key, value);
    if (key === "markdownLinkTarget" || key === "syntaxHighlighter" || key === "htmlSanitizer" || key === "skipStreamingAnimation" || key === "streamingAnimationSpeed" || key === "showCodeBlockCopyButton") {
      const typedKey = key;
      const typedValue = value;
      this.chatSegmentComponentsById.forEach((comp2) => {
        comp2.updateMarkdownStreamRenderer(typedKey, typedValue);
      });
    }
  }
  notifyAboutSegmentCountChange(newCount) {
    const callback = this.getProp(
      "onSegmentCountChange"
    );
    if (callback) {
      callback(newCount);
    }
  }
};
CompConversation = __decorateClass$4([
  Model("conversation", renderConversation, updateConversation)
], CompConversation);

const createConversationStartersDom = (conversationStarters) => {
  const conversationStartersContainer = document.createElement("div");
  conversationStartersContainer.classList.add("nlux-comp-conversationStarters");
  conversationStarters.forEach((item, index) => {
    const conversationStarter = document.createElement("button");
    conversationStarter.classList.add("nlux-comp-conversationStarter");
    let conversationStarterIcon = document.createElement("div");
    if (item.icon) {
      if (typeof item.icon === "string") {
        conversationStarterIcon = document.createElement("img");
        conversationStarterIcon.setAttribute("src", item.icon);
        conversationStarterIcon.setAttribute("width", "16px");
      } else {
        conversationStarterIcon.className = "nlux-comp-conversationStarter-icon-container";
        conversationStarterIcon.appendChild(item.icon);
      }
    }
    const conversationStarterText = document.createElement("span");
    conversationStarterText.classList.add(
      "nlux-comp-conversationStarter-prompt"
    );
    conversationStarterText.textContent = item.label ?? item.prompt;
    conversationStarter.appendChild(conversationStarterIcon);
    conversationStarter.appendChild(conversationStarterText);
    conversationStartersContainer.appendChild(conversationStarter);
  });
  return conversationStartersContainer;
};

const renderConversationStarters = ({
  appendToRoot,
  props,
  compEvent
}) => {
  const conversationStartersContainer = createConversationStartersDom(
    props.conversationStarters
  );
  appendToRoot(conversationStartersContainer);
  let conversationStarterEventListenersCleanupFns = [];
  props.conversationStarters.forEach((conversationStarter, index) => {
    const [_element, removeListener] = listenToElement(
      conversationStartersContainer,
      `:scope > :nth-child(${index + 1})`
    ).on("click", () => {
      compEvent("conversation-starter-selected")(conversationStarter);
    }).get();
    conversationStarterEventListenersCleanupFns.push(removeListener);
  });
  return {
    elements: {},
    actions: {},
    onDestroy: () => {
      conversationStarterEventListenersCleanupFns.forEach((fn) => fn());
      conversationStarterEventListenersCleanupFns = [];
      conversationStartersContainer.remove();
    }
  };
};

const updateConversationStarters = ({}) => {
};

var __defProp$3 = Object.defineProperty;
var __getOwnPropDesc$3 = Object.getOwnPropertyDescriptor;
var __decorateClass$3 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$3(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp$3(target, key, result);
  return result;
};
let CompConversationStarters = class extends BaseComp {
  constructor(context, props) {
    super(context, props);
    this.updateConversationStarters = (items) => {
    };
  }
  conversationStarterClicked(conversationStarter) {
    const handler = this.getProp(
      "onConversationStarterSelected"
    );
    handler(conversationStarter);
  }
};
__decorateClass$3([
  CompEventListener("conversation-starter-selected")
], CompConversationStarters.prototype, "conversationStarterClicked", 1);
CompConversationStarters = __decorateClass$3([
  Model("conversationStarters", renderConversationStarters, updateConversationStarters)
], CompConversationStarters);

const greetingTextClassName = "nlux-comp-welcomeMessage-text";
const updateGreetingText = (root, newGreeting) => {
  const greetingContainer = root.querySelector(`.${greetingTextClassName}`);
  if (newGreeting === "" || newGreeting === void 0) {
    greetingContainer?.remove();
    return;
  }
  if (greetingContainer) {
    greetingContainer.textContent = newGreeting;
  } else {
    const greetingTextContainer = document.createElement("div");
    greetingTextContainer.classList.add(greetingTextClassName);
    greetingTextContainer.textContent = newGreeting;
    root.appendChild(greetingTextContainer);
  }
};

const className$1 = "nlux-comp-welcomeMessage";
const personaNameClassName = "nlux-comp-welcomeMessage-personaName";
const createGreetingDom = (props) => {
  const element = document.createElement("div");
  element.classList.add(className$1);
  const personaAvatar = createAvatarDom({
    name: props.name,
    avatar: props.avatar
  });
  element.append(personaAvatar);
  const personaName = document.createElement("div");
  const nameTextNode = document.createTextNode(props.name);
  personaName.append(nameTextNode);
  personaName.classList.add(personaNameClassName);
  element.append(personaName);
  updateGreetingText(element, props.message);
  return element;
};

const getNluxSmallPngLogo = () => {
  return `data:image/png;base64,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`;
};

const createDefaultGreetingDom = () => {
  return createGreetingDom({
    name: "",
    avatar: getNluxSmallPngLogo()
  });
};

const updateGreetingDom = (element, propsBefore, propsAfter) => {
  if (propsBefore.message === propsAfter.message && propsBefore.name === propsAfter.name && propsBefore.avatar === propsAfter.avatar) {
    return;
  }
  if (propsBefore.message !== propsAfter.message) {
    updateGreetingText(element, propsAfter.message);
  }
  if (propsBefore.name !== propsAfter.name) {
    const nameElement = element.querySelector(`.${personaNameClassName}`);
    if (nameElement) {
      const nameTextNode = document.createTextNode(propsAfter.name);
      nameElement.replaceChildren(nameTextNode);
    }
  }
  if (propsBefore.avatar !== propsAfter.avatar || propsBefore.name !== propsAfter.name) {
    const avatarElement = element.querySelector(`.${className$7}`);
    if (avatarElement) {
      updateAvatarDom(
        avatarElement,
        {
          name: propsBefore.name,
          avatar: propsBefore.avatar
        },
        {
          name: propsAfter.name,
          avatar: propsAfter.avatar
        }
      );
    }
  }
};

const renderLaunchPad = ({ appendToRoot, props }) => {
  const renderingContext = {
    assistantPersona: props.assistantPersona,
    conversationStarters: props.conversationStarters,
    showGreeting: props.showGreeting !== false
  };
  let greetingDom;
  if (renderingContext.showGreeting) {
    if (props.assistantPersona) {
      const assistant = props.assistantPersona;
      greetingDom = createGreetingDom({
        name: assistant.name,
        avatar: assistant.avatar,
        message: assistant.tagline
      });
    } else {
      greetingDom = createDefaultGreetingDom();
    }
  }
  if (greetingDom) {
    appendToRoot(greetingDom);
    renderingContext.greetingElement = greetingDom;
  }
  const conversationStartersContainer = document.createElement("div");
  conversationStartersContainer.classList.add("nlux-conversationStarters-container");
  appendToRoot(conversationStartersContainer);
  const resetGreeting = (showGreeting = true) => {
    renderingContext.showGreeting = showGreeting;
    if (renderingContext.greetingElement) {
      renderingContext.greetingElement.remove();
      renderingContext.greetingElement = void 0;
    }
    if (!showGreeting) {
      return;
    }
    renderingContext.greetingElement = renderingContext.assistantPersona ? createGreetingDom({
      name: renderingContext.assistantPersona.name,
      avatar: renderingContext.assistantPersona.avatar,
      message: renderingContext.assistantPersona.tagline
    }) : createDefaultGreetingDom();
    if (renderingContext.greetingElement) {
      conversationStartersContainer.insertAdjacentElement(
        "beforebegin",
        renderingContext.greetingElement
      );
    }
  };
  return {
    elements: {
      conversationStartersContainer
    },
    actions: {
      resetGreeting: (showGreeting = true) => {
        resetGreeting(showGreeting);
      },
      updateAssistantPersona: (newValue) => {
        const previousAssistantPersona = renderingContext.assistantPersona;
        renderingContext.assistantPersona = newValue;
        if (!previousAssistantPersona && !newValue || !renderingContext.showGreeting) {
          return;
        }
        if (!newValue) {
          resetGreeting();
          return;
        }
        if (previousAssistantPersona) {
          updateGreetingDom(renderingContext.greetingElement, {
            name: previousAssistantPersona?.name,
            avatar: previousAssistantPersona?.avatar,
            message: previousAssistantPersona?.tagline
          }, {
            name: newValue.name,
            avatar: newValue.avatar,
            message: newValue.tagline
          });
        } else {
          resetGreeting();
        }
      }
    },
    onDestroy: () => {
      renderingContext.greetingElement?.remove();
      conversationStartersContainer.remove();
    }
  };
};

const updateLaunchPad = ({}) => {
};

var __defProp$2 = Object.defineProperty;
var __getOwnPropDesc$2 = Object.getOwnPropertyDescriptor;
var __decorateClass$2 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$2(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp$2(target, key, result);
  return result;
};
let CompLaunchPad = class extends BaseComp {
  constructor(context, props) {
    super(context, props);
    this.setConversationStarters(props.conversationStarters);
  }
  setAssistantPersona(assistantPersona) {
    this.setProp("assistantPersona", assistantPersona);
    this.executeDomAction("updateAssistantPersona", assistantPersona);
  }
  setConversationStarters(conversationStarters) {
    if (!conversationStarters && !this.conversationStartersComp) {
      return;
    }
    if (conversationStarters && !this.conversationStartersComp) {
      const onConversationStarterSelected = this.getProp(
        "onConversationStarterSelected"
      );
      this.conversationStartersComp = comp(CompConversationStarters).withContext(this.context).withProps({
        conversationStarters,
        onConversationStarterSelected
      }).create();
      this.addSubComponent(
        this.conversationStartersComp.id,
        this.conversationStartersComp,
        "conversationStartersContainer"
      );
      return;
    }
    if (!conversationStarters && this.conversationStartersComp) {
      this.removeSubComponent(this.conversationStartersComp.id);
      this.conversationStartersComp = void 0;
    } else {
      this.conversationStartersComp?.updateConversationStarters(conversationStarters);
    }
  }
  setShowGreeting(showGreeting) {
    this.setProp("showGreeting", showGreeting);
    this.executeDomAction("resetGreeting", showGreeting);
  }
  resetConversationStarters() {
    const conversationStarters = this.getProp("conversationStarters");
    this.setConversationStarters(conversationStarters);
  }
};
CompLaunchPad = __decorateClass$2([
  Model("launchPad", renderLaunchPad, updateLaunchPad)
], CompLaunchPad);

const isStandardChatAdapter = (adapter) => {
  if (typeof adapter !== "object" || adapter === null) {
    return false;
  }
  const typedAdapter = adapter;
  return (typeof typedAdapter.streamText === "function" || typeof typedAdapter.batchText === "function") && ["stream", "batch"].includes(typedAdapter.dataTransferMode) && typeof typedAdapter.id === "string" && (typeof typedAdapter.info === "object" && typedAdapter.info !== null) && typeof typedAdapter.preProcessAiBatchedMessage === "function" && typeof typedAdapter.preProcessAiStreamedChunk === "function";
};

const isHighPerfJsEngine = typeof navigator !== "undefined" && navigator?.userAgent?.includes("Safari");
const defaultAsyncDelay = isHighPerfJsEngine ? 100 : 1;
const triggerAsyncCallback = (trigger, delay = defaultAsyncDelay) => {
  setTimeout(() => {
    trigger();
  }, delay);
};

const submitAndBatchTextResponse = async (segmentId, userMessage, adapter, extras, aiMessageReceivedCallbacks, chatSegmentCompleteCallbacks, chatSegmentExceptionCallbacks) => {
  try {
    const prompt = userMessage.content;
    const adapterAsStandardAdapter = isStandardChatAdapter(adapter) ? adapter : void 0;
    const isStandardAdapter = adapterAsStandardAdapter !== void 0;
    const responseUid = uid();
    const participantRole = "assistant";
    const status = "complete";
    const time = /* @__PURE__ */ new Date();
    const dataTransferMode = "batch";
    let aiResponse = void 0;
    if (isStandardAdapter) {
      const rawResponse = await adapterAsStandardAdapter.batchText(prompt, extras);
      const preProcessedResponse = adapterAsStandardAdapter.preProcessAiBatchedMessage(rawResponse, extras);
      if (preProcessedResponse !== void 0 && preProcessedResponse !== null) {
        aiResponse = {
          uid: responseUid,
          content: preProcessedResponse,
          contentType: "text",
          serverResponse: rawResponse,
          participantRole,
          status,
          time,
          dataTransferMode
        };
      }
    } else {
      const response = await adapter.batchText(prompt, extras);
      aiResponse = {
        uid: responseUid,
        content: response,
        contentType: "text",
        serverResponse: void 0,
        participantRole,
        status,
        time,
        dataTransferMode
      };
    }
    if (!aiResponse) {
      throw new Error("Response from adapter was undefined or cannot be processed");
    }
    const validAiResponse = aiResponse;
    triggerAsyncCallback(() => {
      aiMessageReceivedCallbacks.forEach((callback) => {
        callback(validAiResponse);
      });
    });
    const updatedChatSegment = {
      uid: segmentId,
      status: "complete",
      items: [
        userMessage,
        aiResponse
      ]
    };
    triggerAsyncCallback(() => {
      chatSegmentCompleteCallbacks.forEach((callback) => {
        callback(updatedChatSegment);
      });
    });
  } catch (error) {
    warn(error);
    const errorObject = error instanceof Error ? error : typeof error === "string" ? new Error(error) : new Error("Unknown error");
    triggerAsyncCallback(() => {
      const errorId = "failed-to-load-content";
      chatSegmentExceptionCallbacks.forEach((callback) => callback(errorId, errorObject));
    });
  }
};

const submitAndStreamServerComponentResponse = (segmentId, userMessage, adapter, extras, aiServerComponentStreamStartedCallbacks, aiServerComponentStreamedCallbacks, chatSegmentCompleteCallbacks, chatSegmentExceptionCallbacks) => {
  return new Promise((resolve, reject) => {
    try {
      const prompt = userMessage.content;
      const responseUid = uid();
      const participantRole = "assistant";
      const status = "streaming";
      const time = /* @__PURE__ */ new Date();
      const dataTransferMode = "stream";
      let aiResponse = void 0;
      let serverComponent = void 0;
      const handleComplete = () => {
        triggerAsyncCallback(() => {
          aiServerComponentStreamedCallbacks.forEach((callback) => {
            if (aiResponse && serverComponent) {
              callback({
                ...aiResponse,
                content: serverComponent,
                status: "complete"
              });
            }
          });
        }, 20);
        const updatedChatSegment = {
          uid: segmentId,
          status: "complete",
          items: [
            userMessage,
            aiResponse
          ]
        };
        triggerAsyncCallback(() => {
          chatSegmentCompleteCallbacks.forEach((callback) => {
            callback(updatedChatSegment);
          });
          resolve();
        }, 20);
      };
      const handleError = () => {
        chatSegmentExceptionCallbacks.forEach((callback) => {
          callback("failed-to-stream-server-component", new Error("Failed to load content"));
        });
      };
      serverComponent = adapter.streamServerComponent(
        prompt,
        extras,
        {
          onServerComponentReceived: handleComplete,
          onError: handleError
        }
      );
      aiResponse = {
        uid: responseUid,
        content: serverComponent,
        contentType: "server-component",
        participantRole,
        status,
        time,
        dataTransferMode
      };
      triggerAsyncCallback(() => {
        aiServerComponentStreamStartedCallbacks.forEach((callback) => {
          callback(aiResponse);
        });
      }, 10);
    } catch (error) {
      warn(error);
      const errorObject = error instanceof Error ? error : typeof error === "string" ? new Error(error) : new Error("Unknown error");
      triggerAsyncCallback(() => {
        const errorId = "failed-to-load-content";
        chatSegmentExceptionCallbacks.forEach((callback) => callback(errorId, errorObject));
      });
    }
  });
};

const submitAndStreamTextResponse = (segmentId, userMessage, adapter, extras, aiMessageStreamStartedCallbacks, aiMessageStreamedCallbacks, aiMessageChunkReceivedCallbacks, chatSegmentCompleteCallbacks, chatSegmentErrorCallbacks) => {
  return new Promise((resolve) => {
    const streamedMessageId = uid();
    const streamedContent = [];
    const streamedRawContent = [];
    let firstChunkReceived = false;
    let errorOccurred = false;
    let completeOccurred = false;
    const emitAiMessageStreamStartedEvent = () => {
      if (firstChunkReceived) {
        return;
      }
      firstChunkReceived = true;
      triggerAsyncCallback(() => {
        aiMessageStreamStartedCallbacks.forEach((callback) => {
          callback({
            uid: streamedMessageId,
            status: "streaming",
            time: /* @__PURE__ */ new Date(),
            participantRole: "assistant",
            dataTransferMode: "stream"
          });
        });
      });
    };
    const isStandardAdapter = isStandardChatAdapter(adapter);
    const observer = {
      next: (chunk) => {
        if (errorOccurred || completeOccurred) {
          return;
        }
        let aiMsgChunk;
        let rawChunk;
        if (isStandardAdapter) {
          const chunkAsRaw = chunk;
          const adapterAsStandardAdapter = adapter;
          const preProcessedChunk = adapterAsStandardAdapter.preProcessAiStreamedChunk(chunkAsRaw, extras);
          if (preProcessedChunk !== void 0 && preProcessedChunk !== null) {
            aiMsgChunk = preProcessedChunk;
            rawChunk = chunkAsRaw;
            streamedContent.push(aiMsgChunk);
            streamedRawContent.push(rawChunk);
          }
        } else {
          aiMsgChunk = chunk;
          streamedContent.push(aiMsgChunk);
        }
        if (aiMsgChunk === void 0 || aiMsgChunk === null) {
          warn("Adapter returned an undefined or null value from streamText. This chunk will be ignored.");
          return;
        }
        if (!firstChunkReceived) {
          emitAiMessageStreamStartedEvent();
        }
        triggerAsyncCallback(() => {
          aiMessageChunkReceivedCallbacks.forEach((callback) => {
            callback({
              chunk: aiMsgChunk,
              messageId: streamedMessageId,
              serverResponse: rawChunk
            });
          });
        });
      },
      complete: () => {
        if (errorOccurred || completeOccurred) {
          return;
        }
        completeOccurred = true;
        triggerAsyncCallback(() => {
          const aiMessage = {
            uid: streamedMessageId,
            status: "complete",
            content: streamedContent,
            contentType: "text",
            serverResponse: void 0,
            time: /* @__PURE__ */ new Date(),
            participantRole: "assistant",
            dataTransferMode: "stream"
          };
          aiMessageStreamedCallbacks.forEach((callback) => {
            callback(aiMessage);
          });
          resolve();
        });
        triggerAsyncCallback(() => {
          const updatedChatSegment = {
            uid: segmentId,
            status: "complete",
            items: [
              userMessage,
              {
                uid: streamedMessageId,
                status: "complete",
                contentType: "text",
                content: streamedContent,
                serverResponse: streamedRawContent,
                time: /* @__PURE__ */ new Date(),
                participantRole: "assistant",
                dataTransferMode: "stream"
              }
            ]
          };
          chatSegmentCompleteCallbacks.forEach((callback) => {
            callback(updatedChatSegment);
          });
        });
      },
      error: (error) => {
        if (errorOccurred || completeOccurred) {
          return;
        }
        errorOccurred = true;
        triggerAsyncCallback(() => {
          const errorId = "failed-to-stream-content";
          chatSegmentErrorCallbacks.forEach((callback) => {
            callback(errorId, error);
          });
          resolve();
        });
      }
    };
    adapter.streamText(userMessage.content, observer, extras);
  });
};

const getContentTypeToGenerate = (adapter) => {
  if ("streamServerComponent" in adapter) {
    return "server-component";
  }
  return "text";
};

const getDataTransferModeToUse = (adapter) => {
  const supportedDataTransferModes = [];
  const adapterAsCoreAdapter = adapter;
  const adapterAsEsmAdapter = adapter;
  if (adapterAsCoreAdapter?.streamText !== void 0 || adapterAsEsmAdapter?.streamServerComponent !== void 0) {
    supportedDataTransferModes.push("stream");
  }
  if (adapterAsCoreAdapter?.batchText !== void 0) {
    supportedDataTransferModes.push("batch");
  }
  const adapterAsStandardAdapter = isStandardChatAdapter(
    adapter
  ) ? adapter : void 0;
  const adapterDataTransferMode = adapterAsStandardAdapter?.dataTransferMode ?? void 0;
  const defaultDataTransferMode = supportedDataTransferModes.length === 1 ? supportedDataTransferModes[0] : "stream";
  return adapterDataTransferMode ?? defaultDataTransferMode;
};

const createEmptyCompleteSegment = () => {
  const completeListeners = /* @__PURE__ */ new Set();
  const segmentId = uid();
  const segment = {
    uid: segmentId,
    status: "complete",
    items: []
  };
  triggerAsyncCallback(() => {
    completeListeners.forEach((listener) => {
      listener(segment);
    });
    completeListeners.clear();
  });
  return {
    segment,
    observable: {
      on: (event, callback) => {
        if (event === "complete") {
          completeListeners.add(callback);
        }
      },
      removeListener: (event, callback) => {
        completeListeners.delete(callback);
      },
      destroy: () => {
        completeListeners.clear();
      },
      get segmentId() {
        return segmentId;
      }
    },
    dataTransferMode: "batch"
  };
};

const createEmptyErrorSegment = (errorId) => {
  const errorListeners = /* @__PURE__ */ new Set();
  const segmentId = uid();
  const segment = {
    uid: segmentId,
    status: "error",
    items: []
  };
  triggerAsyncCallback(() => {
    errorListeners.forEach((listener) => listener(errorId));
    errorListeners.clear();
  });
  return {
    segment,
    dataTransferMode: "stream",
    observable: {
      on: (event, callback) => {
        if (event === "error") {
          errorListeners.add(callback);
        }
      },
      removeListener: (event, callback) => {
        errorListeners.delete(callback);
      },
      destroy: () => {
        errorListeners.clear();
      },
      get segmentId() {
        return segmentId;
      }
    }
  };
};

const getUserMessageFromPrompt = (prompt) => {
  return {
    uid: uid(),
    time: /* @__PURE__ */ new Date(),
    status: "complete",
    participantRole: "user",
    content: prompt,
    contentType: "text"
  };
};

const submitPrompt = (prompt, adapter, extras) => {
  if (!prompt) {
    return createEmptyCompleteSegment();
  }
  const adapterAsAny = adapter;
  if (adapterAsAny.streamText === void 0 && adapterAsAny.batchText === void 0 && adapterAsAny.streamServerComponent === void 0) {
    return createEmptyErrorSegment("no-data-transfer-mode-supported");
  }
  const segmentId = uid();
  const userMessage = getUserMessageFromPrompt(prompt);
  let userMessageReceivedCallbacks = /* @__PURE__ */ new Set();
  let chatSegmentCompleteCallbacks = /* @__PURE__ */ new Set();
  let chatSegmentExceptionCallbacks = /* @__PURE__ */ new Set();
  let aiMessageReceivedCallbacks = void 0;
  let aiEsmStreamStartedCallbacks = void 0;
  let aiEsmStreamedCallbacks = void 0;
  let aiMessageStreamStartedCallbacks = void 0;
  let aiMessageStreamedCallbacks = void 0;
  let aiMessageChunkReceivedCallbacks = void 0;
  triggerAsyncCallback(() => {
    if (!userMessageReceivedCallbacks?.size) {
      return;
    }
    userMessageReceivedCallbacks.forEach((callback) => {
      callback(userMessage);
    });
    userMessageReceivedCallbacks.clear();
    userMessageReceivedCallbacks = void 0;
  });
  const dataTransferModeToUse = getDataTransferModeToUse(adapter);
  const contentTypeToGenerate = getContentTypeToGenerate(adapter);
  if (contentTypeToGenerate === "server-component") {
    aiEsmStreamedCallbacks = /* @__PURE__ */ new Set();
    aiEsmStreamStartedCallbacks = /* @__PURE__ */ new Set();
    submitAndStreamServerComponentResponse(
      segmentId,
      userMessage,
      adapter,
      extras,
      aiEsmStreamStartedCallbacks,
      aiEsmStreamedCallbacks,
      chatSegmentCompleteCallbacks,
      chatSegmentExceptionCallbacks
    ).finally(
      () => {
        triggerAsyncCallback(() => removeAllListeners());
      }
    );
  } else {
    if (dataTransferModeToUse === "batch") {
      aiMessageReceivedCallbacks = /* @__PURE__ */ new Set();
      submitAndBatchTextResponse(
        segmentId,
        userMessage,
        adapter,
        extras,
        aiMessageReceivedCallbacks,
        chatSegmentCompleteCallbacks,
        chatSegmentExceptionCallbacks
      ).finally(() => {
        triggerAsyncCallback(() => removeAllListeners());
      });
    } else {
      aiMessageStreamStartedCallbacks = /* @__PURE__ */ new Set();
      aiMessageStreamedCallbacks = /* @__PURE__ */ new Set();
      aiMessageChunkReceivedCallbacks = /* @__PURE__ */ new Set();
      submitAndStreamTextResponse(
        segmentId,
        userMessage,
        adapter,
        extras,
        aiMessageStreamStartedCallbacks,
        aiMessageStreamedCallbacks,
        aiMessageChunkReceivedCallbacks,
        chatSegmentCompleteCallbacks,
        chatSegmentExceptionCallbacks
      ).finally(() => {
        triggerAsyncCallback(() => removeAllListeners());
      });
    }
  }
  const removeAllListeners = () => {
    userMessageReceivedCallbacks?.clear();
    userMessageReceivedCallbacks = void 0;
    aiMessageReceivedCallbacks?.clear();
    aiMessageReceivedCallbacks = void 0;
    aiEsmStreamStartedCallbacks?.clear();
    aiEsmStreamStartedCallbacks = void 0;
    aiEsmStreamedCallbacks?.clear();
    aiEsmStreamedCallbacks = void 0;
    aiMessageStreamStartedCallbacks?.clear();
    aiMessageStreamStartedCallbacks = void 0;
    aiMessageStreamedCallbacks?.clear();
    aiMessageStreamedCallbacks = void 0;
    aiMessageChunkReceivedCallbacks?.clear();
    aiMessageChunkReceivedCallbacks = void 0;
    chatSegmentCompleteCallbacks?.clear();
    chatSegmentCompleteCallbacks = void 0;
    chatSegmentExceptionCallbacks?.clear();
    chatSegmentExceptionCallbacks = void 0;
  };
  return {
    segment: {
      status: "active",
      uid: segmentId,
      items: []
      // Initially empty — User message will be added in callback above.
    },
    dataTransferMode: dataTransferModeToUse,
    observable: {
      get segmentId() {
        return segmentId;
      },
      on: (event, callback) => {
        if (event === "userMessageReceived" && userMessageReceivedCallbacks) {
          userMessageReceivedCallbacks.add(
            callback
          );
          return;
        }
        if (event === "aiMessageReceived" && aiMessageReceivedCallbacks) {
          aiMessageReceivedCallbacks.add(
            callback
          );
          return;
        }
        if (event === "aiServerComponentStreamStarted" && aiEsmStreamStartedCallbacks) {
          aiEsmStreamStartedCallbacks.add(
            callback
          );
          return;
        }
        if (event === "aiServerComponentStreamed" && aiEsmStreamedCallbacks) {
          aiEsmStreamedCallbacks.add(
            callback
          );
          return;
        }
        if (event === "aiMessageStreamStarted" && aiMessageStreamStartedCallbacks) {
          aiMessageStreamStartedCallbacks.add(
            callback
          );
          return;
        }
        if (event === "aiMessageStreamed" && aiMessageStreamedCallbacks) {
          aiMessageStreamedCallbacks.add(
            callback
          );
          return;
        }
        if (event === "aiChunkReceived" && aiMessageChunkReceivedCallbacks) {
          aiMessageChunkReceivedCallbacks.add(
            callback
          );
          return;
        }
        if (event === "complete" && chatSegmentCompleteCallbacks) {
          chatSegmentCompleteCallbacks.add(
            callback
          );
          return;
        }
        if (event === "error" && chatSegmentExceptionCallbacks) {
          chatSegmentExceptionCallbacks.add(
            callback
          );
          return;
        }
      },
      removeListener: (event, callback) => {
        if (event === "userMessageReceived") {
          userMessageReceivedCallbacks?.delete(
            callback
          );
          return;
        }
        if (event === "aiMessageReceived") {
          aiMessageReceivedCallbacks?.delete(
            callback
          );
          return;
        }
        if (event === "aiMessageStreamStarted") {
          aiMessageStreamStartedCallbacks?.delete(
            callback
          );
          return;
        }
        if (event === "aiMessageStreamed") {
          aiMessageStreamedCallbacks?.delete(
            callback
          );
          return;
        }
        if (event === "aiChunkReceived") {
          aiMessageChunkReceivedCallbacks?.delete(
            callback
          );
          return;
        }
        if (event === "complete") {
          chatSegmentCompleteCallbacks?.delete(
            callback
          );
          return;
        }
        if (event === "error") {
          chatSegmentExceptionCallbacks?.delete(
            callback
          );
          return;
        }
      },
      destroy: () => removeAllListeners()
    }
  };
};

const NLErrors = {
  //
  // Adapter config errors
  //
  "data-transfer-mode-not-supported": "Requested data transfer mode is not supported",
  "no-data-transfer-mode-supported": "Adapter does not support any valid data transfer modes",
  //
  // Internet, HTTP, and API errors
  //
  "connection-error": "Connection error",
  "invalid-credentials": "Invalid credentials",
  "invalid-api-key": "Invalid API key",
  "http-server-side-error": "HTTP server side error",
  "http-client-side-error": "HTTP client side error",
  //
  // Generic data loading errors
  //
  "failed-to-load-content": "Failed to load content",
  "failed-to-stream-content": "Failed to stream content",
  "failed-to-stream-server-component": "Failed to stream server component",
  //
  // Content rendering errors
  //
  "failed-to-render-content": "Failed to display content"
};

const submitPromptFactory = ({
  context,
  composerInstance,
  conversation,
  autoScrollController,
  messageToSend,
  resetComposer,
  setComposerAsWaiting
}) => {
  return () => {
    const segmentId = conversation.addChatSegment();
    try {
      const currentComposerProps = composerInstance.getProp("domCompProps");
      composerInstance.setDomProps({ ...currentComposerProps, status: "submitting-prompt" });
      const extras = {
        aiChatProps: context.aiChatProps,
        conversationHistory: conversation.getConversationContentForAdapter(
          context.aiChatProps?.conversationOptions?.historyPayloadSize
        )
      };
      const result = submitPrompt(
        messageToSend,
        context.adapter,
        extras
      );
      result.observable.on("error", (errorId, errorObject) => {
        conversation.removeChatSegment(segmentId);
        autoScrollController?.handleChatSegmentRemoved(segmentId);
        resetComposer(false);
        context.exception(errorId);
        context.emit("error", {
          errorId,
          message: NLErrors[errorId],
          errorObject
        });
      });
      result.observable.on("userMessageReceived", (userMessage) => {
        conversation.addChatItem(segmentId, userMessage);
        context.emit("messageSent", { uid: userMessage.uid, message: userMessage.content });
        domOp(() => {
          if (autoScrollController) {
            const chatSegmentContainer = conversation.getChatSegmentContainer(segmentId);
            if (chatSegmentContainer) {
              autoScrollController.handleNewChatSegmentAdded(segmentId, chatSegmentContainer);
            }
          }
        });
      });
      if (result.dataTransferMode === "batch") {
        result.observable.on("aiMessageReceived", (aiMessage) => {
          const isStringContent = typeof aiMessage.content === "string";
          const newAiMessage = {
            ...aiMessage,
            // When content is a string, we stream is instead of adding it into the chat segment
            content: isStringContent ? "" : aiMessage.content
          };
          conversation.addChatItem(segmentId, newAiMessage);
          if (isStringContent) {
            conversation.addChunk(
              segmentId,
              newAiMessage.uid,
              aiMessage.content,
              aiMessage.serverResponse
            );
          }
          conversation.completeChatSegment(segmentId);
          context.emit("messageReceived", {
            uid: aiMessage.uid,
            message: aiMessage.content
          });
          resetComposer(true);
        });
      } else {
        result.observable.on("aiMessageStreamStarted", (aiMessageStream) => {
          conversation.addChatItem(segmentId, aiMessageStream);
          setComposerAsWaiting();
          context.emit("messageStreamStarted", { uid: aiMessageStream.uid });
        });
        result.observable.on("aiChunkReceived", (item) => {
          const { messageId, chunk, serverResponse } = item;
          conversation.addChunk(segmentId, messageId, chunk, serverResponse);
        });
        result.observable.on("aiMessageStreamed", (aiMessage) => {
          if (aiMessage.status === "complete") {
            context.emit("messageReceived", {
              uid: aiMessage.uid,
              // We only pass the response to custom renderer when the status is 'complete'.
              message: aiMessage.content
            });
          }
        });
        result.observable.on("aiServerComponentStreamStarted", (aiMessage) => {
          conversation.addChatItem(segmentId, aiMessage);
          setComposerAsWaiting();
          context.emit("messageStreamStarted", { uid: aiMessage.uid });
        });
        result.observable.on("aiServerComponentStreamed", (aiMessage) => {
          if (aiMessage.status === "complete") {
            context.emit("messageReceived", {
              uid: aiMessage.uid,
              // We only pass the response to custom renderer when the status is 'complete'.
              message: aiMessage.content
            });
          }
        });
        result.observable.on("complete", () => {
          conversation.completeChatSegment(segmentId);
          resetComposer(false);
        });
      }
    } catch (error) {
      warn(error);
      resetComposer(false);
    }
  };
};

const getChatRoomStatus = (initialConversationContent, segmentsCount) => {
  if (initialConversationContent !== void 0 && initialConversationContent.length > 0) {
    return "active";
  }
  if (segmentsCount !== void 0 && segmentsCount > 0) {
    return "active";
  }
  return "starting";
};

const renderChatRoom = ({ appendToRoot, compEvent, props }) => {
  const conversationContainer = document.createElement("div");
  conversationContainer.classList.add("nlux-conversation-container");
  const composerContainer = document.createElement("div");
  composerContainer.classList.add("nlux-composer-container");
  const launchPadContainer = document.createElement("div");
  launchPadContainer.classList.add("nlux-launchPad-container");
  const dom = document.createDocumentFragment();
  dom.appendChild(launchPadContainer);
  dom.appendChild(conversationContainer);
  dom.appendChild(composerContainer);
  const visibleProp = props.visible ?? true;
  const chatRoomContainer = document.createElement("div");
  const setChatRoomStatusClass = (status) => {
    chatRoomContainer.classList.remove("nlux-chatRoom-starting");
    chatRoomContainer.classList.remove("nlux-chatRoom-active");
    chatRoomContainer.classList.add(`nlux-chatRoom-${status}`);
  };
  chatRoomContainer.classList.add("nlux-chatRoom-container");
  setChatRoomStatusClass(
    getChatRoomStatus(props.initialConversationContent)
  );
  chatRoomContainer.append(dom);
  chatRoomContainer.style.display = visibleProp ? "" : "none";
  const [_, removeConversationContainerListeners] = listenToElement(
    chatRoomContainer,
    ":scope > .nlux-conversation-container"
  ).on("click", compEvent("conversation-container-clicked")).get();
  appendToRoot(chatRoomContainer);
  compEvent("chat-room-ready")();
  return {
    elements: {
      composerContainer,
      conversationContainer,
      launchPadContainer
    },
    actions: {
      updateChatRoomStatus: (newStatus) => {
        setChatRoomStatusClass(newStatus);
      }
    },
    onDestroy: () => {
      removeConversationContainerListeners();
    }
  };
};

const updateChatRoom = ({
  propName,
  newValue,
  dom: { elements }
}) => {
};

var __defProp$1 = Object.defineProperty;
var __getOwnPropDesc$1 = Object.getOwnPropertyDescriptor;
var __decorateClass$1 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$1(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp$1(target, key, result);
  return result;
};
let CompChatRoom = class extends BaseComp {
  // How many segments are in the conversation (used to determine the chat room status)
  constructor(context, {
    conversationLayout,
    autoScroll,
    streamingAnimationSpeed,
    visible = true,
    composer,
    assistantPersona,
    userPersona,
    showGreeting,
    conversationStarters,
    initialConversationContent,
    syntaxHighlighter,
    htmlSanitizer,
    markdownLinkTarget,
    showCodeBlockCopyButton,
    skipStreamingAnimation
  }) {
    super(context, {
      conversationLayout,
      visible,
      autoScroll,
      streamingAnimationSpeed,
      assistantPersona,
      userPersona,
      conversationStarters,
      showGreeting,
      initialConversationContent,
      composer,
      syntaxHighlighter,
      htmlSanitizer,
      markdownLinkTarget,
      showCodeBlockCopyButton,
      skipStreamingAnimation
    });
    this.handleConversationStarterClick = (conversationStarter) => {
      this.composer.setDomProps({ status: "submitting-conversation-starter" });
      this.composer.handleTextChange(conversationStarter.prompt);
      this.composer.handleSendButtonClick();
    };
    this.handleSegmentCountChange = (newSegmentCount) => {
      if (this.segmentCount === newSegmentCount) {
        return;
      }
      this.segmentCount = newSegmentCount;
      const newChatRoomStatus = getChatRoomStatus(
        this.getProp("initialConversationContent") || void 0,
        this.segmentCount
      );
      if (this.chatRoomStatus !== newChatRoomStatus) {
        this.chatRoomStatus = newChatRoomStatus;
        this.executeDomAction("updateChatRoomStatus", this.chatRoomStatus);
        if (this.chatRoomStatus === "active") {
          if (this.launchPad?.id) {
            this.removeSubComponent(this.launchPad?.id);
            this.launchPad = void 0;
          }
        } else {
          this.addLaunchPad(
            this.getProp("showGreeting") ?? true,
            this.getProp("assistantPersona"),
            this.getProp("conversationStarters"),
            this.handleConversationStarterClick
          );
        }
      }
    };
    this.prompt = "";
    this.segmentCount = initialConversationContent && initialConversationContent.length > 0 ? 1 : 0;
    this.chatRoomStatus = getChatRoomStatus(initialConversationContent, this.segmentCount);
    if (this.chatRoomStatus === "starting") {
      this.addLaunchPad(
        showGreeting,
        assistantPersona,
        conversationStarters,
        this.handleConversationStarterClick
      );
    }
    this.addConversation(assistantPersona, userPersona, initialConversationContent);
    this.addComposer(
      composer?.placeholder,
      composer?.autoFocus,
      composer?.disableSubmitButton,
      composer?.submitShortcut
    );
    if (!this.conversation || !this.composer) {
      throw new Error("Chat room not initialized \u2014 An error occurred while initializing key components.");
    }
  }
  getConversationContentForAdapter(historyPayloadSize = "max") {
    return this.conversation.getConversationContentForAdapter(historyPayloadSize);
  }
  hide() {
    this.setProp("visible", false);
  }
  messagesContainerClicked() {
    this.composer?.focusTextInput();
  }
  onChatRoomReady() {
    domOp(() => {
      const conversationContainer = this.renderedDom?.elements?.conversationContainer;
      if (conversationContainer instanceof HTMLElement) {
        this.autoScrollController = createAutoScrollController(
          conversationContainer,
          this.getProp("autoScroll") ?? true
        );
        let numberOfScrollToBottomAttempts = 0;
        const maxNumberOfScrollToBottomAttempts = 20;
        const attemptsInterval = 10;
        const attemptScrollToBottom = () => {
          if (conversationContainer.scrollHeight > conversationContainer.clientHeight) {
            conversationContainer.scrollTo({ behavior: "smooth", top: 5e4 });
            clearInterval(intervalId);
          }
        };
        const intervalId = setInterval(() => {
          if (numberOfScrollToBottomAttempts >= maxNumberOfScrollToBottomAttempts) {
            clearInterval(intervalId);
            return;
          }
          attemptScrollToBottom();
          numberOfScrollToBottomAttempts++;
        }, attemptsInterval);
      }
      this.context.emit("ready", {
        aiChatProps: propsToCorePropsInEvents(this.context.aiChatProps)
      });
    });
  }
  setProps(props) {
    if (props.hasOwnProperty("autoScroll")) {
      const autoScroll = props.autoScroll;
      this.autoScrollController?.updateProps({ autoScroll });
    }
    if (props.hasOwnProperty("conversationLayout")) {
      this.conversation?.setConversationLayout(props.conversationLayout);
    }
    if (props.hasOwnProperty("syntaxHighlighter")) {
      this.setProp("syntaxHighlighter", props.syntaxHighlighter);
    }
    if (props.hasOwnProperty("htmlSanitizer")) {
      this.setProp("htmlSanitizer", props.htmlSanitizer);
    }
    if (props.hasOwnProperty("markdownLinkTarget")) {
      this.setProp("markdownLinkTarget", props.markdownLinkTarget);
    }
    if (props.hasOwnProperty("skipStreamingAnimation")) {
      this.setProp("skipStreamingAnimation", props.skipStreamingAnimation);
    }
    if (props.hasOwnProperty("streamingAnimationSpeed")) {
      this.setProp("streamingAnimationSpeed", props.streamingAnimationSpeed);
    }
    if (props.hasOwnProperty("assistantPersona")) {
      this.conversation?.setAssistantPersona(props.assistantPersona ?? void 0);
      this.launchPad?.setAssistantPersona(props.assistantPersona ?? void 0);
    }
    if (props.hasOwnProperty("userPersona")) {
      this.conversation?.setUserPersona(props.userPersona ?? void 0);
    }
    if (props.hasOwnProperty("showGreeting")) {
      this.launchPad?.setShowGreeting(props.showGreeting ?? true);
    }
    if (props.hasOwnProperty("conversationStarters")) {
      this.launchPad?.setConversationStarters(props.conversationStarters);
    }
    if (props.hasOwnProperty("composer")) {
      if (this.composer) {
        const currentDomProps = this.composer.getProp("domCompProps");
        const newProps = { ...currentDomProps, ...props.composer };
        this.composer.setDomProps(newProps);
      }
    }
  }
  show() {
    this.setProp("visible", true);
  }
  setProp(key, value) {
    super.setProp(key, value);
    if (key === "markdownLinkTarget" || key === "syntaxHighlighter" || key === "htmlSanitizer" || key === "skipStreamingAnimation" || key === "streamingAnimationSpeed") {
      const updateKey = key;
      const updateValue = value;
      this.conversation.updateMarkdownStreamRenderer(updateKey, updateValue);
    }
  }
  addComposer(placeholder, autoFocus, disableSubmitButton, submitShortcut) {
    this.composer = comp(CompComposer).withContext(this.context).withProps({
      props: {
        domCompProps: {
          status: "typing",
          placeholder,
          autoFocus,
          disableSubmitButton,
          submitShortcut
        }
      },
      eventListeners: {
        onTextUpdated: (newValue) => this.handleComposerTextChange(newValue),
        onSubmit: () => this.handleComposerSubmit()
      }
    }).create();
    this.addSubComponent(this.composer.id, this.composer, "composerContainer");
  }
  addConversation(assistantPersona, userPersona, initialConversationContent) {
    this.conversation = comp(CompConversation).withContext(this.context).withProps({
      assistantPersona,
      userPersona,
      messages: initialConversationContent,
      conversationLayout: this.getProp("conversationLayout"),
      markdownLinkTarget: this.getProp("markdownLinkTarget"),
      showCodeBlockCopyButton: this.getProp("showCodeBlockCopyButton"),
      skipStreamingAnimation: this.getProp("skipStreamingAnimation"),
      streamingAnimationSpeed: this.getProp("streamingAnimationSpeed"),
      syntaxHighlighter: this.getProp("syntaxHighlighter"),
      htmlSanitizer: this.getProp("htmlSanitizer"),
      onSegmentCountChange: this.handleSegmentCountChange
    }).create();
    this.addSubComponent(this.conversation.id, this.conversation, "conversationContainer");
  }
  addLaunchPad(showGreeting, assistantPersona, conversationStarters, onConversationStarterSelected) {
    this.launchPad = comp(CompLaunchPad).withContext(this.context).withProps({
      showGreeting,
      assistantPersona,
      conversationStarters,
      onConversationStarterSelected
    }).create();
    this.addSubComponent(this.launchPad.id, this.launchPad, "launchPadContainer");
  }
  handleComposerSubmit() {
    const composerProps = this.props.composer;
    submitPromptFactory({
      context: this.context,
      composerInstance: this.composer,
      conversation: this.conversation,
      messageToSend: this.prompt,
      autoScrollController: this.autoScrollController,
      resetComposer: (resetTextInput) => {
        if (!this.destroyed) {
          this.resetComposer(resetTextInput, composerProps?.autoFocus);
        }
      },
      setComposerAsWaiting: () => {
        if (!this.destroyed) {
          this.composer.setDomProps({ status: "waiting" });
        }
      }
    })();
  }
  handleComposerTextChange(newValue) {
    this.prompt = newValue;
  }
  resetComposer(resetTextInput = false, focusOnReset = false) {
    if (!this.composer) {
      return;
    }
    const currentCompProps = this.composer.getProp("domCompProps");
    const newProps = { ...currentCompProps, status: "typing" };
    if (resetTextInput) {
      newProps.message = "";
    }
    this.composer.setDomProps(newProps);
    if (focusOnReset) {
      this.composer.focusTextInput();
    }
  }
};
__decorateClass$1([
  CompEventListener("conversation-container-clicked")
], CompChatRoom.prototype, "messagesContainerClicked", 1);
__decorateClass$1([
  CompEventListener("chat-room-ready")
], CompChatRoom.prototype, "onChatRoomReady", 1);
CompChatRoom = __decorateClass$1([
  Model("chatRoom", renderChatRoom, updateChatRoom)
], CompChatRoom);

const className = "nlux-comp-exceptionBox";
const createExceptionsBoxDom = () => {
  const exceptionsBox = document.createElement("div");
  exceptionsBox.classList.add(className);
  return exceptionsBox;
};
const createExceptionItemDom = ({ message }) => {
  const exception = document.createElement("div");
  exception.classList.add("nlux-comp-exceptionItem");
  const messageElement = document.createElement("span");
  messageElement.classList.add("nlux-comp-exp_itm_msg");
  messageElement.append(document.createTextNode(message));
  exception.append(messageElement);
  return exception;
};

const exceptionDisplayTime = 3e3;
const exceptionHideAnimationTime = 500;
const createExceptionsBoxController = (root) => {
  const exceptionsQueue = /* @__PURE__ */ new Set();
  let exceptionShown = false;
  let exceptionItem = null;
  let timeout = null;
  const processExceptionsQueue = () => {
    if (exceptionShown) {
      return;
    }
    if (exceptionsQueue.size === 0) {
      return;
    }
    exceptionShown = true;
    const victim = exceptionsQueue.values().next().value;
    exceptionsQueue.delete(victim);
    exceptionItem = createExceptionItemDom(victim);
    root.append(exceptionItem);
    timeout = setTimeout(hideException, exceptionDisplayTime);
  };
  const hideException = () => {
    exceptionItem?.classList.add("nlux-comp-exceptionItem--hiding");
    timeout = setTimeout(() => {
      exceptionShown = false;
      exceptionItem?.remove();
      exceptionItem = null;
      processExceptionsQueue();
    }, exceptionHideAnimationTime);
  };
  return {
    displayException: (message) => {
      exceptionsQueue.add({ message });
      if (!exceptionShown) {
        processExceptionsQueue();
      }
    },
    destroy: () => {
      exceptionsQueue.clear();
      exceptionItem?.remove();
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  };
};

const renderExceptionsBox = ({
  props,
  appendToRoot
}) => {
  const exceptionsBoxRoot = createExceptionsBoxDom();
  appendToRoot(exceptionsBoxRoot);
  let controller = createExceptionsBoxController(exceptionsBoxRoot);
  return {
    elements: {
      root: exceptionsBoxRoot
    },
    actions: {
      displayException: (message) => {
        controller?.displayException(message);
      }
    },
    onDestroy: () => {
      controller?.destroy();
      exceptionsBoxRoot.remove();
      controller = void 0;
    }
  };
};

const updateExceptionsBox = () => {
};

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp(target, key, result);
  return result;
};
let CompExceptionsBox = class extends BaseComp {
  constructor(context, props) {
    super(context, props);
  }
  destroy() {
    super.destroy();
  }
  showAlert(type, message) {
    this.executeDomAction("displayException", message);
  }
};
CompExceptionsBox = __decorateClass([
  Model("exceptionsBox", renderExceptionsBox, updateExceptionsBox)
], CompExceptionsBox);

const sectionsById = () => ({
  // The main chat room component
  "chatRoom": CompChatRoom,
  // Kep top level components
  "launchPad": CompLaunchPad,
  "conversation": CompConversation,
  "composer": CompComposer,
  // Additional sub-components
  "conversationStarters": CompConversationStarters,
  "chatSegment": CompChatSegment,
  "chatItem": CompChatItem,
  // Miscellaneous
  "exceptionsBox": CompExceptionsBox
});
const registerAllSections = () => {
  const globalNlux = getGlobalMetaData();
  const sectionsRegistered = btoa("sectionsRegistered");
  if (globalNlux && globalNlux[sectionsRegistered] === true) {
    return;
  }
  Object.entries(sectionsById()).forEach(([, comp]) => {
    CompRegistry.register(comp);
  });
  if (typeof globalNlux === "object") {
    globalNlux[sectionsRegistered] = true;
  }
};

class EventManager {
  constructor() {
    this.emit = (event, ...params) => {
      if (!this.eventListeners.has(event)) {
        return;
      }
      this.eventListeners.get(event)?.forEach((callback) => {
        if (typeof callback !== "function") {
          return;
        }
        callback(...params);
      });
    };
    this.on = (event, callback) => {
      if (!this.eventListeners.has(event)) {
        this.eventListeners.set(event, /* @__PURE__ */ new Set());
      }
      this.eventListeners.get(event)?.add(callback);
    };
    this.removeAllEventListeners = (eventName) => this.eventListeners.delete(eventName);
    this.removeAllEventListenersForAllEvent = () => this.eventListeners.clear();
    this.removeEventListener = (event, callback) => {
      if (!this.eventListeners.has(event)) {
        return;
      }
      this.eventListeners.get(event)?.delete(callback);
      if (!this.eventListeners.get(event)?.size) {
        this.eventListeners.delete(event);
      }
    };
    this.updateEventListeners = (events) => {
      const eventKeys = Object.keys(events);
      for (const eventName of eventKeys) {
        this.eventListeners.set(
          eventName,
          /* @__PURE__ */ new Set([events[eventName]])
        );
      }
    };
    this.eventListeners = /* @__PURE__ */ new Map();
  }
}

const rootClassName = "nlux-AiChat-root";
const defaultThemeId = "nova";
const getSystemColorScheme = () => {
  if (typeof globalThis !== void 0 && globalThis.matchMedia && globalThis.matchMedia(
    "(prefers-color-scheme: dark)"
  )?.matches) {
    return "dark";
  }
  return "light";
};
const getRootClassNames = (props) => {
  const result = [rootClassName];
  const themeId = props.themeId || defaultThemeId;
  const themeClassName = `nlux-theme-${themeId}`;
  result.push(themeClassName);
  if (props.className) {
    result.push(props.className);
  }
  return result;
};

class NluxRenderer {
  constructor(context, rootCompId, rootElement, props = null) {
    this.chatRoom = null;
    this.exceptionsBox = null;
    this.isDestroyed = false;
    this.isMounted = false;
    this.rootCompId = null;
    this.rootElement = null;
    this.theClassName = null;
    this.theComposerOptions = {};
    this.theConversationOptions = {};
    this.theDisplayOptions = {};
    this.theInitialConversationContent = null;
    this.theMessageOptions = {};
    this.thePersonasOptions = {};
    if (!rootCompId) {
      throw new NluxRenderingError({
        source: this.constructor.name,
        message: "Root component ID is not a valid component name"
      });
    }
    this.__context = context;
    this.rootElement = rootElement;
    this.rootElementInitialClassName = rootElement.className;
    this.rootCompId = rootCompId;
    this.chatRoom = null;
    this.theClassName = props?.className ?? null;
    this.theDisplayOptions = props?.displayOptions ?? {};
    this.theConversationOptions = props?.conversationOptions ?? {};
    this.theMessageOptions = props?.messageOptions ?? {};
    this.theInitialConversationContent = props?.initialConversation ?? null;
    this.theComposerOptions = props?.composerOptions ?? {};
    this.thePersonasOptions = props?.personaOptions ?? {};
  }
  get className() {
    return this.theClassName ?? void 0;
  }
  get colorScheme() {
    return this.theDisplayOptions.colorScheme;
  }
  get context() {
    return this.__context;
  }
  get mounted() {
    return this.isMounted;
  }
  get themeId() {
    return this.theDisplayOptions.themeId;
  }
  destroy() {
    if (this.mounted) {
      this.unmount();
    }
    if (this.chatRoom) {
      this.chatRoom.destroy();
    }
    this.rootElement = null;
    this.rootElementInitialClassName = null;
    this.rootCompId = null;
    this.chatRoom = null;
    this.isMounted = false;
    this.isDestroyed = true;
    this.theDisplayOptions = {};
    this.theConversationOptions = {};
    this.theComposerOptions = {};
  }
  hide() {
    if (!this.mounted) {
      throw new NluxRenderingError({
        source: this.constructor.name,
        message: "Renderer is not mounted and cannot be hidden"
      });
    }
    this.chatRoom?.hide();
  }
  mount() {
    if (this.isDestroyed) {
      throw new NluxRenderingError({
        source: this.constructor.name,
        message: "Renderer is destroyed and cannot be mounted"
      });
    }
    if (!this.rootCompId || !this.rootElement) {
      throw new NluxRenderingError({
        source: this.constructor.name,
        message: "Root component or root class is not set"
      });
    }
    let rootComp = null;
    let exceptionAlert = null;
    try {
      if (this.rootCompId !== "chatRoom") {
        throw new NluxRenderingError({
          source: this.constructor.name,
          message: "Root component is not a chat room"
        });
      }
      rootComp = comp(CompChatRoom).withContext(this.context).withProps({
        visible: true,
        conversationLayout: getConversationLayout(this.theConversationOptions.layout),
        assistantPersona: this.thePersonasOptions?.assistant ?? void 0,
        userPersona: this.thePersonasOptions?.user ?? void 0,
        conversationStarters: this.theConversationOptions?.conversationStarters ?? void 0,
        showGreeting: this.theConversationOptions?.showWelcomeMessage,
        initialConversationContent: this.theInitialConversationContent ?? void 0,
        autoScroll: this.theConversationOptions?.autoScroll,
        syntaxHighlighter: this.context.syntaxHighlighter,
        htmlSanitizer: this.context.htmlSanitizer,
        markdownLinkTarget: this.theMessageOptions?.markdownLinkTarget,
        showCodeBlockCopyButton: this.theMessageOptions?.showCodeBlockCopyButton,
        streamingAnimationSpeed: this.theMessageOptions?.streamingAnimationSpeed,
        skipStreamingAnimation: this.theMessageOptions?.skipStreamingAnimation,
        composer: {
          placeholder: this.theComposerOptions?.placeholder,
          autoFocus: this.theComposerOptions?.autoFocus,
          disableSubmitButton: this.theComposerOptions?.disableSubmitButton,
          submitShortcut: this.theComposerOptions?.submitShortcut
        }
      }).create();
      const CompExceptionsBoxConstructor = CompRegistry.retrieve(
        "exceptionsBox"
      )?.model;
      if (CompExceptionsBoxConstructor) {
        exceptionAlert = comp(CompExceptionsBox).withContext(this.context).create();
      } else {
        warn("Exception alert component is not registered! No exceptions will be shown.");
      }
      if (!rootComp) {
        throw new NluxRenderingError({
          source: this.constructor.name,
          message: "Root component failed to instantiate"
        });
      }
      this.setRootElementClassNames();
      this.setRoomElementDimensions(this.theDisplayOptions);
      if (exceptionAlert) {
        exceptionAlert.render(this.rootElement);
      }
      rootComp.render(this.rootElement);
      if (rootComp && !rootComp.rendered) {
        this.rootElement.className = this.rootElementInitialClassName || "";
        throw new NluxRenderingError({
          source: this.constructor.name,
          message: "Root component did not render"
        });
      } else {
        this.chatRoom = rootComp;
        this.exceptionsBox = exceptionAlert ?? null;
        this.isMounted = true;
      }
    } catch (_error) {
      this.rootElement.className = this.rootElementInitialClassName || "";
      this.renderEx("failed-to-render-content", _error?.toString() ?? "Unknown error");
    }
  }
  renderEx(type, message) {
    if (!this.mounted) {
      warn("Renderer is not mounted and cannot render exceptions");
      throw new NluxRenderingError({
        source: this.constructor.name,
        message
      });
    }
    this.exceptionsBox?.showAlert(type, message);
  }
  show() {
    if (!this.mounted) {
      throw new NluxRenderingError({
        source: this.constructor.name,
        message: "Renderer is not mounted and cannot be shown"
      });
    }
    this.chatRoom?.show();
  }
  unmount() {
    if (this.isDestroyed) {
      warn("Renderer is destroyed and cannot be unmounted");
      return;
    }
    if (!this.chatRoom || !this.rootElement) {
      throw new NluxRenderingError({
        source: this.constructor.name,
        message: "Root component or root element is not set"
      });
    }
    this.context.emit("preDestroy", {
      aiChatProps: propsToCorePropsInEvents(this.context.aiChatProps),
      conversationHistory: this.chatRoom.getConversationContentForAdapter(
        this.context.aiChatProps.conversationOptions?.historyPayloadSize
      ) ?? []
    });
    if (this.exceptionsBox) {
      this.exceptionsBox.destroy();
    }
    this.chatRoom.destroy();
    if (this.rootElement) {
      emptyInnerHtml(this.rootElement);
      this.rootElement.className = this.rootElementInitialClassName || "";
    }
    this.chatRoom = null;
    this.exceptionsBox = null;
    this.isMounted = false;
  }
  updateProps(props) {
    if (props.hasOwnProperty("adapter") && props.adapter) {
      this.context.update({
        adapter: props.adapter
      });
    }
    let classNameUpdated = false;
    if (props.hasOwnProperty("className") && props.className !== this.className) {
      this.theClassName = props.className ?? null;
      classNameUpdated = true;
    }
    let themeIdUpdated = false;
    let colorSchemeUpdated = false;
    if (props.hasOwnProperty("displayOptions")) {
      const newDisplayOptions = {};
      if (props.displayOptions?.themeId !== this.theDisplayOptions.themeId) {
        newDisplayOptions.themeId = props.displayOptions?.themeId;
        themeIdUpdated = true;
      }
      if (props.displayOptions?.colorScheme !== this.theDisplayOptions.colorScheme) {
        newDisplayOptions.colorScheme = props.displayOptions?.colorScheme;
        colorSchemeUpdated = true;
      }
      if (props.displayOptions?.height !== this.theDisplayOptions.height) {
        newDisplayOptions.height = props.displayOptions?.height;
      }
      if (props.displayOptions?.width !== this.theDisplayOptions.width) {
        newDisplayOptions.width = props.displayOptions?.width;
      }
      if (Object.keys(newDisplayOptions).length > 0) {
        const displayOptions = {
          ...this.theDisplayOptions,
          ...newDisplayOptions
        };
        this.theDisplayOptions = displayOptions;
        this.setRoomElementDimensions(displayOptions);
      }
    }
    if (themeIdUpdated || colorSchemeUpdated || classNameUpdated) {
      this.setRootElementClassNames();
    }
    if (props.hasOwnProperty("conversationOptions")) {
      const newConversationOptions = {};
      const newProps = {};
      if (props.conversationOptions?.layout !== this.theConversationOptions.layout) {
        newConversationOptions.layout = props.conversationOptions?.layout;
        newProps.conversationLayout = getConversationLayout(props.conversationOptions?.layout);
      }
      if (props.conversationOptions?.autoScroll !== this.theConversationOptions.autoScroll) {
        newConversationOptions.autoScroll = props.conversationOptions?.autoScroll;
        newProps.autoScroll = props.conversationOptions?.autoScroll;
      }
      if (props.conversationOptions?.showWelcomeMessage !== this.theConversationOptions.showWelcomeMessage) {
        newConversationOptions.showWelcomeMessage = props.conversationOptions?.showWelcomeMessage;
        newProps.showGreeting = props.conversationOptions?.showWelcomeMessage;
      }
      if (props.conversationOptions?.conversationStarters !== this.theConversationOptions.conversationStarters) {
        newConversationOptions.conversationStarters = props.conversationOptions?.conversationStarters;
        newProps.conversationStarters = props.conversationOptions?.conversationStarters;
      }
      if (Object.keys(newConversationOptions).length > 0) {
        this.theConversationOptions = {
          ...this.theConversationOptions,
          ...newConversationOptions
        };
        this.chatRoom?.setProps(newProps);
      }
    }
    if (props.hasOwnProperty("messageOptions")) {
      this.theMessageOptions = props.messageOptions ?? {};
      this.chatRoom?.setProps({
        streamingAnimationSpeed: props.messageOptions?.streamingAnimationSpeed ?? void 0,
        markdownLinkTarget: props.messageOptions?.markdownLinkTarget ?? void 0,
        syntaxHighlighter: props.messageOptions?.syntaxHighlighter,
        htmlSanitizer: props.messageOptions?.htmlSanitizer
      });
      this.context.update({
        syntaxHighlighter: props.messageOptions?.syntaxHighlighter,
        htmlSanitizer: props.messageOptions?.htmlSanitizer
      });
    }
    if (props.hasOwnProperty("composerOptions")) {
      const changedComposerOptions = {};
      if (props.composerOptions?.hasOwnProperty("placeholder") && props.composerOptions.placeholder !== this.theComposerOptions.placeholder) {
        changedComposerOptions.placeholder = props.composerOptions.placeholder;
      }
      if (props.composerOptions?.hasOwnProperty("autoFocus") && props.composerOptions.autoFocus !== this.theComposerOptions.autoFocus) {
        changedComposerOptions.autoFocus = props.composerOptions.autoFocus;
      }
      if (props.composerOptions?.hasOwnProperty("disableSubmitButton") && props.composerOptions.disableSubmitButton !== this.theComposerOptions.disableSubmitButton) {
        changedComposerOptions.disableSubmitButton = props.composerOptions.disableSubmitButton;
      }
      if (props.composerOptions?.hasOwnProperty("submitShortcut") && props.composerOptions.submitShortcut !== this.theComposerOptions.submitShortcut) {
        changedComposerOptions.submitShortcut = props.composerOptions.submitShortcut;
      }
      if (Object.keys(changedComposerOptions).length > 0) {
        this.theComposerOptions = {
          ...this.theComposerOptions,
          ...changedComposerOptions
        };
        this.chatRoom?.setProps({
          composer: this.theComposerOptions
        });
      }
    }
    if (props.hasOwnProperty("personaOptions")) {
      const changedPersonaProps = {};
      if (props.personaOptions?.assistant !== this.thePersonasOptions?.assistant) {
        changedPersonaProps.assistantPersona = props.personaOptions?.assistant ?? void 0;
      }
      if (props.personaOptions?.user !== this.thePersonasOptions?.user) {
        changedPersonaProps.userPersona = props.personaOptions?.user ?? void 0;
      }
      this.thePersonasOptions = {
        ...this.thePersonasOptions,
        ...props.personaOptions
      };
      this.chatRoom?.setProps(changedPersonaProps);
    }
  }
  setRoomElementDimensions(newDimensions) {
    if (!this.rootElement) {
      return;
    }
    if (newDimensions.hasOwnProperty("width")) {
      this.rootElement.style.width = typeof newDimensions.width === "number" ? `${newDimensions.width}px` : typeof newDimensions.width === "string" ? newDimensions.width : "";
    }
    if (newDimensions.hasOwnProperty("height")) {
      this.rootElement.style.height = typeof newDimensions.height === "number" ? `${newDimensions.height}px` : typeof newDimensions.height === "string" ? newDimensions.height : "";
    }
  }
  setRootElementClassNames() {
    if (!this.rootElement) {
      return;
    }
    const rootClassNames = getRootClassNames({
      themeId: this.themeId,
      className: this.className
    });
    this.rootElement.className = "";
    this.rootElement.classList.add(...rootClassNames);
    this.rootElement.dataset.colorScheme = this.colorScheme === "auto" || !this.colorScheme ? getSystemColorScheme() : this.colorScheme;
  }
}

const createControllerContext = (props, getAiChatProps, emitEvent) => {
  const context = {
    ...props,
    update: (newProps) => {
      Object.assign(context, newProps);
    },
    emit: (eventName, ...params) => {
      emitEvent(eventName, ...params);
    },
    get aiChatProps() {
      return getAiChatProps();
    }
  };
  return context;
};

class NluxController {
  constructor(rootElement, props) {
    this.eventManager = new EventManager();
    this.nluxInstanceId = uid();
    this.renderException = (errorId) => {
      if (!this.mounted || !this.renderer) {
        return null;
      }
      const errorMessage = NLErrors[errorId];
      if (!errorMessage) {
        warn(`Exception with id '${errorId}' is not defined`);
        return null;
      }
      this.renderer.renderEx(errorId, errorMessage);
    };
    this.renderer = null;
    this.rootCompId = "chatRoom";
    this.rootElement = rootElement;
    this.internalProps = props;
  }
  get mounted() {
    return this.renderer?.mounted;
  }
  hide() {
    if (!this.mounted) {
      return;
    }
    this.renderer?.hide();
  }
  mount() {
    if (this.mounted) {
      return;
    }
    const newContext = createControllerContext(
      {
        instanceId: this.nluxInstanceId,
        exception: this.renderException,
        adapter: this.internalProps.adapter,
        syntaxHighlighter: this.internalProps.messageOptions.syntaxHighlighter,
        htmlSanitizer: this.internalProps.messageOptions.htmlSanitizer
      },
      () => this.getUpdatedAiChatPropsFromInternalProps(this.internalProps),
      this.eventManager.emit
    );
    this.renderer = new NluxRenderer(
      newContext,
      this.rootCompId,
      this.rootElement,
      this.internalProps
    );
    this.renderer.mount();
  }
  on(event, callback) {
    this.eventManager.on(event, callback);
  }
  removeAllEventListeners(eventName) {
    this.eventManager.removeAllEventListeners(eventName);
  }
  removeAllEventListenersForAllEvent() {
    this.eventManager.removeAllEventListenersForAllEvent();
  }
  removeEventListener(event, callback) {
    this.eventManager.removeEventListener(event, callback);
  }
  show() {
    if (!this.mounted) {
      return;
    }
    this.renderer?.show();
  }
  unmount() {
    if (!this.mounted) {
      return;
    }
    this.renderer?.unmount();
    this.renderer = null;
  }
  updateProps(props) {
    this.renderer?.updateProps(props);
    this.internalProps = {
      ...this.internalProps,
      ...props
    };
    if (props.events) {
      this.internalProps.events = props.events;
      this.eventManager.updateEventListeners(props.events);
    }
  }
  getUpdatedAiChatPropsFromInternalProps(internalProps) {
    const updatedProps = { ...internalProps };
    for (const key of Object.keys(updatedProps)) {
      if (updatedProps[key] === void 0 || updatedProps[key] === null || typeof updatedProps[key] === "object" && Object.keys(updatedProps[key]).length === 0) {
        delete updatedProps[key];
      }
    }
    return updatedProps;
  }
}

class AiChat {
  constructor() {
    this.theAdapter = null;
    this.theAdapterBuilder = null;
    this.theAdapterType = null;
    this.theClassName = null;
    this.theComposerOptions = null;
    this.theConversationOptions = null;
    this.theDisplayOptions = null;
    this.theInitialConversation = null;
    this.theMessageOptions = null;
    this.thePersonasOptions = null;
    // Variable to track if the chat component was unmounted (and thus cannot be used anymore).
    this.aiChatStatus = "idle";
    // Controller instance
    this.controller = null;
    // Event listeners provided before the controller is mounted, when the aiChat instance is being built.
    this.unregisteredEventListeners = /* @__PURE__ */ new Map();
  }
  get status() {
    return this.aiChatStatus;
  }
  get isIdle() {
    return this.status === "idle";
  }
  hide() {
    if (!this.controller) {
      throw new NluxRenderingError({
        source: this.constructor.name,
        message: "Unable to hide. nlux is not mounted."
      });
    }
    this.controller.hide();
  }
  mount(rootElement) {
    if (!this.isIdle) {
      throw new NluxUsageError({
        source: this.constructor.name,
        message: "Unable to create nlux instance. nlux is already or was previously mounted. You can only mount a nlux instance once, when the status is `idle`."
      });
    }
    const adapterToUser = this.theAdapter && this.theAdapterType === "instance" ? this.theAdapter : this.theAdapterType === "builder" && this.theAdapterBuilder ? this.theAdapterBuilder.create() : null;
    if (!adapterToUser) {
      throw new NluxValidationError({
        source: this.constructor.name,
        message: "Unable to create nlux instance. ChatAdapter is not properly set. You should call `withAdapter(adapter)` method before mounting nlux."
      });
    }
    registerAllSections();
    const aiChatRoot = document.createElement("div");
    rootElement.appendChild(aiChatRoot);
    const controller = new NluxController(
      aiChatRoot,
      {
        adapter: adapterToUser,
        className: this.theClassName ?? void 0,
        initialConversation: this.theInitialConversation ?? void 0,
        messageOptions: this.theMessageOptions ?? {},
        displayOptions: this.theDisplayOptions ?? {},
        conversationOptions: this.theConversationOptions ?? {},
        composerOptions: this.theComposerOptions ?? {},
        personaOptions: this.thePersonasOptions ?? {}
      }
    );
    for (const [eventName, eventListeners] of this.unregisteredEventListeners.entries()) {
      for (const eventCallback of eventListeners) {
        controller.on(eventName, eventCallback);
      }
    }
    controller.mount();
    if (controller.mounted) {
      this.aiChatStatus = "mounted";
      this.controller = controller;
      this.unregisteredEventListeners.clear();
    } else {
      throw new NluxRenderingError({
        source: this.constructor.name,
        message: "AiChat root component did not render."
      });
    }
  }
  on(event, callback) {
    if (this.status === "unmounted") {
      throw new NluxUsageError({
        source: this.constructor.name,
        message: "Unable to add event listener. nlux was previously unmounted."
      });
    }
    if (this.controller) {
      this.controller.on(event, callback);
      return this;
    }
    if (!this.unregisteredEventListeners.has(event)) {
      this.unregisteredEventListeners.set(event, /* @__PURE__ */ new Set());
    }
    this.unregisteredEventListeners.get(event)?.add(callback);
    return this;
  }
  removeAllEventListeners(event) {
    this.controller?.removeAllEventListeners(event);
    this.unregisteredEventListeners.get(event)?.clear();
  }
  removeEventListener(event, callback) {
    this.controller?.removeEventListener(event, callback);
    this.unregisteredEventListeners.get(event)?.delete(callback);
  }
  show() {
    if (!this.controller) {
      throw new NluxRenderingError({
        source: this.constructor.name,
        message: "Unable to show. nlux is not mounted."
      });
    }
    this.controller.show();
  }
  unmount() {
    debug("Unmounting nlux.");
    if (!this.controller) {
      debug("Invalid call to aiChat.unmount() on an already unmounted nlux instance!");
      return;
    }
    this.controller.unmount();
    if (this.controller.mounted) {
      throw new NluxRenderingError({
        source: this.constructor.name,
        message: "Unable to unmount. Root component did not unmount."
      });
    }
    this.controller = null;
    this.unregisteredEventListeners.clear();
    this.aiChatStatus = "unmounted";
  }
  updateProps(props) {
    if (!this.controller) {
      throw new NluxRenderingError({
        source: this.constructor.name,
        message: "Unable to update props. nlux is not mounted."
      });
    }
    if (props.hasOwnProperty("adapter")) {
      this.theAdapter = props.adapter ?? null;
    }
    if (props.hasOwnProperty("events")) {
      this.clearEventListeners();
      for (const [eventName, eventCallback] of Object.entries(props.events ?? {})) {
        this.on(eventName, eventCallback);
      }
    }
    if (props.hasOwnProperty("className")) {
      this.theClassName = props.className ?? null;
    }
    if (props.hasOwnProperty("displayOptions")) {
      this.theDisplayOptions = props.displayOptions ?? null;
    }
    if (props.hasOwnProperty("composerOptions")) {
      this.theComposerOptions = props.composerOptions ?? null;
    }
    if (props.hasOwnProperty("personaOptions")) {
      this.thePersonasOptions = props.personaOptions ?? null;
    }
    if (props.hasOwnProperty("conversationOptions")) {
      this.theConversationOptions = props.conversationOptions ?? null;
    }
    if (props.hasOwnProperty("messageOptions")) {
      this.theMessageOptions = props.messageOptions ?? null;
    }
    this.controller.updateProps(props);
  }
  withAdapter(adapter) {
    if (!this.isIdle) {
      throw new NluxUsageError({
        source: this.constructor.name,
        message: "Unable to set adapter. nlux is already or was previously mounted. You can only set the adapter once, when the status is `idle`."
      });
    }
    if (this.theAdapterBuilder || this.theAdapter) {
      throw new NluxUsageError({
        source: this.constructor.name,
        message: "Unable to change config. A adapter or adapter builder was already set."
      });
    }
    if (typeof adapter !== "object" || adapter === null) {
      throw new NluxUsageError({
        source: this.constructor.name,
        message: "Unable to set adapter. Invalid adapter or adapter-builder type."
      });
    }
    const anAdapterOrAdapterBuilder = adapter;
    if (typeof anAdapterOrAdapterBuilder.create === "function") {
      this.theAdapterType = "builder";
      this.theAdapterBuilder = anAdapterOrAdapterBuilder;
      return this;
    }
    if (typeof anAdapterOrAdapterBuilder.batchText === "function" || typeof anAdapterOrAdapterBuilder.streamText === "function") {
      this.theAdapterType = "instance";
      this.theAdapter = anAdapterOrAdapterBuilder;
      return this;
    }
    throw new NluxUsageError({
      source: this.constructor.name,
      message: "Unable to set adapter. Invalid adapter or adapter-builder implementation! When an `ChatAdapterBuilder` is provided, it must implement either `create()` method that returns an ChatAdapter instance. When an ChatAdapter instance is provided, must implement `batchText()` and/or `streamText()` methods. None of the above were found."
    });
  }
  withClassName(className) {
    if (!this.isIdle) {
      throw new NluxUsageError({
        source: this.constructor.name,
        message: "Unable to set class name. nlux is already or was previously mounted. You can only set the class name once, when the status is `idle`."
      });
    }
    if (this.theClassName) {
      throw new NluxUsageError({
        source: this.constructor.name,
        message: "Unable to change config. A class name was already set."
      });
    }
    this.theClassName = className;
    return this;
  }
  withComposerOptions(composerOptions) {
    if (!this.isIdle) {
      throw new NluxUsageError({
        source: this.constructor.name,
        message: "Unable to set composer options. nlux is already or was previously mounted. You can only set the composer options once, when the status is `idle`."
      });
    }
    if (this.theComposerOptions) {
      throw new NluxUsageError({
        source: this.constructor.name,
        message: "Unable to change config. Composer options were already set."
      });
    }
    this.theComposerOptions = { ...composerOptions };
    return this;
  }
  withConversationOptions(conversationOptions) {
    if (!this.isIdle) {
      throw new NluxUsageError({
        source: this.constructor.name,
        message: "Unable to set conversation options. nlux is already or was previously mounted. You can only set the conversation options once, when the status is `idle`."
      });
    }
    if (this.theConversationOptions) {
      throw new NluxUsageError({
        source: this.constructor.name,
        message: "Unable to change config. Conversation options were already set."
      });
    }
    this.theConversationOptions = { ...conversationOptions };
    return this;
  }
  withDisplayOptions(displayOptions) {
    if (!this.isIdle) {
      throw new NluxUsageError({
        source: this.constructor.name,
        message: "Unable to set display options. nlux is already or was previously mounted. You can only set the display options once, when the status is `idle`."
      });
    }
    if (this.theDisplayOptions) {
      throw new NluxUsageError({
        source: this.constructor.name,
        message: "Unable to change config. Display options were already set."
      });
    }
    this.theDisplayOptions = { ...displayOptions };
    return this;
  }
  withInitialConversation(initialConversation) {
    if (!this.isIdle) {
      throw new NluxUsageError({
        source: this.constructor.name,
        message: "Unable to set initial conversation. nlux is already or was previously mounted. You can only set the initial conversation once, when the status is `idle`."
      });
    }
    if (this.theInitialConversation) {
      throw new NluxUsageError({
        source: this.constructor.name,
        message: "Unable to change config. Conversation history was already set."
      });
    }
    this.theInitialConversation = [...initialConversation];
    return this;
  }
  withMessageOptions(messageOptions) {
    if (!this.isIdle) {
      throw new NluxUsageError({
        source: this.constructor.name,
        message: "Unable to set message options. nlux is already or was previously mounted. You can only set the message options once, when the status is `idle`."
      });
    }
    if (this.theMessageOptions) {
      throw new NluxUsageError({
        source: this.constructor.name,
        message: "Unable to change config. Message options were already set."
      });
    }
    this.theMessageOptions = { ...messageOptions };
    return this;
  }
  withPersonaOptions(personaOptions) {
    if (!this.isIdle) {
      throw new NluxUsageError({
        source: this.constructor.name,
        message: "Unable to set persona options. nlux is already or was previously mounted. You can only set the persona options once, when the status is `idle`."
      });
    }
    if (this.thePersonasOptions) {
      throw new NluxUsageError({
        source: this.constructor.name,
        message: "Unable to change config. Personas were already set."
      });
    }
    this.thePersonasOptions = { ...personaOptions };
    return this;
  }
  clearEventListeners() {
    this.controller?.removeAllEventListenersForAllEvent();
    this.unregisteredEventListeners.clear();
    return;
  }
}

class Observable {
  constructor({ replay } = {}) {
    this.buffer = [];
    this.errorReceived = null;
    this.isCompleted = false;
    this.isReplayObservable = false;
    this.subscribers = /* @__PURE__ */ new Set();
    this.isReplayObservable = replay ?? false;
  }
  complete() {
    this.subscribers.forEach((observer) => observer.complete?.());
    this.isCompleted = true;
  }
  error(error) {
    this.subscribers.forEach((observer) => observer.error?.(error));
    if (this.isReplayObservable) {
      this.errorReceived = error;
    }
  }
  next(value) {
    this.subscribers.forEach((observer) => observer.next(value));
    if (this.isReplayObservable) {
      this.buffer.push(value);
    }
  }
  reset() {
    this.subscribers.clear();
    this.buffer = [];
  }
  subscribe(observer) {
    this.subscribers.add(observer);
    if (this.isReplayObservable) {
      this.sendBufferToObserver(observer);
    }
    return {
      unsubscribe: () => this.unsubscribe(observer)
    };
  }
  unsubscribe(observer) {
    this.subscribers.delete(observer);
  }
  sendBufferToObserver(observer) {
    this.buffer.forEach((value) => observer.next(value));
    if (this.errorReceived) {
      observer.error?.(this.errorReceived);
    } else {
      if (this.isCompleted) {
        observer.complete?.();
      }
    }
  }
}

const isContextTasksAdapter = (adapter) => {
  const typedAdapter = adapter;
  if (typedAdapter && typeof typedAdapter.resetTasks === "function" && typeof typedAdapter.updateTasks === "function" && typeof typedAdapter.removeTasks === "function") {
    return typedAdapter;
  }
  return false;
};

class DataSyncService {
  constructor(adapter) {
    this.actionToPerformWhenIdle = "none";
    this.itemIds = /* @__PURE__ */ new Set();
    this.status = "idle";
    this.theContextId = null;
    this.updateQueueByItemId = /* @__PURE__ */ new Map();
    this.dataAdapter = adapter;
  }
  get contextId() {
    return this.theContextId;
  }
  async createContext(initialItems) {
    if (this.status === "destroyed") {
      return {
        success: false,
        error: "The context has been destroyed"
      };
    }
    const contextItems = initialItems ?? null;
    this.itemIds.clear();
    if (contextItems !== null) {
      const itemIds = Object.keys(contextItems);
      itemIds.forEach((itemId) => {
        this.itemIds.add(itemId);
      });
    }
    this.actionToPerformWhenIdle = "none";
    try {
      const result = await this.dataAdapter.create(contextItems ?? {});
      if (result.success) {
        this.theContextId = result.contextId;
        return {
          success: true,
          contextId: result.contextId
        };
      } else {
        return {
          success: false,
          error: "Failed to set the context"
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `${error}`
      };
    }
  }
  async destroy() {
    if (this.status === "destroyed") {
      warn(`Context.DataSyncService.destroy() called on a state that has already been destroyed`);
      return {
        success: true
      };
    }
    if (this.status === "updating" && !this.contextId) {
      warn(`Context.DataSyncService.destroy() called with no contextId!`);
    }
    if (this.contextId) {
      this.status = "updating";
      await this.dataAdapter.discard(this.contextId);
    }
    this.status = "destroyed";
    this.theContextId = null;
    this.updateQueueByItemId.clear();
    this.actionToPerformWhenIdle = "none";
    return {
      success: true
    };
  }
  async flush() {
    if (!this.contextId) {
      throw new Error("Context not initialized");
    }
    if (this.status === "updating") {
      this.actionToPerformWhenIdle = "flush";
      return;
    }
    this.status = "updating";
    const itemsInQueue = this.updateQueueByItemId.keys();
    const itemsToUpdate = [];
    const itemsToDelete = [];
    for (const itemId of itemsInQueue) {
      const item = this.updateQueueByItemId.get(itemId);
      if (!item) {
        continue;
      }
      if (item.operation === "delete") {
        itemsToDelete.push(itemId);
        continue;
      }
      if (["set", "update"].includes(item.operation)) {
        itemsToUpdate.push(itemId);
      }
    }
    const itemsUpdateObject = itemsToUpdate.reduce(
      (acc, itemId) => {
        const op = this.updateQueueByItemId.get(itemId);
        if (!op) {
          return acc;
        }
        if (op.operation === "set") {
          acc[itemId] = {
            value: op.data,
            description: op.description
          };
        }
        if (op.operation === "update" && (op.data !== void 0 || op.description !== void 0)) {
          acc[itemId] = { value: op.data, description: op.description };
        }
        return acc;
      },
      {}
    );
    if (Object.keys(itemsUpdateObject).length > 0) {
      Object.keys(itemsUpdateObject).forEach((itemId) => {
        this.updateQueueByItemId.delete(itemId);
      });
      try {
        await this.dataAdapter.updateItems(this.contextId, itemsUpdateObject);
      } catch (error) {
        warn(`Failed to update context data: ${error}`);
        Object.keys(itemsUpdateObject).forEach((itemId) => {
          const item = itemsUpdateObject[itemId];
          if (!item) {
            return;
          }
          this.updateQueueByItemId.set(itemId, {
            operation: "update",
            data: item.value,
            description: item.description
          });
        });
      }
    }
    if (itemsToDelete.length > 0) {
      itemsToDelete.forEach((itemId) => {
        this.itemIds.delete(itemId);
        this.updateQueueByItemId.delete(itemId);
      });
      try {
        await this.dataAdapter.removeItems(this.contextId, itemsToDelete);
      } catch (error) {
        warn(`Failed to delete context data: ${error}`);
        itemsToDelete.forEach((itemId) => {
          this.itemIds.add(itemId);
          this.updateQueueByItemId.set(itemId, { operation: "delete" });
        });
      }
    }
    await this.backToIdle();
  }
  hasActiveItemWithId(itemId) {
    return this.itemIds.has(itemId) && (!this.updateQueueByItemId.has(itemId) || this.updateQueueByItemId.get(itemId)?.operation !== "delete");
  }
  hasItemWithId(itemId) {
    return this.itemIds.has(itemId);
  }
  removeItem(itemId) {
    if (this.status === "destroyed") {
      throw new Error("The context has been destroyed");
    }
    if (!this.contextId) {
      throw new Error("Context not initialized");
    }
    if (!this.itemIds.has(itemId)) {
      throw new Error("Item not found");
    }
    this.updateQueueByItemId.set(itemId, { operation: "delete" });
  }
  async resetContextData(newInitialData) {
    const victimContextId = this.contextId;
    this.itemIds.clear();
    this.updateQueueByItemId.clear();
    if (this.status === "updating") {
      this.actionToPerformWhenIdle = "reset";
      return;
    }
    if (!victimContextId) {
      warn(`resetContextData() called with no contextId!`);
      await this.backToIdle();
      return;
    }
    try {
      this.status = "updating";
      await this.dataAdapter.resetItems(victimContextId, newInitialData);
    } catch (error) {
      warn(`Failed to reset context data: ${error}`);
    }
    this.updateQueueByItemId.clear();
    if (newInitialData) {
      this.itemIds.clear();
      const newItems = Object.keys(newInitialData);
      newItems.forEach((itemId) => {
        this.itemIds.add(itemId);
      });
    } else {
      this.itemIds.clear();
    }
    await this.backToIdle();
  }
  setItemData(itemId, description, data) {
    if (this.status === "destroyed") {
      throw new Error("The context has been destroyed");
    }
    this.updateQueueByItemId.set(
      itemId,
      {
        operation: "set",
        description,
        data
      }
    );
    this.itemIds.add(itemId);
  }
  updateItemData(itemId, description, data) {
    if (this.status === "destroyed") {
      throw new Error("The context has been destroyed");
    }
    if (data === void 0 && description === void 0) {
      return;
    }
    const currentInQueue = this.updateQueueByItemId.get(itemId);
    if (currentInQueue?.operation === "delete") {
      throw new Error("Item has been deleted");
    }
    const updatedData = data ?? currentInQueue?.data ?? void 0;
    const updatedDescription = description ?? currentInQueue?.description ?? void 0;
    this.updateQueueByItemId.set(itemId, {
      operation: "update",
      data: updatedData,
      description: updatedDescription
    });
  }
  async backToIdle() {
    this.status = "idle";
    const actionToPerformWhenIdle = this.actionToPerformWhenIdle;
    this.actionToPerformWhenIdle = "none";
    if (actionToPerformWhenIdle === "flush") {
      await this.flush();
      return;
    }
    if (actionToPerformWhenIdle === "reset") {
      await this.resetContextData();
      return;
    }
  }
}

class TasksService {
  constructor(contextId, adapter) {
    this.actionToPerformWhenIdle = "none";
    this.status = "idle";
    this.taskCallbacks = /* @__PURE__ */ new Map();
    this.tasks = /* @__PURE__ */ new Set();
    this.updateQueueByTaskId = /* @__PURE__ */ new Map();
    this.contextId = contextId;
    this.adapter = adapter;
  }
  canRunTask(taskId) {
    return this.taskCallbacks.has(taskId);
  }
  async destroy() {
    if (this.status === "destroyed") {
      warn(`Context.TasksService.destroy() called on a state that has already been destroyed`);
      return {
        success: true
      };
    }
    this.status = "updating";
    await this.unregisterAllTasks();
    this.status = "destroyed";
    this.updateQueueByTaskId.clear();
    this.tasks.clear();
    return {
      success: true
    };
  }
  async flush() {
    if (this.status === "updating") {
      this.actionToPerformWhenIdle = "flush";
      return;
    }
    const itemsInQueue = this.updateQueueByTaskId.keys();
    const tasksToSet = [];
    const tasksToUpdate = [];
    const tasksToDelete = [];
    for (const itemId of itemsInQueue) {
      const item = this.updateQueueByTaskId.get(itemId);
      if (!item) {
        continue;
      }
      if (item.operation === "delete") {
        tasksToDelete.push(itemId);
        continue;
      }
      if (item.operation === "set") {
        tasksToSet.push(itemId);
        continue;
      }
      if (item.operation === "update") {
        tasksToUpdate.push(itemId);
      }
    }
    if (tasksToSet.length === 0 && tasksToUpdate.length === 0 && tasksToDelete.length === 0) {
      return;
    }
    this.status = "updating";
    const itemsToSetByItemIdData = this.buildUpdateObject(tasksToSet);
    const itemsToUpdateByItemIdData = this.buildUpdateObject(tasksToUpdate);
    const allItemsToUpdate = {
      ...itemsToSetByItemIdData,
      ...itemsToUpdateByItemIdData
    };
    if (Object.keys(allItemsToUpdate).length > 0) {
      try {
        const registerTasksResult = await this.adapter.updateTasks(
          this.contextId,
          allItemsToUpdate
        );
        if (!registerTasksResult.success) {
          warn(
            `Context.TasksService.flush() failed to register tasks for context ID ${this.contextId}
Error: ${registerTasksResult.error}`
          );
        } else {
          for (const taskId of Object.keys(allItemsToUpdate)) {
            const queuedTask = this.updateQueueByTaskId.get(taskId);
            if (queuedTask && queuedTask.operation === "set") {
              this.taskCallbacks.set(taskId, queuedTask.callback);
              this.updateQueueByTaskId.delete(taskId);
            }
          }
        }
      } catch (error) {
        warn(
          `Context.TasksService.flush() failed to register tasks for context ID ${this.contextId}
Error: ${error}`
        );
      }
    }
    if (tasksToDelete.length > 0) {
      try {
        const unregisterTasksResult = await this.adapter.removeTasks(
          this.contextId,
          tasksToDelete
        );
        if (!unregisterTasksResult.success) {
          warn(
            `Context.TasksService.flush() failed to unregister tasks for context ID ${this.contextId}
Error: ${unregisterTasksResult.error}`
          );
        } else {
          for (const taskId of tasksToDelete) {
            this.taskCallbacks.delete(taskId);
            this.updateQueueByTaskId.delete(taskId);
          }
        }
      } catch (error) {
        warn(
          `Context.TasksService.flush() failed to unregister tasks for context ID ${this.contextId}
Error: ${error}`
        );
      }
    }
    await this.backToIdle();
  }
  hasTask(taskId) {
    return this.tasks.has(taskId);
  }
  async registerTask(taskId, description, callback, paramDescriptions) {
    if (this.status === "destroyed") {
      throw new Error("Context has been destroyed");
    }
    if (this.tasks.has(taskId)) {
      throw new Error(`A task with ID '${taskId}' already exists. Task IDs must be unique.`);
    }
    this.updateQueueByTaskId.set(taskId, {
      operation: "set",
      description,
      paramDescriptions: paramDescriptions || [],
      callback
    });
    this.tasks.add(taskId);
  }
  async resetContextData() {
    const victimContextId = this.contextId;
    this.tasks.clear();
    this.taskCallbacks.clear();
    this.updateQueueByTaskId.clear();
    if (this.status === "updating") {
      this.actionToPerformWhenIdle = "reset";
      return;
    }
    if (!victimContextId) {
      warn(`resetContextData() called with no contextId!`);
      await this.backToIdle();
      return;
    }
    try {
      this.status = "updating";
      await this.unregisterAllTasks();
    } catch (error) {
      warn(`Failed to reset context data: ${error}`);
    }
    await this.backToIdle();
  }
  async runTask(taskId, parameters) {
    if (this.status === "destroyed") {
      throw new Error("Context has been destroyed");
    }
    if (!this.tasks.has(taskId)) {
      return {
        success: false,
        error: `Task with ID ${taskId} not found`
      };
    }
    const callback = this.taskCallbacks.get(taskId);
    if (!callback) {
      return {
        success: false,
        error: `The task with ID '${taskId}' has no callback. This is potential due to failed registration.`
      };
    }
    try {
      const result = callback(
        ...parameters ?? []
      );
      return {
        success: true,
        result
      };
    } catch (error) {
      return {
        success: false,
        error: `${error}`
      };
    }
  }
  async unregisterAllTasks() {
    if (this.tasks.size === 0) {
      return {
        success: true
      };
    }
    const result = await this.adapter.resetTasks(this.contextId);
    if (result.success) {
      this.tasks.clear();
      this.taskCallbacks.clear();
      this.updateQueueByTaskId.clear();
    }
    return result;
  }
  async unregisterTask(taskId) {
    if (this.status === "destroyed") {
      throw new Error("Context has been destroyed");
    }
    if (!this.tasks.has(taskId)) {
      return {
        success: true
      };
    }
    this.tasks.delete(taskId);
    this.taskCallbacks.delete(taskId);
    this.updateQueueByTaskId.set(taskId, {
      operation: "delete"
    });
    return {
      success: true
    };
  }
  async updateTaskCallback(taskId, callback) {
    if (this.status === "destroyed") {
      throw new Error("The context has been destroyed");
    }
    if (!this.tasks.has(taskId)) {
      throw new Error(`Task with ID ${taskId} not found`);
    }
    this.taskCallbacks.set(taskId, callback);
  }
  async updateTaskDescription(taskId, description) {
    if (this.status === "destroyed") {
      throw new Error("The context has been destroyed");
    }
    if (!this.tasks.has(taskId)) {
      throw new Error(`Task with ID ${taskId} not found`);
    }
    const item = this.updateQueueByTaskId.get(taskId);
    if (item) {
      if (item.operation !== "update") {
        const newItem = {
          operation: "update",
          description
        };
        this.updateQueueByTaskId.set(taskId, newItem);
      } else {
        item.description = description;
      }
    } else {
      this.updateQueueByTaskId.set(taskId, {
        operation: "update",
        description
      });
    }
  }
  async updateTaskParamDescriptions(taskId, paramDescriptions) {
    if (this.status === "destroyed") {
      throw new Error("The context has been destroyed");
    }
    if (!this.tasks.has(taskId)) {
      throw new Error(`Task with ID ${taskId} not found`);
    }
    const item = this.updateQueueByTaskId.get(taskId);
    if (item) {
      if (item.operation !== "update") {
        const newItem = {
          operation: "update",
          paramDescriptions
        };
        this.updateQueueByTaskId.set(taskId, newItem);
      } else {
        item.paramDescriptions = paramDescriptions;
      }
    } else {
      this.updateQueueByTaskId.set(taskId, {
        operation: "update",
        paramDescriptions
      });
    }
  }
  async backToIdle() {
    this.status = "idle";
    const actionToPerformWhenIdle = this.actionToPerformWhenIdle;
    this.actionToPerformWhenIdle = "none";
    if (actionToPerformWhenIdle === "flush") {
      await this.flush();
      return;
    }
    if (actionToPerformWhenIdle === "reset") {
      await this.unregisterAllTasks();
      return;
    }
  }
  buildUpdateObject(itemIds) {
    return itemIds.reduce(
      (acc, itemId) => {
        const item = this.updateQueueByTaskId.get(itemId);
        if (!item) {
          return acc;
        }
        if (item.operation === "set") {
          acc[itemId] = {
            description: item.description,
            paramDescriptions: item.paramDescriptions
          };
        }
        if (item.operation === "update" && (item.description !== void 0 || item.paramDescriptions !== void 0)) {
          const updateData = {};
          if (item.description !== void 0) {
            updateData.description = item.description;
          }
          if (item.paramDescriptions !== void 0) {
            updateData.paramDescriptions = item.paramDescriptions;
          }
          acc[itemId] = updateData;
        }
        return acc;
      },
      {}
    );
  }
}

class AiContextImpl {
  constructor() {
    this.destroy = async () => {
      if (this.theStatus === "destroyed") {
        return {
          success: true
        };
      }
      this.theStatus = "destroyed";
      await Promise.all([
        this.theDataSyncService?.destroy(),
        this.theTasksService?.destroy()
      ]);
      this.theDataSyncService = null;
      this.theTasksService = null;
      this.theDataAdapter = null;
      this.theTasksAdapter = null;
      return {
        success: true
      };
    };
    this.flush = async () => {
      try {
        await this.theDataSyncService?.flush();
      } catch (_error) {
        return {
          success: false,
          error: "Failed to flush context data"
        };
      }
      try {
        await this.theTasksService?.flush();
      } catch (_error) {
        return {
          success: false,
          error: "Failed to flush context tasks"
        };
      }
      return {
        success: true
      };
    };
    this.initialize = async (data) => {
      if (this.theStatus === "initializing") {
        warn(
          `${this.constructor.name}.initialize() called while context is still initializing! You cannot initialize twice at the same time. Use ${this.constructor.name}.status or await ${this.constructor.name}.initialize() to make sure that the context is not initializing before calling this method.`
        );
        return {
          success: false,
          error: "Context is still initializing! Use AiContext.status to check the context status before calling this method."
        };
      }
      if (this.theStatus === "syncing") {
        warn(
          `${this.constructor.name}.initialize() called on an already initialized context! Use ${this.constructor.name}.status to check the context status before calling this method. `
        );
        return {
          success: false,
          error: "Context already initialized! Use AiContext.status to check the context status before calling this method."
        };
      }
      if (this.theStatus === "destroyed") {
        warn(
          `${this.constructor.name}.initialize() called on destroyed context! Use ${this.constructor.name}.status to check the context status before calling this method. When the context is destroyed, it cannot be used anymore and you should create a new context.`
        );
        return {
          success: false,
          error: "Context has been destroyed"
        };
      }
      if (this.theStatus === "error") {
        warn(
          `${this.constructor.name}.initialize() called on a context in error state! Use ${this.constructor.name}.status to check the context status before calling this method. When the context is in error state, it cannot be used anymore and you should create a new context.`
        );
        return {
          success: false,
          error: "Context is in error state"
        };
      }
      if (!this.theDataAdapter) {
        warn(
          `Adapter not set! You must set the adapter before initializing the context. Use ${this.constructor.name}.withAdapter() to set the adapter before calling this method.`
        );
        return {
          success: false,
          error: "Adapter not set"
        };
      }
      this.theStatus = "initializing";
      this.theDataSyncService = new DataSyncService(this.theDataAdapter);
      try {
        const result = await this.theDataSyncService.createContext(data);
        if (this.status === "destroyed") {
          if (result.success) {
            await this.theDataSyncService?.resetContextData();
          }
          return {
            success: false,
            error: "Context has been destroyed"
          };
        }
        if (!result.success) {
          this.theStatus = "error";
          return {
            success: false,
            error: "Failed to initialize context"
          };
        }
        if (!this.contextId) {
          this.theStatus = "error";
          return {
            success: false,
            error: "Failed to obtain context ID"
          };
        }
        this.theStatus = "syncing";
        if (this.theTasksAdapter) {
          this.theTasksService = new TasksService(this.contextId, this.theTasksAdapter);
        } else {
          warn(
            "Initializing nlux AiContext without tasks adapter. The context will not handle registering and executing tasks by AI. If you want to use tasks triggered by AI, you should provide an adapter that implements ContextAdapter interface [type ContextAdapter = ContextDataAdapter & ContextTasksAdapter]"
          );
        }
        return {
          success: true,
          contextId: result.contextId
        };
      } catch (error) {
        this.theStatus = "error";
        return {
          success: false,
          error: `${error}`
        };
      }
    };
    this.observeState = (itemId, description, initialData) => {
      if (this.theStatus === "idle") {
        warn(
          `${this.constructor.name}.observeState() called on idle context! Use ${this.constructor.name}.status to check the context status before calling this method. Use ${this.constructor.name}.initialize() to initialize the context when it is not initialized.`
        );
        return void 0;
      }
      if (this.theStatus === "initializing") {
        warn(
          `${this.constructor.name}.observeState() called while context is still initializing! You cannot observe state items while the context is initializing. Use ${this.constructor.name}.status or await ${this.constructor.name}.initialize() to make sure that the context is not initializing before calling this method.`
        );
        return void 0;
      }
      if (this.theStatus === "destroyed") {
        warn(
          `${this.constructor.name}.observeState() called on destroyed context! Use ${this.constructor.name}.status to check the context status before calling this method. When the context is destroyed, it cannot be used anymore and you should create a new context.`
        );
        return void 0;
      }
      this.theDataSyncService?.setItemData(itemId, description, initialData ?? null);
      return {
        setData: (data) => {
          this.theDataSyncService?.updateItemData(itemId, void 0, data);
        },
        setDescription: (description2) => {
          this.theDataSyncService?.updateItemData(itemId, description2, void 0);
        },
        discard: () => {
          this.theDataSyncService?.removeItem(itemId);
        }
      };
    };
    this.registerTask = (taskId, description, callback, parameters) => {
      if (this.theStatus === "idle") {
        warn(
          `${this.constructor.name}.registerTask() called on idle context! Use ${this.constructor.name}.status to check the context status before calling this method. Use ${this.constructor.name}.initialize() to initialize the context when it is not initialized.`
        );
        return void 0;
      }
      if (!this.theTasksService) {
        warn(
          `${this.constructor.name}.registerTask() called on a context that has does not have tasks service! You should use an adapter that implements ContextTasksAdapter interface in order to register tasks. Use ${this.constructor.name}.withAdapter() to set the right adapter before calling this method.`
        );
        return void 0;
      }
      if (this.theStatus === "destroyed") {
        warn(
          `${this.constructor.name}.registerTask() called on destroyed context! Use ${this.constructor.name}.status to check the context status before calling this method. When the context is destroyed, it cannot be used anymore and you should create a new context.`
        );
        return void 0;
      }
      let status = "updating";
      if (this.theTasksService.hasTask(taskId)) {
        console.warn(
          `${this.constructor.name}.registerTask() called with existing taskId: ${taskId}! It's only possible to register a task once. Use ${this.constructor.name}.hasTask() to check if the task already exists. Use ${this.constructor.name}.registerTask() with a different taskId if you want to register a different task.`
        );
        return void 0;
      }
      this.theTasksService.registerTask(taskId, description, callback, parameters).then(() => {
        if (status === "updating") {
          status = "set";
        }
      }).catch(() => {
        warn(
          `${this.constructor.name}.registerTask() failed to register task '${taskId}'!
The task will be marked as deleted and will not be updated anymore.`
        );
        if (status === "updating") {
          status = "deleted";
          this.unregisterTask(taskId);
        }
      });
      return {
        discard: () => {
          status = "deleted";
          this.unregisterTask(taskId);
        },
        setDescription: (description2) => {
          if (status === "deleted") {
            throw new Error("Task has been deleted");
          }
          status = "updating";
          this.theTasksService?.updateTaskDescription(taskId, description2).then(() => {
            if (status === "updating") {
              status = "set";
            }
          }).catch(() => {
            if (status === "updating") {
              status = "set";
            }
          });
        },
        setCallback: (callback2) => {
          if (status === "deleted") {
            throw new Error("Task has been deleted");
          }
          status = "updating";
          this.theTasksService?.updateTaskCallback(taskId, callback2).then(() => {
            if (status === "updating") {
              status = "set";
            }
          }).catch(() => {
            if (status === "updating") {
              status = "set";
            }
          });
        },
        setParamDescriptions: (paramDescriptions) => {
          if (status === "deleted") {
            throw new Error("Task has been deleted");
          }
          status = "updating";
          this.theTasksService?.updateTaskParamDescriptions(
            taskId,
            paramDescriptions
          ).then(() => {
            if (status === "updating") {
              status = "set";
            }
          }).catch(() => {
            if (status === "updating") {
              status = "set";
            }
          });
        }
      };
    };
    this.reset = async (data) => {
      if (!this.theDataSyncService) {
        warn(
          `${this.constructor.name}.reset() called on a state that has not been initialized! Use ${this.constructor.name}.initialize() to initialize the context before attempting any reset.`
        );
        return {
          success: false,
          error: "Context has not been initialized"
        };
      }
      try {
        await this.theDataSyncService?.resetContextData(data);
        await this.theTasksService?.resetContextData();
        this.theStatus = "syncing";
        return {
          success: true
        };
      } catch (error) {
        this.theStatus = "error";
        return {
          success: false,
          error: `${error}`
        };
      }
    };
    this.runTask = async (taskId, parameters) => {
      if (!this.theTasksService) {
        warn(
          `${this.constructor.name}.runTask() called on a state that has not been initialized! Use ${this.constructor.name}.initialize() to initialize the context before attempting any task execution.`
        );
        return Promise.resolve({
          success: false,
          error: "Context has not been initialized with tasks service. An adapter that implements ContextTasksAdapter interface should be provided to the context, and the context should be initialized before running any tasks."
        });
      }
      return this.theTasksService.runTask(taskId, parameters);
    };
    this.withAdapter = (adapter) => {
      if (this.theDataAdapter) {
        throw new Error("Adapter already set");
      }
      const isBuilder = typeof adapter?.build === "function";
      if (isBuilder) {
        this.theDataAdapter = adapter.build();
      } else {
        this.theDataAdapter = adapter;
      }
      const adapterAsTaskAdapter = isContextTasksAdapter(this.theDataAdapter);
      if (adapterAsTaskAdapter) {
        this.theTasksAdapter = adapterAsTaskAdapter;
      }
      return this;
    };
    this.withDataSyncOptions = (options) => {
      if (this.theDataSyncOptions) {
        throw new Error("Data sync options already set");
      }
      this.theDataSyncOptions = { ...options };
      return this;
    };
    this.theDataAdapter = null;
    this.theDataSyncOptions = null;
    this.theDataSyncService = null;
    this.theStatus = "idle";
    this.theTasksAdapter = null;
    this.theTasksService = null;
    this.unregisterTask = (taskId) => {
      if (!this.theTasksService) {
        warn(
          `${this.constructor.name}.unregisterTask() called on a state that has not been initialized! Use ${this.constructor.name}.initialize() to initialize the context before attempting any task unregister.`
        );
        return Promise.resolve({
          success: false,
          error: "Context has not been initialized"
        });
      }
      return this.theTasksService.unregisterTask(taskId);
    };
  }
  get contextId() {
    return this.theDataSyncService?.contextId ?? null;
  }
  get status() {
    return this.theStatus;
  }
  hasItem(itemId) {
    return this.theDataSyncService?.hasItemWithId(itemId) ?? false;
  }
  hasRunnableTask(taskId) {
    return this.theTasksService?.canRunTask(taskId) ?? false;
  }
  hasTask(taskId) {
    return this.theTasksService?.hasTask(taskId) ?? false;
  }
}
const createAiContext = () => {
  return new AiContextImpl();
};

const predefinedContextSize = {
  "1k": 1e3,
  "10k": 1e4,
  "100k": 1e5,
  "1mb": 1e6,
  "10mb": 1e7
};

const createAiChat = () => new AiChat();

export { AiChat, Observable, createAiChat, createAiContext, predefinedContextSize };
//# sourceMappingURL=nlux-core.js.map
