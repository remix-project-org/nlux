(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('react'), require('react/jsx-runtime'), require('@nlux/core')) :
    typeof define === 'function' && define.amd ? define(['exports', 'react', 'react/jsx-runtime', '@nlux/core'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global["@nlux/react"] = {}, global.react, global.jsxRuntime, global.core));
})(this, (function (exports, react, jsxRuntime, core) { 'use strict';

    var has = Object.prototype.hasOwnProperty;
    function find(iter, tar) {
      for (let key of iter.keys()) {
        if (dequal(key, tar)) {
          return key;
        }
      }
    }
    function dequal(foo, bar) {
      var ctor, len, tmp;
      if (foo === bar) {
        return true;
      }
      if (foo && bar && (ctor = foo.constructor) === bar.constructor) {
        if (ctor === Date) {
          return foo.getTime() === bar.getTime();
        }
        if (ctor === RegExp) {
          return foo.toString() === bar.toString();
        }
        if (ctor === Array) {
          if ((len = foo.length) === bar.length) {
            while (len-- && dequal(foo[len], bar[len])) {
            }
          }
          return len === -1;
        }
        if (ctor === Set) {
          if (foo.size !== bar.size) {
            return false;
          }
          for (len of foo) {
            tmp = len;
            if (tmp && typeof tmp === "object") {
              tmp = find(bar, tmp);
              if (!tmp) {
                return false;
              }
            }
            if (!bar.has(tmp)) {
              return false;
            }
          }
          return true;
        }
        if (ctor === Map) {
          if (foo.size !== bar.size) {
            return false;
          }
          for (len of foo) {
            tmp = len[0];
            if (tmp && typeof tmp === "object") {
              tmp = find(bar, tmp);
              if (!tmp) {
                return false;
              }
            }
            if (!dequal(len[1], bar.get(tmp))) {
              return false;
            }
          }
          return true;
        }
        if (ctor === ArrayBuffer) {
          foo = new Uint8Array(foo);
          bar = new Uint8Array(bar);
        } else {
          if (ctor === DataView) {
            if ((len = foo.byteLength) === bar.byteLength) {
              while (len-- && foo.getInt8(len) === bar.getInt8(len)) {
              }
            }
            return len === -1;
          }
        }
        if (ArrayBuffer.isView(foo)) {
          if ((len = foo.byteLength) === bar.byteLength) {
            while (len-- && foo[len] === bar[len]) {
            }
          }
          return len === -1;
        }
        if (!ctor || typeof foo === "object") {
          len = 0;
          for (ctor in foo) {
            if (has.call(foo, ctor) && ++len && !has.call(bar, ctor)) {
              return false;
            }
            if (!(ctor in bar) || !dequal(foo[ctor], bar[ctor])) {
              return false;
            }
          }
          return Object.keys(bar).length === len;
        }
      }
      return foo !== foo && bar !== bar;
    }

    function checkDeps(deps) {
      if (!deps || !deps.length) {
        throw new Error(
          "useDeepCompareEffect should not be used with no dependencies. Use React.useEffect instead."
        );
      }
      if (deps.every(isPrimitive)) {
        throw new Error(
          "useDeepCompareEffect should not be used with dependencies that are all primitive values. Use React.useEffect instead."
        );
      }
    }
    function isPrimitive(val) {
      return val == null || /^[sbn]/.test(typeof val);
    }
    function useDeepCompareMemoize(value) {
      const ref = react.useRef(value);
      const signalRef = react.useRef(0);
      if (!dequal(value, ref.current)) {
        ref.current = value;
        signalRef.current += 1;
      }
      return react.useMemo(() => ref.current, [signalRef.current]);
    }
    function useDeepCompareEffect$1(callback, dependencies) {
      {
        checkDeps(dependencies);
      }
      return react.useEffect(callback, useDeepCompareMemoize(dependencies));
    }

    const className$7 = "nlux-comp-exceptionBox";
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

    const chatItemsToChatSegment = (chatItems) => {
      const segmentItems = chatItems.map((message, index) => {
        if (message.role !== "assistant" && message.role !== "user") {
          warn(
            `Invalid role for item at index ${index} in initial conversation: Role must be "assistant" or "user"`
          );
          return;
        }
        if (message.role === "user") {
          if (typeof message.message !== "string") {
            warn(
              `Invalid message type for item at index ${index} in initial conversation: When role is "user", message must be a string`
            );
            return;
          }
          return {
            uid: uid(),
            time: /* @__PURE__ */ new Date(),
            status: "complete",
            participantRole: "user",
            content: message.message,
            contentType: "text"
          };
        }
        return {
          uid: uid(),
          time: /* @__PURE__ */ new Date(),
          status: "complete",
          participantRole: "assistant",
          content: message.message,
          contentType: "text",
          serverResponse: message.serverResponse,
          dataTransferMode: "batch"
        };
      }).filter(
        (segmentItem) => {
          return segmentItem !== void 0;
        }
      );
      return {
        uid: "initial",
        status: "complete",
        items: segmentItems
      };
    };

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

    const conversationDefaultLayout = "bubbles";
    const getConversationLayout = (layout) => {
      return layout ?? conversationDefaultLayout;
    };

    const useConversationDisplayStyle = (conversationOptions) => {
      return react.useMemo(
        () => getConversationLayout(conversationOptions?.layout),
        [conversationOptions?.layout]
      );
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

    const renderedPhotoContainerClassName = "nlux-comp-avatarContainer";
    const renderedPhotoClassName = "nlux-comp-avatarPicture";

    const className$6 = "nlux-comp-avatar";

    const directionClassName$1 = {
      received: "nlux_msg_received",
      sent: "nlux_msg_sent"
    };

    const statusClassName$1 = {
      streaming: "nlux_msg_streaming",
      complete: "nlux_msg_complete"
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

    const emptyInnerHtml = (element) => {
      element.replaceChildren();
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

    var __defProp$6 = Object.defineProperty;
    var __defNormalProp$6 = (obj, key, value) => key in obj ? __defProp$6(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$6 = (obj, key, value) => __defNormalProp$6(obj, typeof key !== "symbol" ? key + "" : key, value);
    class _Hooks {
      constructor(options) {
        __publicField$6(this, "options");
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
    __publicField$6(_Hooks, "passThroughHooks", /* @__PURE__ */ new Set([
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

    var __defProp$5 = Object.defineProperty;
    var __defNormalProp$5 = (obj, key, value) => key in obj ? __defProp$5(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$5 = (obj, key, value) => __defNormalProp$5(obj, typeof key !== "symbol" ? key + "" : key, value);
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
        __publicField$5(this, "lexer");
        // set by the lexer
        __publicField$5(this, "options");
        __publicField$5(this, "rules");
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

    var __defProp$4 = Object.defineProperty;
    var __defNormalProp$4 = (obj, key, value) => key in obj ? __defProp$4(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$4 = (obj, key, value) => __defNormalProp$4(obj, typeof key !== "symbol" ? key + "" : key, value);
    class _Lexer {
      constructor(options) {
        __publicField$4(this, "options");
        __publicField$4(this, "state");
        __publicField$4(this, "tokens");
        __publicField$4(this, "inlineQueue");
        __publicField$4(this, "tokenizer");
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

    var __defProp$3 = Object.defineProperty;
    var __defNormalProp$3 = (obj, key, value) => key in obj ? __defProp$3(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$3 = (obj, key, value) => __defNormalProp$3(obj, key + "" , value);
    class _Renderer {
      constructor(options) {
        __publicField$3(this, "options");
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

    var __defProp$2 = Object.defineProperty;
    var __defNormalProp$2 = (obj, key, value) => key in obj ? __defProp$2(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$2 = (obj, key, value) => __defNormalProp$2(obj, typeof key !== "symbol" ? key + "" : key, value);
    class _Parser {
      constructor(options) {
        __publicField$2(this, "options");
        __publicField$2(this, "renderer");
        __publicField$2(this, "textRenderer");
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

    var __defProp$1 = Object.defineProperty;
    var __typeError = (msg) => {
      throw TypeError(msg);
    };
    var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$1(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$1 = (obj, key, value) => __defNormalProp$1(obj, typeof key !== "symbol" ? key + "" : key, value);
    var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
    var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
    var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
    var _Marked_instances, onError_fn, parseMarkdown_fn;
    class Marked {
      constructor(...args) {
        __privateAdd(this, _Marked_instances);
        __publicField$1(this, "Hooks", _Hooks);
        __publicField$1(this, "Lexer", _Lexer);
        __publicField$1(this, "Parser", _Parser);
        __publicField$1(this, "Renderer", _Renderer);
        __publicField$1(this, "TextRenderer", _TextRenderer);
        __publicField$1(this, "Tokenizer", _Tokenizer);
        __publicField$1(this, "defaults", _getDefaults());
        __publicField$1(this, "options", this.setOptions);
        __publicField$1(this, "parse", __privateMethod(this, _Marked_instances, parseMarkdown_fn).call(this, _Lexer.lex, _Parser.parse));
        __publicField$1(this, "parseInline", __privateMethod(this, _Marked_instances, parseMarkdown_fn).call(this, _Lexer.lexInline, _Parser.parseInline));
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

    const className$5 = "nlux-comp-message";

    const directionClassName = {
      received: "nlux-comp-chatItem--received",
      sent: "nlux-comp-chatItem--sent"
    };

    const conversationLayoutClassName = {
      bubbles: "nlux-comp-chatItem--bubblesLayout",
      list: "nlux-comp-chatItem--listLayout"
    };

    const className$4 = "nlux-comp-chatItem";

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

    const StreamContainerComp = function(props, ref) {
      const {
        uid,
        status,
        responseRenderer,
        markdownOptions,
        initialMarkdownMessage,
        markdownContainersController
      } = props;
      const [content, setContent] = react.useState([]);
      const rootElRef = react.useRef(null);
      const rootElRefPreviousValue = react.useRef(null);
      const mdStreamParserRef = react.useRef(null);
      const appendChunkToStateRef = react.useRef(null);
      const [streamContainer, setStreamContainer] = react.useState();
      react.useEffect(() => {
        if (rootElRef.current !== rootElRefPreviousValue.current) {
          rootElRefPreviousValue.current = rootElRef.current;
          setStreamContainer(rootElRef.current || void 0);
        }
      });
      react.useEffect(() => {
        if (streamContainer) {
          const element = markdownContainersController.getStreamingDomElement(uid);
          streamContainer.append(element);
        }
      }, [streamContainer]);
      react.useEffect(() => {
        appendChunkToStateRef.current = (newContent) => {
          setContent((prevContent) => [...prevContent, newContent]);
        };
      }, [setContent]);
      react.useEffect(() => {
        const element = markdownContainersController.getStreamingDomElement(uid);
        mdStreamParserRef.current = createMdStreamRenderer(element, {
          syntaxHighlighter: markdownOptions?.syntaxHighlighter,
          htmlSanitizer: markdownOptions?.htmlSanitizer,
          markdownLinkTarget: markdownOptions?.markdownLinkTarget,
          showCodeBlockCopyButton: markdownOptions?.showCodeBlockCopyButton,
          skipStreamingAnimation: markdownOptions?.skipStreamingAnimation,
          streamingAnimationSpeed: markdownOptions?.streamingAnimationSpeed,
          waitTimeBeforeStreamCompletion: markdownOptions?.waitTimeBeforeStreamCompletion,
          onComplete: markdownOptions?.onStreamComplete
        });
        if (initialMarkdownMessage) {
          mdStreamParserRef.current.next(initialMarkdownMessage);
        }
        return () => {
          markdownContainersController.deleteStreamingDomElement(uid);
        };
      }, []);
      react.useEffect(() => {
        return () => {
          rootElRefPreviousValue.current = null;
          mdStreamParserRef.current = null;
          appendChunkToStateRef.current = null;
          setStreamContainer(void 0);
        };
      }, []);
      react.useImperativeHandle(ref, () => ({
        streamChunk: (chunk) => {
          const appendChunkToState = appendChunkToStateRef.current;
          if (appendChunkToState) {
            appendChunkToStateRef.current?.(chunk);
          }
          if (typeof chunk === "string") {
            mdStreamParserRef.current?.next(chunk);
          }
        },
        completeStream: () => {
          mdStreamParserRef.current?.complete();
        },
        cancelStream: () => {
          mdStreamParserRef.current?.cancel();
        }
      }), []);
      const compDirectionClassName = directionClassName$1["received"];
      const compStatusClassName = statusClassName$1[status];
      const className = `${className$5} ${compStatusClassName} ${compDirectionClassName}`;
      const StreamResponseRendererComp = responseRenderer ? responseRenderer : void 0;
      return /* @__PURE__ */ jsxRuntime.jsxs("div", { className, children: [
        StreamResponseRendererComp && /* @__PURE__ */ jsxRuntime.jsx(
          StreamResponseRendererComp,
          {
            uid,
            status,
            containerRef: rootElRef,
            content,
            contentType: "text",
            serverResponse: [],
            dataTransferMode: "stream"
          }
        ),
        !StreamResponseRendererComp && /* @__PURE__ */ jsxRuntime.jsx("div", { className: "nlux-markdownStream-root", ref: rootElRef })
      ] });
    };

    const isSubmitShortcutKey = (event, submitShortcut) => {
      if (!submitShortcut || submitShortcut === "Enter") {
        const isEnter = event.key === "Enter" && !event.nativeEvent.isComposing;
        const aModifierKeyIsPressed = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
        return isEnter && !aModifierKeyIsPressed;
      }
      if (submitShortcut === "CommandEnter") {
        const isCommandEnter = event.key === "Enter" && (event.getModifierState("Control") || event.getModifierState("Meta"));
        if (isCommandEnter) {
          return true;
        }
      }
      return false;
    };

    const MarkdownSnapshotRendererImpl = (props) => {
      const { markdownOptions } = props;
      const markdownContainerRef = react.useRef(null);
      const parsedContent = react.useMemo(() => {
        if (!props.content) {
          return "";
        }
        return parseMdSnapshot(props.content, {
          syntaxHighlighter: markdownOptions?.syntaxHighlighter,
          htmlSanitizer: markdownOptions?.htmlSanitizer,
          markdownLinkTarget: markdownOptions?.markdownLinkTarget,
          showCodeBlockCopyButton: markdownOptions?.showCodeBlockCopyButton
        });
      }, [
        props.content,
        markdownOptions?.markdownLinkTarget,
        markdownOptions?.syntaxHighlighter,
        markdownOptions?.htmlSanitizer,
        markdownOptions?.showCodeBlockCopyButton
      ]);
      react.useEffect(() => {
        if (markdownContainerRef.current && markdownOptions?.showCodeBlockCopyButton !== false) {
          attachCopyClickListener(markdownContainerRef.current);
        }
      }, [parsedContent, markdownContainerRef.current, markdownOptions?.showCodeBlockCopyButton]);
      const trustedHtml = react.useMemo(() => {
        return markdownOptions?.htmlSanitizer ? markdownOptions.htmlSanitizer(parsedContent) : parsedContent;
      }, [parsedContent, markdownOptions?.htmlSanitizer]);
      const handleKeyDown = react.useCallback((event) => {
        if (!props.canResubmit) {
          return;
        }
        const newPromptTyped = event.currentTarget.textContent;
        if (!newPromptTyped) {
          return;
        }
        if (isSubmitShortcutKey(event, props.submitShortcutKey)) {
          event.preventDefault();
          if (props.onResubmit) {
            props.onResubmit(newPromptTyped);
          }
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          event.currentTarget.textContent = props.content;
          event.currentTarget.blur();
        }
      }, [props.canResubmit, props.onResubmit, props.content]);
      const handleBlur = react.useCallback((event) => {
        if (!props.canResubmit) {
          return;
        }
        event.preventDefault();
        event.currentTarget.textContent = props.content;
        event.currentTarget.blur();
      }, [props.canResubmit, props.content]);
      const handleFocus = react.useCallback((event) => {
        if (!props.canResubmit) {
          return;
        }
        event.preventDefault();
        const range = document.createRange();
        range.selectNodeContents(event.currentTarget);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }, [props.canResubmit]);
      const editableStyle = props.canResubmit ? "editable-markdown-container" : "";
      return /* @__PURE__ */ jsxRuntime.jsx(MarkdownParserErrorBoundary, { children: /* @__PURE__ */ jsxRuntime.jsx("div", { className: `nlux-markdownStream-root${editableStyle ? ` ${editableStyle}` : ""}`, children: /* @__PURE__ */ jsxRuntime.jsx(
        "div",
        {
          className: `nlux-markdown-container`,
          ref: markdownContainerRef,
          dangerouslySetInnerHTML: { __html: trustedHtml },
          contentEditable: props.canResubmit,
          onKeyDown: handleKeyDown,
          onBlur: handleBlur,
          onFocus: handleFocus
        }
      ) }) });
    };
    class MarkdownParserErrorBoundary extends react.Component {
      constructor() {
        super(...arguments);
        this.state = { hasError: false };
      }
      static getDerivedStateFromError() {
        return { hasError: true };
      }
      componentDidCatch(errorInfo) {
        warn(
          "Markdown rendering error occurred. This could be due to a malformed markdown content, or it could be because the page requires an HTML sanitizer. Please check the error message for more details and consider configuring NLUX with a compatible sanitizer."
        );
        if (this.props.onMarkdownRenderingError) {
          this.props.onMarkdownRenderingError(errorInfo);
        }
      }
      render() {
        if (this.state.hasError) {
          return null;
        }
        return this.props.children;
      }
    }
    const MarkdownSnapshotRenderer = (props) => {
      return /* @__PURE__ */ jsxRuntime.jsx(MarkdownParserErrorBoundary, { children: /* @__PURE__ */ jsxRuntime.jsx(MarkdownSnapshotRendererImpl, { ...props }) });
    };

    const useAssistantMessageRenderer = function(props) {
      const {
        uid,
        status,
        dataTransferMode,
        contentType,
        fetchedContent,
        streamedContent,
        streamedServerResponse,
        fetchedServerResponse,
        direction,
        messageOptions
      } = props;
      if (messageOptions?.responseRenderer !== void 0) {
        if (dataTransferMode === "stream") {
          const props3 = {
            uid,
            status,
            dataTransferMode,
            contentType,
            content: streamedContent ?? [],
            serverResponse: streamedServerResponse ?? []
          };
          return () => {
            const Comp = messageOptions.responseRenderer;
            return /* @__PURE__ */ jsxRuntime.jsx(Comp, { ...props3 });
          };
        }
        const isServerComponent = react.isValidElement(fetchedContent);
        const serverComponent = isServerComponent ? fetchedContent : void 0;
        const content = !fetchedContent ? [] : isServerComponent ? [] : [fetchedContent];
        const props2 = {
          uid,
          status: "complete",
          dataTransferMode,
          contentType,
          content,
          serverComponent,
          serverResponse: fetchedServerResponse ? [fetchedServerResponse] : []
        };
        return () => {
          const Comp = messageOptions.responseRenderer;
          return /* @__PURE__ */ jsxRuntime.jsx(Comp, { ...props2 });
        };
      }
      if (direction === "sent") {
        if (typeof fetchedContent === "string") {
          const messageToRender = fetchedContent;
          return () => /* @__PURE__ */ jsxRuntime.jsx(jsxRuntime.Fragment, { children: messageToRender });
        }
        return () => "";
      }
      if (typeof fetchedContent === "string") {
        const messageToRender = fetchedContent;
        return () => /* @__PURE__ */ jsxRuntime.jsx(
          MarkdownSnapshotRenderer,
          {
            messageUid: uid,
            content: messageToRender,
            markdownOptions: {
              syntaxHighlighter: messageOptions?.syntaxHighlighter,
              htmlSanitizer: messageOptions?.htmlSanitizer,
              markdownLinkTarget: messageOptions?.markdownLinkTarget,
              showCodeBlockCopyButton: messageOptions?.showCodeBlockCopyButton,
              skipStreamingAnimation: messageOptions?.skipStreamingAnimation
            }
          }
        );
      }
      if (react.isValidElement(fetchedContent)) {
        return () => /* @__PURE__ */ jsxRuntime.jsx(jsxRuntime.Fragment, { children: fetchedContent });
      }
      return () => "";
    };

    const AvatarComp = (props) => {
      const isAvatarUrl = typeof props.avatar === "string";
      const isAvatarElement = !isAvatarUrl && react.isValidElement(props.avatar);
      return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: className$6, children: [
        isAvatarElement && props.avatar,
        !isAvatarElement && isAvatarUrl && /* @__PURE__ */ jsxRuntime.jsx("div", { className: renderedPhotoContainerClassName, children: props.avatar && /* @__PURE__ */ jsxRuntime.jsx(
          "div",
          {
            className: renderedPhotoClassName,
            style: {
              backgroundImage: `url("${encodeURI(props.avatar)}")`
            }
          }
        ) })
      ] });
    };

    const useParticipantInfoRenderer = function(props) {
      const participantInfo = react.useMemo(() => {
        return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nlux-comp-chatItem-participantInfo", children: [
          props.avatar !== void 0 && /* @__PURE__ */ jsxRuntime.jsx(AvatarComp, { name: props.name, avatar: props.avatar }),
          /* @__PURE__ */ jsxRuntime.jsx("span", { className: "nlux-comp-chatItem-participantName", children: props.name })
        ] });
      }, [props.avatar, props.name]);
      return () => /* @__PURE__ */ jsxRuntime.jsx(jsxRuntime.Fragment, { children: participantInfo });
    };

    const useUserMessageRenderer = function(props) {
      return react.useCallback(() => {
        if (props.messageOptions?.promptRenderer === void 0) {
          return /* @__PURE__ */ jsxRuntime.jsx(
            MarkdownSnapshotRenderer,
            {
              messageUid: props.uid,
              content: props.fetchedContent,
              markdownOptions: {
                htmlSanitizer: props.messageOptions?.htmlSanitizer
                // User message does not need syntax highlighting, advanced markdown options
                // Only HTML sanitization is needed
              },
              canResubmit: props.messageOptions?.editableUserMessages,
              submitShortcutKey: props.submitShortcutKey,
              onResubmit: (newPrompt) => {
                props.onPromptResubmit ? props.onPromptResubmit(newPrompt) : void 0;
              }
            }
          );
        }
        const PromptRenderer = props.messageOptions.promptRenderer;
        const onResubmit = (newPrompt) => {
          props.onPromptResubmit ? props.onPromptResubmit(newPrompt) : void 0;
        };
        return /* @__PURE__ */ jsxRuntime.jsx(
          PromptRenderer,
          {
            uid: props.uid,
            prompt: props.fetchedContent,
            onResubmit
          }
        );
      }, [props.messageOptions?.promptRenderer, props.fetchedContent, props.uid]);
    };

    const ChatItemComp = function(props, ref) {
      const streamContainer = react.useRef(null);
      react.useImperativeHandle(ref, () => ({
        streamChunk: (chunk) => setTimeout(() => streamContainer?.current?.streamChunk(chunk)),
        completeStream: () => setTimeout(() => streamContainer?.current?.completeStream()),
        cancelStream: () => streamContainer?.current?.cancelStream()
      }), []);
      const isServerComponent = props.contentType === "server-component";
      const isAssistantMessage = props.direction === "received";
      const isUserMessage = props.direction === "sent";
      const isStreamed = props.dataTransferMode === "stream";
      const isPartOfInitialSegment = props.isPartOfInitialSegment;
      const markdownStreamRenderedCallback = react.useCallback(() => props.onMarkdownStreamRendered?.(props.uid), [props.uid]);
      react.useEffect(() => {
        if (!isStreamed && !isServerComponent && !isPartOfInitialSegment) {
          props.onMarkdownStreamRendered?.(props.uid);
        }
      }, []);
      const AssistantBatchedMessage = useAssistantMessageRenderer(props);
      const UserMessage = useUserMessageRenderer(props);
      const ForwardRefStreamContainerComp = react.useMemo(() => react.forwardRef(StreamContainerComp), []);
      const ParticipantInfo = useParticipantInfoRenderer(props);
      const directionClassNameForChatItem = props.direction ? directionClassName[props.direction] : directionClassName["received"];
      const convStyleClassName = props.layout === "bubbles" ? conversationLayoutClassName["bubbles"] : conversationLayoutClassName["list"];
      const containerClassName = `${className$4} ${directionClassNameForChatItem} ${convStyleClassName}`;
      const messageStatusClassName = props.status ? statusClassName$1[props.status] : statusClassName$1["rendered"];
      const messageDirectionClassName = props.direction ? directionClassName$1[props.direction] : directionClassName$1["received"];
      const messageClassName = `${className$5} ${messageStatusClassName} ${messageDirectionClassName}`;
      return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: containerClassName, children: [
        /* @__PURE__ */ jsxRuntime.jsx(ParticipantInfo, {}),
        isAssistantMessage && isStreamed && !isServerComponent && /* @__PURE__ */ jsxRuntime.jsx(
          ForwardRefStreamContainerComp,
          {
            uid: props.uid,
            status: props.status,
            ref: streamContainer,
            direction: props.direction,
            responseRenderer: props.messageOptions?.responseRenderer,
            markdownContainersController: props.markdownContainersController,
            markdownOptions: {
              syntaxHighlighter: props.messageOptions?.syntaxHighlighter,
              htmlSanitizer: props.messageOptions?.htmlSanitizer,
              markdownLinkTarget: props.messageOptions?.markdownLinkTarget,
              showCodeBlockCopyButton: props.messageOptions?.showCodeBlockCopyButton,
              skipStreamingAnimation: props.messageOptions?.skipStreamingAnimation,
              streamingAnimationSpeed: props.messageOptions?.streamingAnimationSpeed,
              waitTimeBeforeStreamCompletion: props.messageOptions?.waitTimeBeforeStreamCompletion,
              onStreamComplete: markdownStreamRenderedCallback
            }
          },
          "do-not-change"
        ),
        isAssistantMessage && isStreamed && isServerComponent && /* @__PURE__ */ jsxRuntime.jsx("div", { className: messageClassName, children: props.fetchedContent }),
        isAssistantMessage && !isStreamed && /* @__PURE__ */ jsxRuntime.jsx("div", { className: messageClassName, children: /* @__PURE__ */ jsxRuntime.jsx(AssistantBatchedMessage, {}) }),
        isUserMessage && /* @__PURE__ */ jsxRuntime.jsx("div", { className: messageClassName, children: /* @__PURE__ */ jsxRuntime.jsx(UserMessage, {}) })
      ] });
    };

    const useItemsRefs = (chatSegmentItems, serverComponentsRef, serverComponentsFunctionsRef, chatItemsRef) => {
      react.useEffect(() => {
        if (chatSegmentItems.length === 0) {
          chatItemsRef.clear();
          serverComponentsRef.current.clear();
          serverComponentsFunctionsRef.current.clear();
          return;
        }
        const itemsInRefsMap = new Set(chatItemsRef.keys());
        const itemsInSegments = new Set(chatSegmentItems.map((item) => item.uid));
        itemsInRefsMap.forEach((itemInRefsMap) => {
          if (!itemsInSegments.has(itemInRefsMap)) {
            chatItemsRef.delete(itemInRefsMap);
          }
        });
        const serverComponentsInRefsMap = new Set(serverComponentsRef.current.keys());
        serverComponentsInRefsMap.forEach((itemInRefsMap) => {
          if (!itemsInSegments.has(itemInRefsMap)) {
            serverComponentsRef.current.delete(itemInRefsMap);
            serverComponentsFunctionsRef.current.delete(itemInRefsMap);
          }
        });
      }, [chatSegmentItems]);
    };

    const avatarFromMessageAndPersona = (role, personaOptions) => {
      if (role === "assistant") {
        return personaOptions?.assistant?.avatar;
      }
      if (role === "user") {
        return personaOptions?.user?.avatar;
      }
      return void 0;
    };

    const isPrimitiveReactNodeType = (value) => {
      return typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null || value === void 0;
    };

    const ChatSegmentComp = function(props, ref) {
      const { chatSegment, containerRef } = props;
      const [completeOnInitialRender, setCompleteOnInitialRender] = react.useState(false);
      const chatItemsRef = react.useMemo(
        () => /* @__PURE__ */ new Map(),
        []
      );
      const chatItemsStreamingBuffer = react.useMemo(() => /* @__PURE__ */ new Map(), []);
      const serverComponentsRef = react.useRef(/* @__PURE__ */ new Map());
      const serverComponentsFunctionsRef = react.useRef(/* @__PURE__ */ new Map());
      useItemsRefs(chatSegment.items, serverComponentsRef, serverComponentsFunctionsRef, chatItemsRef);
      react.useImperativeHandle(ref, () => ({
        streamChunk: (chatItemId, chunk) => {
          const chatItemCompRef = chatItemsRef.get(chatItemId);
          if (chatItemCompRef?.current) {
            const streamChunk = chatItemCompRef.current.streamChunk;
            const chatItemStreamingBuffer = chatItemsStreamingBuffer.get(chatItemId) ?? [];
            chatItemStreamingBuffer.forEach((bufferedChunk) => {
              streamChunk(bufferedChunk);
            });
            chatItemsStreamingBuffer.delete(chatItemId);
            streamChunk(chunk);
          } else {
            const chatItemStreamingBuffer = chatItemsStreamingBuffer.get(chatItemId) ?? [];
            chatItemsStreamingBuffer.set(chatItemId, [...chatItemStreamingBuffer, chunk]);
          }
        },
        completeStream: (chatItemId) => {
          const chatItemCompRef = chatItemsRef.get(chatItemId);
          if (!chatItemCompRef?.current) {
            setCompleteOnInitialRender(true);
            return;
          }
          chatItemCompRef.current.completeStream();
          chatItemsRef.delete(chatItemId);
        },
        cancelStreams: () => {
          chatItemsStreamingBuffer.clear();
          chatItemsRef.forEach((ref2) => {
            ref2.current?.cancelStream();
          });
        }
      }), [
        // setCompleteOnInitialRender is not needed as a dependency here, even though it is used inside.
      ]);
      react.useEffect(() => {
        if (chatItemsStreamingBuffer.size > 0) {
          chatItemsStreamingBuffer.forEach((bufferedChunks, chatItemId) => {
            const chatItemCompRef = chatItemsRef.get(chatItemId);
            if (chatItemCompRef?.current) {
              bufferedChunks.forEach((chunk) => {
                chatItemCompRef?.current?.streamChunk(chunk);
              });
              chatItemsStreamingBuffer.delete(chatItemId);
              if (completeOnInitialRender) {
                chatItemCompRef.current.completeStream();
                setCompleteOnInitialRender(false);
              }
            }
          });
        }
      });
      const Loader = react.useMemo(() => {
        if (chatSegment.status !== "active") {
          return null;
        }
        return /* @__PURE__ */ jsxRuntime.jsx("div", { className: "nlux-chatSegment-loader-container", children: props.Loader });
      }, [chatSegment.status, props.Loader]);
      const ForwardRefChatItemComp = react.useMemo(() => react.forwardRef(ChatItemComp), []);
      const onMarkdownStreamRendered = react.useCallback((chatItemId) => {
        props.onMarkdownStreamRendered?.(chatSegment.uid, chatItemId);
      }, []);
      if (chatSegment.items.length === 0) {
        return null;
      }
      return /* @__PURE__ */ jsxRuntime.jsxs("div", { ref: containerRef, className: getChatSegmentClassName(chatSegment.status), children: [
        chatSegment.items.map((chatItem) => chatItemToReactNode(
          props,
          ForwardRefChatItemComp,
          chatSegment,
          chatItem,
          chatItemsRef,
          serverComponentsFunctionsRef,
          serverComponentsRef,
          onMarkdownStreamRendered
        )),
        Loader
      ] });
    };
    const chatItemToReactNode = function(props, ForwardRefChatItemComp, chatSegment, chatItem, chatItemsRef, serverComponentsFunctionsRef, serverComponentsRef, onMarkdownStreamRendered) {
      const isPartOfInitialSegment = props.isInitialSegment;
      let ref = chatItemsRef.get(chatItem.uid);
      if (!ref) {
        ref = react.createRef();
        chatItemsRef.set(chatItem.uid, ref);
      }
      let contentToUse = chatItem.content;
      let contentType = "text";
      if (typeof contentToUse === "function") {
        const functionRef = serverComponentsFunctionsRef.current.get(chatItem.uid);
        const serverComponentRef = serverComponentsRef.current.get(chatItem.uid);
        if (functionRef && serverComponentRef) {
          contentToUse = serverComponentRef;
          contentType = "server-component";
        } else {
          serverComponentsRef.current.delete(chatItem.uid);
          serverComponentsFunctionsRef.current.delete(chatItem.uid);
          try {
            const ContentToUseFC = contentToUse;
            contentToUse = /* @__PURE__ */ jsxRuntime.jsx(ContentToUseFC, {});
            if (!contentToUse || !react.isValidElement(contentToUse)) {
              throw new Error(`Invalid React element returned from the AI chat content function.`);
            } else {
              contentType = "server-component";
              serverComponentsRef.current.set(chatItem.uid, contentToUse);
              serverComponentsFunctionsRef.current.set(chatItem.uid, ContentToUseFC);
            }
          } catch (_error) {
            warn(
              `The type of the AI chat content is an invalid function.
If you're looking to render a React Server Components, please refer to docs.nlkit.com/nlux for more information.
`
            );
            return null;
          }
        }
      }
      if (chatItem.participantRole === "user") {
        if (chatItem.status !== "complete") {
          warnOnce(
            `User chat item should be always be in complete state \u2014 Current status: ${chatItem.status} \u2014 Segment UID: ${chatSegment.uid}`
          );
          return null;
        }
        if (!isPrimitiveReactNodeType(contentToUse)) {
          warnOnce(
            `User chat item should have primitive content (string, number, boolean, null) \u2014 Current content: ${JSON.stringify(contentToUse)} \u2014 Segment UID: ${chatSegment.uid}`
          );
          return null;
        }
        return /* @__PURE__ */ jsxRuntime.jsx(
          ForwardRefChatItemComp,
          {
            ref,
            uid: chatItem.uid,
            status: "complete",
            direction: "sent",
            contentType,
            dataTransferMode: "batch",
            fetchedContent: chatItem.content,
            markdownContainersController: props.markdownContainersController,
            layout: props.layout,
            messageOptions: props.messageOptions,
            isPartOfInitialSegment,
            name: participantNameFromRoleAndPersona(chatItem.participantRole, props.personaOptions),
            avatar: avatarFromMessageAndPersona(chatItem.participantRole, props.personaOptions),
            submitShortcutKey: props.submitShortcutKey,
            onPromptResubmit: (newPrompt) => props.onPromptResubmit(props.chatSegment.uid, chatItem.uid, newPrompt)
          },
          chatItem.uid
        );
      }
      if (chatItem.status === "complete") {
        if (chatItem.dataTransferMode === "stream") {
          const typedChatItem = chatItem;
          return /* @__PURE__ */ jsxRuntime.jsx(
            ForwardRefChatItemComp,
            {
              ref,
              uid: chatItem.uid,
              status: chatItem.status,
              direction: "received",
              contentType,
              dataTransferMode: chatItem.dataTransferMode,
              markdownContainersController: props.markdownContainersController,
              onMarkdownStreamRendered,
              streamedContent: contentToUse,
              streamedServerResponse: typedChatItem.serverResponse,
              layout: props.layout,
              messageOptions: props.messageOptions,
              isPartOfInitialSegment,
              name: participantNameFromRoleAndPersona(chatItem.participantRole, props.personaOptions),
              avatar: avatarFromMessageAndPersona(chatItem.participantRole, props.personaOptions)
            },
            chatItem.uid
          );
        } else {
          if (contentType === "text" && !isPrimitiveReactNodeType(contentToUse) && !props.messageOptions?.responseRenderer) {
            warn(
              `When the type of the AI chat content is not primitive (object or array), a custom renderer must be provided \u2014 Current content: ${JSON.stringify(contentToUse)} \u2014 Segment UID: ${chatSegment.uid}`
            );
            return null;
          }
          return /* @__PURE__ */ jsxRuntime.jsx(
            ForwardRefChatItemComp,
            {
              ref,
              uid: chatItem.uid,
              status: "complete",
              direction: "received",
              contentType,
              dataTransferMode: chatItem.dataTransferMode,
              markdownContainersController: props.markdownContainersController,
              onMarkdownStreamRendered,
              fetchedContent: contentToUse,
              fetchedServerResponse: chatItem.serverResponse,
              layout: props.layout,
              messageOptions: props.messageOptions,
              isPartOfInitialSegment,
              name: participantNameFromRoleAndPersona(chatItem.participantRole, props.personaOptions),
              avatar: avatarFromMessageAndPersona(chatItem.participantRole, props.personaOptions)
            },
            chatItem.uid
          );
        }
      }
      if (chatItem.status === "streaming") {
        const serverComponent = contentType === "server-component" && react.isValidElement(contentToUse) ? contentToUse : void 0;
        return /* @__PURE__ */ jsxRuntime.jsx(
          ForwardRefChatItemComp,
          {
            ref,
            uid: chatItem.uid,
            status: "streaming",
            direction: "received",
            contentType,
            dataTransferMode: chatItem.dataTransferMode,
            markdownContainersController: props.markdownContainersController,
            onMarkdownStreamRendered,
            fetchedContent: serverComponent,
            layout: props.layout,
            messageOptions: props.messageOptions,
            isPartOfInitialSegment,
            name: participantNameFromRoleAndPersona(chatItem.participantRole, props.personaOptions),
            avatar: avatarFromMessageAndPersona(chatItem.participantRole, props.personaOptions)
          },
          chatItem.uid
        );
      }
    };

    const useChatSegmentsController = function(segments) {
      const chatSegmentsRef = react.useMemo(
        () => /* @__PURE__ */ new Map(),
        []
      );
      react.useEffect(() => {
        if (segments.length === 0) {
          chatSegmentsRef.clear();
          return;
        }
        const itemsInRefsMap = new Set(chatSegmentsRef.keys());
        const itemsInSegments = new Set(segments.map((segment) => segment.uid));
        itemsInRefsMap.forEach((itemInRefsMap) => {
          if (!itemsInSegments.has(itemInRefsMap)) {
            chatSegmentsRef.delete(itemInRefsMap);
          }
        });
      }, [segments]);
      return {
        get: (uid) => chatSegmentsRef.get(uid)?.current,
        getRef: (uid) => chatSegmentsRef.get(uid),
        set: (uid, ref) => {
          chatSegmentsRef.set(uid, ref);
        },
        remove: (uid) => {
          chatSegmentsRef.delete(uid);
        }
      };
    };

    const useLastActiveSegment = function(segments, lastSegmentContainerRef, onLastActiveSegmentChange) {
      const lastActiveSegmentId = react.useMemo(() => {
        const lastSegment = segments.length > 0 ? segments[segments.length - 1] : void 0;
        return lastSegment?.status === "active" ? lastSegment.uid : void 0;
      }, [segments]);
      const lastCallbackData = react.useRef(void 0);
      react.useEffect(() => {
        if (!onLastActiveSegmentChange) {
          return;
        }
        const lastReportedData = lastCallbackData.current;
        if (lastActiveSegmentId === lastReportedData?.uid && lastSegmentContainerRef.current === lastReportedData?.div) {
          return;
        }
        const data = lastActiveSegmentId && lastSegmentContainerRef.current ? {
          uid: lastActiveSegmentId,
          div: lastSegmentContainerRef.current
        } : void 0;
        if (!data && !lastCallbackData.current) {
          return;
        }
        onLastActiveSegmentChange(data);
        lastCallbackData.current = data;
      });
    };

    const ConversationComp = function(props, ref) {
      const {
        segments,
        personaOptions,
        conversationOptions,
        onLastActiveSegmentChange
      } = props;
      const lastSegmentContainerRef = react.createRef();
      useLastActiveSegment(segments, lastSegmentContainerRef, onLastActiveSegmentChange);
      const segmentsController = useChatSegmentsController(segments);
      const conversationLayout = useConversationDisplayStyle(conversationOptions);
      react.useImperativeHandle(ref, () => ({
        streamChunk: (segmentId, messageId, chunk) => {
          const chatSegment = segmentsController.get(segmentId);
          chatSegment?.streamChunk(messageId, chunk);
        },
        completeStream: (segmentId, messageId) => {
          const chatSegment = segmentsController.get(segmentId);
          chatSegment?.completeStream(messageId);
        },
        cancelSegmentStreams: (segmentId) => {
          const chatSegment = segmentsController.get(segmentId);
          chatSegment?.cancelStreams();
        }
      }), []);
      const ForwardRefChatSegmentComp = react.useMemo(() => react.forwardRef(
        ChatSegmentComp
      ), []);
      return /* @__PURE__ */ jsxRuntime.jsx("div", { className: "nlux-chatSegments-container", children: segments.map((segment, index) => {
        const isLastSegment = index === segments.length - 1;
        const isInitialSegment = segment.uid === "initial";
        let ref2 = segmentsController.getRef(segment.uid);
        if (!ref2) {
          ref2 = react.createRef();
          segmentsController.set(segment.uid, ref2);
        }
        return /* @__PURE__ */ jsxRuntime.jsx(
          ForwardRefChatSegmentComp,
          {
            ref: ref2,
            containerRef: isLastSegment ? lastSegmentContainerRef : void 0,
            markdownContainersController: props.markdownContainersController,
            chatSegment: segment,
            isInitialSegment,
            layout: conversationLayout,
            personaOptions,
            messageOptions: props.messageOptions,
            Loader: props.Loader,
            submitShortcutKey: props.submitShortcutKey,
            onPromptResubmit: props.onPromptResubmit,
            onMarkdownStreamRendered: props.onMarkdownStreamRendered
          },
          segment.uid
        );
      }) });
    };

    const ConversationStarters = (props) => {
      const { onConversationStarterSelected } = props;
      return /* @__PURE__ */ jsxRuntime.jsx("div", { className: "nlux-comp-conversationStarters", children: props.items.map((conversationStarter, index) => /* @__PURE__ */ jsxRuntime.jsxs(
        "button",
        {
          className: "nlux-comp-conversationStarter btn btn-secondary btn-block",
          onClick: () => onConversationStarterSelected(conversationStarter),
          children: [
            /* @__PURE__ */ jsxRuntime.jsx(ConversationStarterIcon, { icon: conversationStarter.icon }),
            /* @__PURE__ */ jsxRuntime.jsx("span", { className: "nlux-comp-conversationStarter-prompt", children: conversationStarter.label ?? conversationStarter.prompt })
          ]
        },
        index
      )) });
    };
    const ConversationStarterIcon = ({
      icon
    }) => {
      if (!icon) {
        return null;
      }
      if (typeof icon === "string") {
        return /* @__PURE__ */ jsxRuntime.jsx("img", { src: icon, width: 16 });
      }
      return /* @__PURE__ */ jsxRuntime.jsx("div", { className: "nlux-comp-conversationStarter-icon-container", children: icon });
    };

    const getNluxSmallPngLogo = () => {
      return `data:image/png;base64,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`;
    };

    const greetingTextClassName = "nlux-comp-welcomeMessage-text";

    const className$3 = "nlux-comp-welcomeMessage";
    const personaNameClassName = "nlux-comp-welcomeMessage-personaName";

    const GreetingComp = (props) => {
      return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: className$3, children: [
        /* @__PURE__ */ jsxRuntime.jsx(
          AvatarComp,
          {
            avatar: props.avatar,
            name: props.name
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx("div", { className: personaNameClassName, children: props.name }),
        props.message && /* @__PURE__ */ jsxRuntime.jsx("div", { className: greetingTextClassName, children: props.message })
      ] });
    };
    const GreetingContainer = ({ children }) => {
      return /* @__PURE__ */ jsxRuntime.jsx("div", { className: className$3, children });
    };

    const DefaultGreetingComp = () => {
      const urlEncodedLogo = react.useMemo(() => getNluxSmallPngLogo(), []);
      return /* @__PURE__ */ jsxRuntime.jsx(GreetingComp, { avatar: urlEncodedLogo, name: "" });
    };

    const LaunchPad = (props) => {
      const {
        segments,
        personaOptions,
        conversationOptions,
        userDefinedGreeting
      } = props;
      const hasMessages = react.useMemo(() => segments.some((segment) => segment.items.length > 0), [segments]);
      const showDefaultGreeting = react.useMemo(
        () => !userDefinedGreeting && !hasMessages && personaOptions?.assistant === void 0 && conversationOptions?.showWelcomeMessage !== false,
        [
          hasMessages,
          personaOptions?.assistant,
          conversationOptions?.showWelcomeMessage,
          userDefinedGreeting
        ]
      );
      const showGreetingFromPersonaOptions = react.useMemo(
        () => !userDefinedGreeting && !hasMessages && personaOptions?.assistant !== void 0 && conversationOptions?.showWelcomeMessage !== false,
        [
          userDefinedGreeting,
          hasMessages,
          personaOptions?.assistant,
          conversationOptions?.showWelcomeMessage
        ]
      );
      const showConversationStarters = react.useMemo(
        () => !hasMessages && conversationOptions?.conversationStarters && conversationOptions?.conversationStarters.length > 0,
        [hasMessages, conversationOptions?.conversationStarters]
      );
      const showUserDefinedGreeting = react.useMemo(
        () => userDefinedGreeting !== void 0 && conversationOptions?.showWelcomeMessage !== false,
        [userDefinedGreeting]
      );
      react.useEffect(() => {
        if (userDefinedGreeting && conversationOptions?.showWelcomeMessage === false) {
          warnOnce(
            "Configuration conflict: The greeting UI override provided via <AiChatUI.Greeting> will not be shown because conversationOptions.showWelcomeMessage is set to false."
          );
        }
      }, [
        conversationOptions?.showWelcomeMessage,
        userDefinedGreeting
      ]);
      const showEmptyGreeting = !showDefaultGreeting && !showGreetingFromPersonaOptions && !showUserDefinedGreeting && !hasMessages;
      return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
        showDefaultGreeting && /* @__PURE__ */ jsxRuntime.jsx(DefaultGreetingComp, {}),
        showGreetingFromPersonaOptions && /* @__PURE__ */ jsxRuntime.jsx(
          GreetingComp,
          {
            name: personaOptions.assistant.name,
            avatar: personaOptions.assistant.avatar,
            message: personaOptions.assistant.tagline
          }
        ),
        showUserDefinedGreeting && /* @__PURE__ */ jsxRuntime.jsx(GreetingContainer, { children: userDefinedGreeting }),
        showEmptyGreeting && /* @__PURE__ */ jsxRuntime.jsx(GreetingContainer, { children: null }),
        /* @__PURE__ */ jsxRuntime.jsx("div", { className: "nlux-conversationStarters-container", children: showConversationStarters && /* @__PURE__ */ jsxRuntime.jsx(
          ConversationStarters,
          {
            items: conversationOptions.conversationStarters ?? [],
            onConversationStarterSelected: props.onConversationStarterSelected
          }
        ) })
      ] });
    };

    const adapterParamToUsableAdapter = (anAdapterOrAdapterBuilder) => {
      const adapterAsAny = anAdapterOrAdapterBuilder;
      if (typeof adapterAsAny?.create === "function") {
        const adapterBuilder = adapterAsAny;
        return adapterBuilder.create();
      }
      if (typeof adapterAsAny?.batchText === "function" || typeof adapterAsAny?.streamText === "function" || typeof adapterAsAny?.streamServerComponent === "function") {
        return anAdapterOrAdapterBuilder;
      }
      warn("Unable to determine the type of the adapter! Missing batchText or streamText method.");
      return void 0;
    };

    const reactPropsToCorePropsInEvents = (props) => {
      const result = {};
      const keys = Object.keys(props);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (key === "personaOptions" || key === "messageOptions" || key === "adapter" || key === "events") {
          continue;
        }
        Object.assign(result, { [key]: props[key] });
      }
      if (props.personaOptions) {
        result.personaOptions = {};
        if (props.personaOptions.assistant) {
          result.personaOptions.assistant = {
            name: props.personaOptions.assistant.name,
            avatar: typeof props.personaOptions.assistant.avatar === "string" ? props.personaOptions.assistant.avatar : "<REACT ELEMENT />",
            tagline: props.personaOptions.assistant.tagline
          };
        }
        if (props.personaOptions.user) {
          result.personaOptions.user = {
            name: props.personaOptions.user.name,
            avatar: typeof props.personaOptions.user.avatar === "string" ? props.personaOptions.user.avatar : "<REACT ELEMENT />"
          };
        }
      }
      if (props.messageOptions) {
        result.messageOptions = {
          ...props.messageOptions,
          responseRenderer: props.messageOptions.responseRenderer ? () => null : void 0,
          promptRenderer: props.messageOptions.promptRenderer ? () => null : void 0
        };
      }
      if (props.conversationOptions?.conversationStarters) {
        result.conversationOptions = {
          ...props.conversationOptions,
          conversationStarters: props.conversationOptions.conversationStarters.map((starter) => ({
            ...starter,
            icon: starter.icon ? "<REACT ELEMENT />" : void 0
          }))
        };
      }
      return result;
    };

    const usePreDestroyEventTrigger = (props, segments) => {
      const getChatHistoryRef = react.useRef();
      const preDestroyCallbackRef = react.useRef();
      react.useEffect(() => {
        getChatHistoryRef.current = () => {
          const result = [];
          segments.forEach((segment) => {
            if (!segment.items || segment.items.length === 0) {
              return;
            }
            segment.items.forEach((item) => {
              if (item.status !== "complete") {
                return;
              }
              if (item.participantRole === "assistant") {
                result.push({ role: "assistant", message: item.content });
                return;
              }
              if (item.participantRole === "user") {
                result.push({ role: "user", message: item.content });
              }
            });
          });
          return result;
        };
      }, [segments]);
      react.useEffect(() => {
        preDestroyCallbackRef.current = props.events?.preDestroy;
      }, [props.events?.preDestroy]);
      react.useEffect(() => {
        return () => {
          const preDestroyCallback = preDestroyCallbackRef.current;
          if (!preDestroyCallback) {
            return;
          }
          const coreProps = reactPropsToCorePropsInEvents(props);
          const conversationHistory = getChatHistoryRef.current?.() ?? [];
          const preDestroyEvent = {
            aiChatProps: coreProps,
            conversationHistory
          };
          preDestroyCallback(preDestroyEvent);
          getChatHistoryRef.current = void 0;
        };
      }, []);
    };

    const useReadyEventTrigger = (props) => {
      react.useEffect(() => {
        const readyCallback = props.events?.ready;
        if (!readyCallback) {
          return;
        }
        const coreProps = reactPropsToCorePropsInEvents(props);
        const readyEvent = {
          aiChatProps: coreProps
        };
        readyCallback(readyEvent);
      }, []);
    };

    const useAiChatStyle = (displayOptions) => {
      return react.useMemo(() => {
        const result = {
          minWidth: "280px",
          minHeight: "280px"
        };
        if (displayOptions?.width) {
          result.width = displayOptions.width;
        }
        if (displayOptions?.height) {
          result.height = displayOptions.height;
        }
        return result;
      }, [displayOptions?.width, displayOptions?.height]);
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

    const defaultAutoScrollOption = true;
    const useAutoScrollController = (conversationContainerRef, autoScroll) => {
      const [autoScrollController, setAutoScrollController] = react.useState();
      const [conversationContainer, setConversationContainer] = react.useState();
      const autoScrollControllerRef = react.useRef(autoScrollController);
      const autoScrollPropRef = react.useRef(autoScroll);
      react.useEffect(() => {
        const currentConversationContainer = conversationContainerRef.current || void 0;
        if (currentConversationContainer !== conversationContainer) {
          setConversationContainer(currentConversationContainer);
        }
      });
      react.useEffect(() => {
        if (!conversationContainer) {
          if (autoScrollControllerRef.current) {
            autoScrollControllerRef.current.destroy();
            setAutoScrollController(void 0);
            autoScrollControllerRef.current = void 0;
          }
          return;
        }
        if (autoScrollControllerRef.current) {
          autoScrollControllerRef.current.updateConversationContainer(conversationContainer);
        } else {
          autoScrollControllerRef.current = createAutoScrollController(
            conversationContainer,
            autoScrollPropRef.current ?? defaultAutoScrollOption
          );
          setAutoScrollController(autoScrollControllerRef.current);
        }
      }, [conversationContainer]);
      react.useEffect(() => {
        autoScrollPropRef.current = autoScroll;
        if (autoScrollControllerRef.current) {
          autoScrollControllerRef.current.updateProps({
            autoScroll: autoScroll ?? defaultAutoScrollOption
          });
        }
      }, [autoScroll]);
      return autoScrollController;
    };

    const useCancelLastMessage = function(newSegments, cancelledSegmentIds, cancelledMessageIds, setChatSegments, setCancelledSegmentIds, setCancelledMessageIds, conversationRef, setComposerStatus) {
      return react.useCallback(() => {
        const lastSegment = newSegments.length > 0 ? newSegments[newSegments.length - 1] : void 0;
        if (lastSegment?.status === "active") {
          setChatSegments(newSegments.slice(0, -1));
          setCancelledSegmentIds([...cancelledSegmentIds, lastSegment.uid]);
          setCancelledMessageIds([
            ...cancelledMessageIds,
            ...lastSegment.items.map((item) => item.uid)
          ]);
          conversationRef.current?.cancelSegmentStreams(lastSegment.uid);
        }
        setComposerStatus("typing");
      }, [
        newSegments,
        cancelledSegmentIds,
        cancelledMessageIds,
        setChatSegments,
        setCancelledSegmentIds,
        setCancelledMessageIds,
        conversationRef,
        setComposerStatus
      ]);
    };

    const useLastActiveSegmentChangeHandler = (autoScrollController, lastActiveSegmentIdRef) => {
      return react.useCallback((data) => {
        if (!autoScrollController) {
          return;
        }
        if (data) {
          lastActiveSegmentIdRef.current = data.uid;
          autoScrollController.handleNewChatSegmentAdded(data.uid, data.div);
        }
      }, [autoScrollController]);
    };

    const primitivesContext = react.createContext({});
    const usePrimitivesContext = function(contextData) {
      const [
        contextState,
        setContextState
      ] = react.useState(contextData);
      react.useEffect(() => {
        setContextState(contextData);
      }, [
        // Right now, the only primitive relying on contextData is <Markdown />
        contextData?.messageOptions?.htmlSanitizer,
        contextData?.messageOptions?.syntaxHighlighter,
        contextData?.messageOptions?.markdownLinkTarget,
        contextData?.messageOptions?.showCodeBlockCopyButton,
        contextData?.messageOptions?.skipStreamingAnimation,
        contextData?.messageOptions?.streamingAnimationSpeed,
        contextData?.messageOptions?.waitTimeBeforeStreamCompletion,
        contextData?.messageOptions?.responseRenderer,
        contextData?.messageOptions?.promptRenderer
      ]);
      const PrimitivesContextProvider = react.useMemo(
        () => ({ children }) => {
          return /* @__PURE__ */ jsxRuntime.jsx(primitivesContext.Provider, { value: contextState, children });
        },
        [contextState]
      );
      return {
        PrimitivesContextProvider,
        primitivesContext
      };
    };

    const useResubmitPromptHandler = (initialSegment, setInitialSegment, chatSegments, setChatSegments, setPrompt, setComposerStatus) => {
      return react.useCallback((segmentId, messageId, newPrompt) => {
        if (segmentId === "initial" && initialSegment) {
          const newInitialSegmentItems = [];
          for (const item of initialSegment.items) {
            if (item.uid !== messageId) {
              newInitialSegmentItems.push(item);
            } else {
              break;
            }
          }
          const newInitialSegment = {
            ...initialSegment,
            items: newInitialSegmentItems
          };
          setInitialSegment(newInitialSegment);
          setChatSegments([]);
          setPrompt(newPrompt);
          setComposerStatus("submitting-edit");
          return;
        }
        const segmentIndex = chatSegments.findIndex((segment) => segment.uid === segmentId);
        const newChatSegments = chatSegments.slice(0, segmentIndex);
        setChatSegments(newChatSegments);
        setPrompt(newPrompt);
        setComposerStatus("submitting-edit");
      }, [
        chatSegments,
        setChatSegments,
        initialSegment,
        setInitialSegment,
        setPrompt,
        setComposerStatus
      ]);
    };

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

    const useAdapterExtras = (aiChatProps, chatSegments, historyPayloadSize) => {
      return react.useMemo(() => {
        const allHistory = chatSegmentsToChatItems(chatSegments);
        const conversationHistory = historyPayloadSize === "max" || historyPayloadSize === void 0 ? allHistory : historyPayloadSize > 0 ? allHistory.slice(-historyPayloadSize) : void 0;
        return {
          aiChatProps: reactPropsToCorePropsInEvents(aiChatProps),
          conversationHistory
        };
      }, [aiChatProps, chatSegments, historyPayloadSize]);
    };

    const useSubmitPromptHandler = (props) => {
      const {
        aiChatProps,
        adapterToUse,
        prompt: promptTyped,
        composerOptions,
        showException,
        initialSegment,
        newSegments,
        cancelledSegmentIds,
        cancelledMessageIds,
        setChatSegments,
        setComposerStatus,
        setPrompt,
        conversationRef
      } = props;
      const hasValidInput = react.useMemo(() => promptTyped.length > 0, [promptTyped]);
      const promptTypedRef = react.useRef(promptTyped);
      promptTypedRef.current = promptTyped;
      const domToReactRef = react.useRef({
        newSegments,
        cancelledSegmentIds,
        cancelledMessageIds,
        setChatSegments,
        setComposerStatus,
        showException,
        setPrompt
      });
      const callbackEvents = react.useRef({});
      react.useEffect(() => {
        domToReactRef.current = {
          newSegments,
          cancelledSegmentIds,
          cancelledMessageIds,
          setChatSegments,
          setComposerStatus,
          showException,
          setPrompt
        };
      }, [
        newSegments,
        cancelledSegmentIds,
        cancelledMessageIds,
        setChatSegments,
        setComposerStatus,
        showException,
        setPrompt
      ]);
      const adapterExtras = useAdapterExtras(
        aiChatProps,
        initialSegment ? [initialSegment, ...newSegments] : newSegments,
        aiChatProps.conversationOptions?.historyPayloadSize
      );
      react.useEffect(() => {
        callbackEvents.current = aiChatProps.events || {};
      }, [aiChatProps.events]);
      return react.useCallback(
        () => {
          if (!adapterToUse) {
            warn("No valid adapter was provided to AiChat component");
            return;
          }
          if (!hasValidInput) {
            return;
          }
          if (composerOptions?.disableSubmitButton) {
            return;
          }
          setComposerStatus("submitting-prompt");
          const promptToSubmit = promptTyped;
          const streamedMessageIds = /* @__PURE__ */ new Set();
          const adapterBridge = isStandardChatAdapter(
            adapterToUse
          ) ? adapterToUse : adapterToUse.streamServerComponent ? {
            streamServerComponent: adapterToUse.streamServerComponent
          } : {
            batchText: adapterToUse.batchText,
            streamText: adapterToUse.streamText
          };
          const {
            segment: chatSegment,
            observable: chatSegmentObservable
          } = submitPrompt(
            promptToSubmit,
            adapterBridge,
            adapterExtras
          );
          if (chatSegment.status === "error") {
            warn("Error occurred while submitting prompt");
            showException("Error occurred while submitting prompt");
            setComposerStatus("typing");
            if (promptTypedRef.current === "") {
              setPrompt(promptToSubmit);
            }
            return;
          }
          const handleSegmentItemReceived = (item) => {
            const currentChatSegments = domToReactRef.current.newSegments;
            const newChatSegments = currentChatSegments.map(
              (currentChatSegment) => {
                if (currentChatSegment.uid !== chatSegmentObservable.segmentId) {
                  return currentChatSegment;
                }
                return {
                  ...currentChatSegment,
                  items: [
                    ...currentChatSegment.items,
                    { ...item }
                  ]
                };
              }
            );
            domToReactRef.current.setChatSegments(newChatSegments);
          };
          chatSegmentObservable.on("userMessageReceived", (userMessage) => {
            if (domToReactRef.current?.cancelledMessageIds.includes(userMessage.uid)) {
              return;
            }
            handleSegmentItemReceived(userMessage);
            if (callbackEvents.current?.messageSent) {
              callbackEvents.current.messageSent({
                uid: userMessage.uid,
                message: userMessage.content
              });
            }
          });
          chatSegmentObservable.on("aiMessageStreamStarted", (aiStreamedMessage) => {
            if (domToReactRef.current?.cancelledMessageIds.includes(aiStreamedMessage.uid)) {
              return;
            }
            handleSegmentItemReceived(aiStreamedMessage);
            domToReactRef.current.setComposerStatus("waiting");
            if (promptTypedRef.current === promptToSubmit) {
              domToReactRef.current.setPrompt("");
            }
            streamedMessageIds.add(aiStreamedMessage.uid);
            if (callbackEvents.current?.messageStreamStarted) {
              callbackEvents.current.messageStreamStarted({ uid: aiStreamedMessage.uid });
            }
          });
          chatSegmentObservable.on("aiServerComponentStreamStarted", (aiServerComponentMessage) => {
            if (domToReactRef.current?.cancelledMessageIds.includes(aiServerComponentMessage.uid)) {
              return;
            }
            handleSegmentItemReceived(aiServerComponentMessage);
            domToReactRef.current.setComposerStatus("waiting");
            if (promptTypedRef.current === promptToSubmit) {
              domToReactRef.current.setPrompt("");
            }
            streamedMessageIds.add(aiServerComponentMessage.uid);
            if (callbackEvents.current?.serverComponentStreamStarted) {
              callbackEvents.current?.serverComponentStreamStarted({ uid: aiServerComponentMessage.uid });
            }
          });
          chatSegmentObservable.on("aiServerComponentStreamed", (streamedServerComponent) => {
            if (domToReactRef.current?.cancelledMessageIds.includes(streamedServerComponent.uid)) {
              return;
            }
            if (callbackEvents.current?.serverComponentRendered && !domToReactRef.current.cancelledMessageIds.includes(streamedServerComponent.uid)) {
              callbackEvents.current?.serverComponentRendered({ uid: streamedServerComponent.uid });
            }
          });
          chatSegmentObservable.on("aiMessageReceived", (aiMessage) => {
            if (domToReactRef.current?.cancelledMessageIds.includes(aiMessage.uid)) {
              return;
            }
            const currentChatSegments = domToReactRef.current.newSegments;
            const newChatSegments = currentChatSegments.map(
              (currentChatSegment) => {
                if (currentChatSegment.uid !== chatSegmentObservable.segmentId) {
                  return currentChatSegment;
                }
                return { ...currentChatSegment, items: [...currentChatSegment.items, { ...aiMessage }] };
              }
            );
            domToReactRef.current.setChatSegments(newChatSegments);
            if (callbackEvents.current?.messageReceived) {
              callbackEvents.current.messageReceived({
                uid: aiMessage.uid,
                message: aiMessage.content
              });
            }
          });
          chatSegmentObservable.on("complete", (completeChatSegment) => {
            if (domToReactRef.current?.cancelledMessageIds.includes(completeChatSegment.uid)) {
              return;
            }
            domToReactRef.current.setComposerStatus("typing");
            const currentChatSegments = domToReactRef.current.newSegments;
            const newChatSegments = currentChatSegments.map(
              (currentChatSegment) => {
                if (currentChatSegment.uid !== chatSegmentObservable.segmentId) {
                  return currentChatSegment;
                }
                return { ...completeChatSegment };
              }
            );
            domToReactRef.current.setChatSegments(newChatSegments);
            if (promptTypedRef.current === promptToSubmit) {
              setPrompt("");
            }
            if (streamedMessageIds.size > 0) {
              streamedMessageIds.forEach((messageId) => {
                requestAnimationFrame(() => {
                  conversationRef.current?.completeStream(chatSegmentObservable.segmentId, messageId);
                });
              });
              streamedMessageIds.clear();
            }
          });
          chatSegmentObservable.on("aiChunkReceived", ({ messageId, chunk }) => {
            if (domToReactRef.current?.cancelledMessageIds.includes(messageId)) {
              return;
            }
            conversationRef.current?.streamChunk(chatSegment.uid, messageId, chunk);
          });
          chatSegmentObservable.on("aiMessageStreamed", (streamedMessage) => {
            if (domToReactRef.current?.cancelledMessageIds.includes(streamedMessage.uid)) {
              return;
            }
            if (callbackEvents.current?.messageReceived) {
              callbackEvents.current?.messageReceived({
                uid: streamedMessage.uid,
                // In streamed messages, the AiMsg is always a string
                message: streamedMessage.content
              });
            }
          });
          chatSegmentObservable.on("error", (errorId, errorObject) => {
            const parts = domToReactRef.current.newSegments;
            const newParts = parts.filter((part) => part.uid !== chatSegment.uid);
            const errorMessage = NLErrors[errorId];
            domToReactRef.current.setChatSegments(newParts);
            domToReactRef.current.setComposerStatus("typing");
            domToReactRef.current.showException(errorMessage);
            if (promptTypedRef.current === "") {
              setPrompt(promptToSubmit);
            }
            if (callbackEvents.current?.error) {
              callbackEvents.current.error({
                errorId,
                message: errorMessage,
                errorObject
              });
            }
          });
          domToReactRef.current.setChatSegments([
            ...domToReactRef.current.newSegments,
            chatSegment
          ]);
        },
        [
          promptTyped,
          adapterToUse,
          adapterExtras,
          showException,
          domToReactRef,
          composerOptions?.disableSubmitButton
        ]
      );
    };

    const className$2 = "nlux-comp-messageLoader";

    const LoaderComp = () => {
      return /* @__PURE__ */ jsxRuntime.jsx("div", { className: className$2, children: /* @__PURE__ */ jsxRuntime.jsx("div", { className: "nlux-comp-loaderContainer", children: /* @__PURE__ */ jsxRuntime.jsx("span", { className: "spinning-loader" }) }) });
    };

    const Greeting = (props) => {
      return /* @__PURE__ */ jsxRuntime.jsx(jsxRuntime.Fragment, { children: props.children });
    };

    const Loader = (props) => {
      return /* @__PURE__ */ jsxRuntime.jsx(jsxRuntime.Fragment, { children: props.children });
    };

    const Composer = (props) => {
      return /* @__PURE__ */ jsxRuntime.jsx(jsxRuntime.Fragment, { children: props.children });
    };

    const AiChatUI = {
      Loader,
      Greeting,
      Composer
    };

    const useUiOverrides = (props) => {
      const possibleUiOverrides = react.useMemo(() => {
        if (!props.children) {
          return [];
        }
        return Array.isArray(props.children) ? props.children : [props.children];
      }, [props.children]);
      const Loader = react.useMemo(() => {
        if (possibleUiOverrides.length === 0) {
          return /* @__PURE__ */ jsxRuntime.jsx(LoaderComp, {});
        }
        const loaderOverride = possibleUiOverrides.find((child) => child.type === AiChatUI.Loader);
        return loaderOverride || /* @__PURE__ */ jsxRuntime.jsx(LoaderComp, {});
      }, [possibleUiOverrides]);
      const Greeting = react.useMemo(() => {
        if (possibleUiOverrides.length === 0) {
          return void 0;
        }
        return possibleUiOverrides.find((child) => child.type === AiChatUI.Greeting);
      }, [possibleUiOverrides]);
      return {
        Loader,
        Greeting
      };
    };

    const usMarkdownContainers = () => {
      const streamingDomElementsByMessageId = {};
      const victimMessageIds = /* @__PURE__ */ new Set();
      return react.useMemo(() => ({
        getStreamingDomElement: (messageId) => {
          if (victimMessageIds.has(messageId)) {
            victimMessageIds.delete(messageId);
          }
          if (streamingDomElementsByMessageId[messageId] === void 0) {
            const newStreamContainer = document.createElement("div");
            newStreamContainer.setAttribute("nlux-message-id", messageId);
            newStreamContainer.className = "nlux-markdown-container";
            streamingDomElementsByMessageId[messageId] = newStreamContainer;
          }
          return streamingDomElementsByMessageId[messageId];
        },
        deleteStreamingDomElement: (messageId) => {
          victimMessageIds.add(messageId);
          setTimeout(() => {
            victimMessageIds.forEach((victimMessageId) => {
              if (streamingDomElementsByMessageId[victimMessageId]) {
                streamingDomElementsByMessageId[victimMessageId].remove();
                delete streamingDomElementsByMessageId[victimMessageId];
              }
            });
            victimMessageIds.clear();
          }, 1e3);
        }
      }), []);
    };

    const statusClassName = {
      typing: "nlux-composer--typing",
      "submitting-prompt": "nlux-composer--submitting",
      "submitting-conversation-starter": "nlux-composer--submitting",
      waiting: "nlux-composer--waiting"
    };

    const className$1 = "nlux-comp-cancelIcon";

    const CancelIconComp = () => {
      return /* @__PURE__ */ jsxRuntime.jsx("div", { className: className$1, children: /* @__PURE__ */ jsxRuntime.jsx("div", { className: "nlux-comp-cancelIcon-container" }) });
    };

    const className = "nlux-comp-sendIcon";

    const SendIconComp = () => {
      return /* @__PURE__ */ jsxRuntime.jsx("div", { className: className, children: /* @__PURE__ */ jsxRuntime.jsx("div", { className: "nlux-comp-sendIcon-container" }) });
    };

    const initialState = {
      selectContext: false,
      currentSelection: "",
      files: []
    };
    const stripFileName = (file) => {
      return file.split("/").pop();
    };
    function promptReducer(state, action) {
      switch (action.type) {
        case "CURRENT_FILE":
          return {
            ...state,
            files: Array.isArray(state.files) ? [...state.files, stripFileName(action.payload.file) || ""] : [stripFileName(action.payload.file) || ""],
            currentSelection: action.payload.selection,
            selectContext: action.payload.selectContext
          };
        case "ALL_OPENED_FILES":
          return {
            ...state,
            files: action.payload.files.map((file) => stripFileName(file) || ""),
            currentSelection: action.payload.selection,
            selectContext: action.payload.selectContext
          };
        case "WORKSPACE":
          return { ...state, files: "@workspace", currentSelection: "workspace", selectContext: action.payload.selectContext };
        case "ADD_CONTEXT":
          return { ...state, selectContext: action.payload };
        case "REMOVE_FILE":
          return {
            ...state,
            files: Array.isArray(state.files) ? state.files.filter((file) => file !== action.payload) : []
          };
        case "REMOVE_ALL_FILES":
          return { ...state, files: [], currentSelection: "", selectContext: false };
        default:
          return state;
      }
    }

    const submittingPromptStatuses = [
      "submitting-prompt",
      "submitting-edit",
      "submitting-conversation-starter",
      "submitting-external-message"
    ];
    function RenderIf({ condition, children }) {
      return condition ? children : null;
    }
    const RemixComposerComp = (props) => {
      const compClassNameFromStats = statusClassName[props.status] || "";
      const className = `${statusClassName} ${compClassNameFromStats}`;
      const disableTextarea = submittingPromptStatuses.includes(props.status);
      const disableButton = !props.hasValidInput || props.status === "waiting" || submittingPromptStatuses.includes(
        props.status
      );
      const showSendIcon = props.status === "typing" || props.status === "waiting";
      const hideCancelButton = props.hideStopButton === true;
      const showCancelButton = !hideCancelButton && (submittingPromptStatuses.includes(props.status) || props.status === "waiting");
      const [promptState, promptDispatch] = react.useReducer(promptReducer, initialState);
      const removeFile = async (file) => {
        await props.addContextFiles("remixAI", "setContextFiles", { context: "none" });
        promptDispatch({ type: "REMOVE_FILE", payload: file });
      };
      const removeAllFiles = async () => {
        await props.addContextFiles("remixAI", "setContextFiles", { context: "none" });
        promptDispatch({ type: "REMOVE_ALL_FILES" });
      };
      const textareaRef = react.useRef(null);
      react.useEffect(() => {
        if (props.status === "typing" && props.autoFocus && textareaRef.current) {
          textareaRef.current.focus();
        }
      }, [props.status, props.autoFocus, textareaRef.current]);
      const handleChange = react.useMemo(() => (e) => {
        props.onChange?.(e.target.value);
      }, [props.onChange]);
      const handleSubmit = react.useMemo(() => () => {
        props.onSubmit?.();
      }, [props.onSubmit]);
      const handleKeyDown = react.useMemo(() => (e) => {
        if (isSubmitShortcutKey(e, props.submitShortcut)) {
          e.preventDefault();
          handleSubmit();
        }
      }, [handleSubmit, props.submitShortcut]);
      react.useEffect(() => {
        if (!textareaRef.current) {
          return;
        }
        const adjustHeight = () => {
          const textarea = textareaRef.current;
          if (textarea) {
            textarea.style.height = "auto";
            textarea.style.height = `${textarea.scrollHeight}px`;
          }
        };
        textareaRef.current.addEventListener("input", adjustHeight);
        return () => {
          textareaRef.current?.removeEventListener("input", adjustHeight);
        };
      }, [textareaRef.current]);
      return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: `${className} w-100`, id: "inner-composer-container", children: [
        promptState.selectContext && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "d-flex flex-column border w-100 px-3 pt-3 align-items-start justify-content-center align-self-start", children: [
          /* @__PURE__ */ jsxRuntime.jsx("div", { className: "text-uppercase mb-2 ml-2", children: "Add context files" }),
          /* @__PURE__ */ jsxRuntime.jsxs("ul", { className: "list-unstyled", children: [
            /* @__PURE__ */ jsxRuntime.jsx("li", { children: /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "d-flex ml-2 custom-control custom-radio", children: [
              /* @__PURE__ */ jsxRuntime.jsx("input", { className: "custom-control-input", type: "radio", name: "feature", value: "currentFile", id: "currentFile", onChange: async () => {
                await props.addContextFiles("remixAI", "setContextFiles", { context: "currentFile" });
                const result = await props.addContextFiles("fileManager", "getCurrentFile", {});
                promptDispatch({ type: "CURRENT_FILE", payload: {
                  file: result,
                  selection: "currentFile",
                  selectContext: !promptState.selectContext
                } });
              }, checked: promptState.currentSelection === "currentFile" }),
              /* @__PURE__ */ jsxRuntime.jsx("label", { className: "form-check-label custom-control-label", htmlFor: "currentFile", "data-id": "currentFile-context-option", children: "Current file" })
            ] }) }),
            /* @__PURE__ */ jsxRuntime.jsx("li", { children: /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "d-flex ml-2 custom-control custom-radio", children: [
              /* @__PURE__ */ jsxRuntime.jsx("input", { className: "custom-control-input", type: "radio", name: "feature", value: "allOpenedFiles", id: "allOpenedFiles", onChange: async () => {
                await props.addContextFiles("remixAI", "setContextFiles", { context: "openedFiles" });
                const result = await props.addContextFiles("fileManager", "getOpenedFiles", {});
                promptDispatch({ type: "ALL_OPENED_FILES", payload: { files: Object.keys(result), selection: "allOpenedFiles", selectContext: !promptState.selectContext } });
              }, checked: promptState.currentSelection === "allOpenedFiles" }),
              /* @__PURE__ */ jsxRuntime.jsx("label", { className: "form-check-label custom-control-label", htmlFor: "allOpenedFiles", "data-id": "allOpenedFiles-context-option", children: "All opened files" })
            ] }) }),
            /* @__PURE__ */ jsxRuntime.jsx("li", { children: /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "d-flex ml-2 custom-control custom-radio", children: [
              /* @__PURE__ */ jsxRuntime.jsx(
                "input",
                {
                  className: "custom-control-input",
                  type: "radio",
                  name: "workspace-context",
                  value: promptState.currentSelection,
                  id: "workspace",
                  onChange: async () => {
                    await props.addContextFiles("remixAI", "setContextFiles", { context: "workspace" });
                    promptDispatch({ type: "WORKSPACE", payload: { files: "@workspace", selection: "workspace", selectContext: !promptState.selectContext } });
                  },
                  checked: promptState.currentSelection === "workspace"
                }
              ),
              /* @__PURE__ */ jsxRuntime.jsx("label", { className: "form-check-label custom-control-label", htmlFor: "workspace", "data-id": "workspace-context-option", children: "Workspace" })
            ] }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntime.jsxs("div", { id: "composer-textarea-holder", className: "bg-light d-flex flex-column w-100 p-3", children: [
          /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "mb-3", children: [
            /* @__PURE__ */ jsxRuntime.jsx(
              "button",
              {
                className: "btn bg-dark btn-sm text-secondary",
                onClick: () => promptDispatch({ type: "ADD_CONTEXT", payload: !promptState.selectContext }),
                children: "@ Add context"
              }
            ),
            /* @__PURE__ */ jsxRuntime.jsx(
              "button",
              {
                className: "btn bg-dark ml-2 btn-sm text-secondary",
                onClick: () => props.pluginMethodCall("templateSelection", "aiWorkspaceGenerate"),
                children: "@ Generate Workspace"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "mb-3 w-100", children: [
            /* @__PURE__ */ jsxRuntime.jsx(
              "textarea",
              {
                tabIndex: 0,
                ref: textareaRef,
                disabled: disableTextarea,
                placeholder: props.placeholder ?? "Ask me anything, use button to add context...",
                value: props.prompt,
                onChange: handleChange,
                onKeyDown: handleKeyDown,
                "aria-label": props.placeholder,
                rows: 2,
                className: "form-control bg-light"
              }
            ),
            /* @__PURE__ */ jsxRuntime.jsxs("div", { id: "composer-buttons", className: "d-none", children: [
              !showCancelButton && /* @__PURE__ */ jsxRuntime.jsxs(
                "button",
                {
                  tabIndex: 0,
                  disabled: disableButton,
                  onClick: () => props.onSubmit(),
                  "aria-label": "Send",
                  children: [
                    showSendIcon && /* @__PURE__ */ jsxRuntime.jsx(SendIconComp, {}),
                    !showSendIcon && props.Loader
                  ]
                }
              ),
              showCancelButton && /* @__PURE__ */ jsxRuntime.jsx(
                "button",
                {
                  tabIndex: 0,
                  onClick: props.onCancel,
                  "aria-label": "Cancel",
                  children: /* @__PURE__ */ jsxRuntime.jsx(CancelIconComp, {})
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx(RenderIf, { condition: promptState.files.length > 0, children: /* @__PURE__ */ jsxRuntime.jsxs("div", { id: "context-holder", className: "d-flex gap-2 text-white justify-content-start align-items-center flex-wrap text-success py-3 border-warning overflow-y-scroll", children: [
            Array.isArray(promptState.files) ? promptState.files.slice(0, 4).map((file, index) => {
              return /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "badge badge-info text-success p-1 rounded m-1 text-truncate", children: [
                file,
                " ",
                /* @__PURE__ */ jsxRuntime.jsx("i", { className: "fas fa-times", style: { cursor: "pointer" }, onClick: () => removeFile(file) })
              ] }, index);
            }) : /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "badge badge-info text-success p-1 rounded m-1", onClick: () => removeFile(promptState.files), children: [
              promptState.files,
              " ",
              /* @__PURE__ */ jsxRuntime.jsx("i", { className: "fas fa-times", style: { cursor: "pointer" }, onClick: () => removeFile(promptState.files) })
            ] }),
            /* @__PURE__ */ jsxRuntime.jsx(RenderIf, { condition: promptState.files.length > 4 && promptState.files !== "@workspace", children: /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
              /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "badge badge-info text-success p-1 rounded m-1", children: [
                promptState.files.length - 4,
                " more file",
                promptState.files.length - 4 > 1 ? "s" : ""
              ] }),
              /* @__PURE__ */ jsxRuntime.jsxs("span", { style: { cursor: "pointer" }, className: "badge badge-info text-success p-1 rounded m-1", onClick: () => removeAllFiles(), children: [
                "Remove all ",
                /* @__PURE__ */ jsxRuntime.jsx("i", { className: "fas fa-times" })
              ] })
            ] }) })
          ] }) })
        ] })
      ] });
    };

    const AiChat = function(props) {
      const {
        adapter,
        className,
        initialConversation,
        conversationOptions,
        composerOptions,
        displayOptions
      } = props;
      const { themeId, colorScheme } = displayOptions ?? {};
      const conversationRef = react.useRef(null);
      const conversationContainerRef = react.useRef(null);
      const lastActiveSegmentIdRef = react.useRef(void 0);
      const exceptionBoxRef = react.useRef(null);
      const autoScrollController = useAutoScrollController(conversationContainerRef, conversationOptions?.autoScroll);
      const exceptionBoxController = react.useMemo(() => {
        return exceptionBoxRef.current ? createExceptionsBoxController(exceptionBoxRef.current) : void 0;
      }, [exceptionBoxRef.current]);
      const markdownContainersController = usMarkdownContainers();
      const { PrimitivesContextProvider } = usePrimitivesContext({ messageOptions: props.messageOptions });
      const [prompt, setPrompt] = react.useState("");
      const [composerStatus, setComposerStatus] = react.useState("typing");
      const [initialSegment, setInitialSegment] = react.useState();
      const [newSegments, setChatSegments] = react.useState([]);
      const [cancelledSegmentIds, setCancelledSegmentIds] = react.useState([]);
      const [cancelledMessageIds, setCancelledMessageIds] = react.useState([]);
      const segments = react.useMemo(
        () => initialSegment ? [initialSegment, ...newSegments] : newSegments,
        [initialSegment, newSegments]
      );
      const adapterToUse = react.useMemo(() => adapterParamToUsableAdapter(adapter), [adapter]);
      const rootStyle = useAiChatStyle(displayOptions);
      const rootClassNames = react.useMemo(
        () => getRootClassNames({ className, themeId }).join(" "),
        [className, themeId]
      );
      const colorSchemeToApply = react.useMemo(
        () => colorScheme === "auto" || !colorScheme ? getSystemColorScheme() : colorScheme,
        [colorScheme]
      );
      const showException = react.useCallback(
        (message) => exceptionBoxController?.displayException(message),
        [exceptionBoxController]
      );
      const cancelLastMessageRequest = useCancelLastMessage(
        newSegments,
        cancelledSegmentIds,
        cancelledMessageIds,
        setChatSegments,
        setCancelledSegmentIds,
        setCancelledMessageIds,
        conversationRef,
        setComposerStatus
      );
      const handlePromptChange = react.useCallback((value) => setPrompt(value), [setPrompt]);
      const handleSubmitPrompt = useSubmitPromptHandler({
        aiChatProps: props,
        adapterToUse,
        conversationRef,
        initialSegment,
        newSegments,
        cancelledMessageIds,
        cancelledSegmentIds,
        prompt,
        composerOptions,
        showException,
        setChatSegments,
        setComposerStatus,
        setPrompt
      });
      const handleResubmitPrompt = useResubmitPromptHandler(
        initialSegment,
        setInitialSegment,
        newSegments,
        setChatSegments,
        setPrompt,
        setComposerStatus
      );
      const handleMarkdownStreamRendered = react.useCallback((_segmentId, messageId) => {
        if (props.events?.messageRendered) {
          props.events.messageRendered({ uid: messageId });
        }
      }, []);
      const handleConversationStarterSelected = react.useCallback(
        (conversationStarter) => {
          setPrompt(conversationStarter.prompt);
          setComposerStatus("submitting-conversation-starter");
        },
        [setPrompt, setComposerStatus]
      );
      const handleLastActiveSegmentChange = useLastActiveSegmentChangeHandler(
        autoScrollController,
        lastActiveSegmentIdRef
      );
      react.useEffect(() => {
        if (composerStatus === "submitting-conversation-starter" || composerStatus === "submitting-external-message" || composerStatus === "submitting-edit") {
          handleSubmitPrompt();
        }
      }, [composerStatus, handleSubmitPrompt]);
      react.useEffect(() => setInitialSegment(
        initialConversation ? chatItemsToChatSegment(initialConversation) : void 0
      ), [initialConversation]);
      react.useEffect(() => {
        if (initialSegment) {
          conversationContainerRef.current?.scrollTo({ behavior: "smooth", top: 5e4 });
        }
      }, [initialSegment]);
      const internalApiRef = react.useRef(void 0);
      react.useEffect(() => {
        const internalApi = props.api;
        internalApiRef.current = internalApi;
        if (typeof internalApi?.__setHost === "function") {
          internalApi.__setHost({
            sendMessage: (prompt2) => {
              setPrompt(prompt2);
              setComposerStatus("submitting-external-message");
            },
            resetConversation: () => {
              setChatSegments([]);
              setInitialSegment(void 0);
            },
            cancelLastMessageRequest
          });
        } else {
          warnOnce(
            "API object passed was is not compatible with AiChat.\nOnly use API objects created by the useAiChatApi() hook."
          );
        }
      }, [
        props.api,
        cancelLastMessageRequest,
        setPrompt,
        setComposerStatus,
        setChatSegments,
        setInitialSegment
      ]);
      react.useEffect(() => () => {
        if (typeof internalApiRef.current?.__unsetHost === "function") {
          internalApiRef.current.__unsetHost();
          internalApiRef.current = void 0;
        }
      }, []);
      useReadyEventTrigger(props);
      usePreDestroyEventTrigger(props, segments);
      const ForwardConversationComp = react.useMemo(
        () => react.forwardRef(ConversationComp),
        []
      );
      const uiOverrides = useUiOverrides(props);
      const hasValidInput = prompt.length > 0;
      const compChatRoomStatusClassName = segments.length === 0 ? "nlux-chatRoom-starting" : "nlux-chatRoom-active";
      if (!adapterToUse) {
        warnOnce("AiChat: No valid adapter provided. The component will not render.");
        return /* @__PURE__ */ jsxRuntime.jsx(jsxRuntime.Fragment, {});
      }
      return /* @__PURE__ */ jsxRuntime.jsx(PrimitivesContextProvider, { children: /* @__PURE__ */ jsxRuntime.jsxs("div", { className: rootClassNames, style: rootStyle, "data-color-scheme": colorSchemeToApply, children: [
        /* @__PURE__ */ jsxRuntime.jsx("div", { className: className$7, ref: exceptionBoxRef }),
        /* @__PURE__ */ jsxRuntime.jsxs("div", { className: `nlux-chatRoom-container ${compChatRoomStatusClassName}`, children: [
          /* @__PURE__ */ jsxRuntime.jsx("div", { className: "nlux-launchPad-container", children: /* @__PURE__ */ jsxRuntime.jsx(
            LaunchPad,
            {
              segments,
              onConversationStarterSelected: handleConversationStarterSelected,
              conversationOptions,
              personaOptions: props.personaOptions,
              userDefinedGreeting: uiOverrides.Greeting
            }
          ) }),
          /* @__PURE__ */ jsxRuntime.jsx("div", { className: "nlux-conversation-container", ref: conversationContainerRef, "aria-label": "Chat conversation", role: "log", children: /* @__PURE__ */ jsxRuntime.jsx(
            ForwardConversationComp,
            {
              ref: conversationRef,
              segments,
              conversationOptions: props.conversationOptions,
              personaOptions: props.personaOptions,
              messageOptions: props.messageOptions,
              onLastActiveSegmentChange: handleLastActiveSegmentChange,
              Loader: uiOverrides.Loader,
              markdownContainersController,
              submitShortcutKey: props.composerOptions?.submitShortcut,
              onPromptResubmit: handleResubmitPrompt,
              onMarkdownStreamRendered: handleMarkdownStreamRendered
            }
          ) }),
          /* @__PURE__ */ jsxRuntime.jsx("div", { id: "remix-composer-container", className: "nlux-composer-container", children: uiOverrides.Composer ? uiOverrides.Composer : /* @__PURE__ */ jsxRuntime.jsx(
            RemixComposerComp,
            {
              status: composerStatus,
              prompt,
              hasValidInput,
              onChange: handlePromptChange,
              onSubmit: handleSubmitPrompt,
              onCancel: cancelLastMessageRequest,
              addContextFiles: props.composerOptions?.addContextFiles,
              aiModal: props.composerOptions?.aiModal,
              Loader: uiOverrides.Loader,
              pluginMethodCall: props.composerOptions?.pluginMethodCall
            }
          ) })
        ] })
      ] }) });
    };

    const createVoidInternalApi = (setHost = () => {
    }) => {
      return {
        composer: {
          send: (prompt) => {
            throw new Error("AiChatApi is not connected to a host <AiChat /> component.");
          },
          cancel: () => {
            throw new Error("AiChatApi is not connected to a host <AiChat /> component.");
          }
        },
        conversation: {
          reset: () => {
            throw new Error("AiChatApi is not connected to a host <AiChat /> component.");
          }
        },
        // @ts-ignore
        __setHost: (host) => {
          setHost(host);
        },
        // @ts-ignore
        __unsetHost: () => {
        }
      };
    };
    const useAiChatApi = () => {
      const currentHost = react.useRef(null);
      const api = react.useRef(createVoidInternalApi());
      api.current.composer.send = (prompt) => {
        if (!currentHost.current) {
          throw new Error("AiChatApi is not connected to a host <AiChat /> component.");
        }
        currentHost.current.sendMessage(prompt);
      };
      api.current.composer.cancel = () => {
        if (!currentHost.current) {
          throw new Error("AiChatApi is not connected to a host <AiChat /> component.");
        }
        currentHost.current.cancelLastMessageRequest();
      };
      api.current.conversation.reset = () => {
        if (!currentHost.current) {
          throw new Error("AiChatApi is not connected to a host <AiChat /> component.");
        }
        currentHost.current.resetConversation();
      };
      api.current.__setHost = (host) => {
        currentHost.current = host;
      };
      api.current.__unsetHost = () => {
        currentHost.current = null;
      };
      return api.current;
    };

    const Markdown = ({ children }) => {
      const uid = react.useMemo(() => Math.random().toString(36).substring(7), []);
      const primitivesContextData = react.useContext(primitivesContext);
      const childrenAsString = Array.isArray(children) ? children.join("") : children;
      return /* @__PURE__ */ jsxRuntime.jsx(
        MarkdownSnapshotRenderer,
        {
          markdownOptions: primitivesContextData.messageOptions,
          content: childrenAsString,
          messageUid: uid
        }
      );
    };

    const useAsBatchAdapter = function(send, dependencies) {
      return react.useMemo(
        () => ({ batchText: send }),
        dependencies ?? [{}]
        // If no dependencies are provided, we use an empty object to force the hook
        // to run every time (no memoization).
      );
    };

    const useAsStreamAdapter = function(submit, dependencies) {
      return react.useMemo(
        () => ({ streamText: submit }),
        dependencies ?? [{}]
        // If no dependencies are provided, we use an empty object to force the hook
        // to run every time (no memoization).
      );
    };

    const useAsRscAdapter = function(moduleLoadingPromise, loader) {
      return {
        streamServerComponent: (message, extras, events) => {
          return () => {
            const [state, setState] = react.useState("idle");
            const [
              AssistantMessage,
              setAssistantMessage
            ] = react.useState(null);
            react.useEffect(() => {
              setState("loading");
              moduleLoadingPromise.then((module) => {
                if (typeof module.default !== "function") {
                  const errorMessage = "The module passed to useAsRscAdapter() as server component does not have a valid default export.";
                  warn(errorMessage);
                  setState("error");
                  events.onError(new Error(errorMessage));
                  return;
                }
                setState("success");
                setAssistantMessage(() => {
                  return react.lazy(async () => {
                    let resultFromServer = void 0;
                    let rscExecutionOutput = void 0;
                    try {
                      rscExecutionOutput = module.default(
                        { message, extras }
                      );
                      resultFromServer = await Promise.resolve(rscExecutionOutput);
                    } catch (_error) {
                      warn(
                        "An error occurred while rendering the React Server Component (RSC).\nPlease ensure that no server error has occurred."
                      );
                      events.onError(new Error("Error while rendering RSC."));
                    }
                    events.onServerComponentReceived();
                    if (resultFromServer === void 0 || !react.isValidElement(resultFromServer)) {
                      events.onError(
                        new Error(
                          "Unable to render RSC. The RSC adapter should return a valid React element."
                        )
                      );
                      return { default: () => /* @__PURE__ */ jsxRuntime.jsx(jsxRuntime.Fragment, {}) };
                    } else {
                      return { default: () => /* @__PURE__ */ jsxRuntime.jsx(jsxRuntime.Fragment, { children: resultFromServer }) };
                    }
                  });
                });
              }).catch((e) => {
                warn(
                  "The module passed to useAsRscAdapter() is not a valid ES module, or did not properly load! The first parameter passed to useAsRscAdapter() should be the result of a dynamic import() call [ without await or .then() ]. The module should also have a default export. Your bundler should be able to handle dynamic imports and ES modules.\n\nReference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import#dynamic_imports"
                );
                setState("error");
                events.onError(e);
              });
            }, []);
            if (state === "idle") {
              return null;
            }
            if (state === "loading") {
              return null;
            }
            if (state === "error") {
              warn("Error loading RSC");
              return /* @__PURE__ */ jsxRuntime.jsx(jsxRuntime.Fragment, { children: "Error loading RSC" });
            }
            return /* @__PURE__ */ jsxRuntime.jsx(react.Suspense, { fallback: loader ? loader : null, children: AssistantMessage && /* @__PURE__ */ jsxRuntime.jsx(AssistantMessage, {}) });
          };
        }
      };
    };

    const useAiContext = (aiContext, itemDescription, itemValue) => {
      const result = react.useContext(aiContext.ref);
      const [itemId] = react.useState(() => {
        let itemUniqueId;
        do {
          itemUniqueId = Math.random().toString(36).substring(2, 15);
        } while (result.hasItem(itemUniqueId));
        return itemUniqueId;
      });
      const observerRef = react.useRef();
      react.useEffect(() => {
        observerRef.current = result.observeState(
          itemId,
          itemDescription,
          itemValue
        );
        return () => {
          observerRef.current?.discard();
          observerRef.current = void 0;
        };
      }, []);
      react.useEffect(() => {
        observerRef.current?.setDescription(itemDescription);
      }, [itemDescription]);
      react.useEffect(() => {
        observerRef.current?.setData(itemValue);
      }, [itemValue]);
    };

    const useAiTask = (aiContext, taskDescription, callback, parametersDescription) => {
      const coreAiContext = react.useContext(aiContext.ref);
      const [taskId] = react.useState(() => {
        let itemUniqueId;
        do {
          itemUniqueId = Math.random().toString(36).substring(2, 15);
        } while (coreAiContext.hasTask(itemUniqueId));
        return itemUniqueId;
      });
      const observerRef = react.useRef();
      react.useEffect(() => {
        observerRef.current = coreAiContext.registerTask(
          taskId,
          taskDescription,
          callback,
          parametersDescription
        );
        return () => {
          observerRef.current?.discard();
          observerRef.current = void 0;
        };
      }, []);
      react.useEffect(() => {
        observerRef.current?.setDescription(taskDescription);
      }, [taskDescription]);
      react.useEffect(() => {
        observerRef.current?.setCallback(callback);
      }, [callback]);
      react.useEffect(() => {
        observerRef.current?.setParamDescriptions(parametersDescription ?? []);
      }, [parametersDescription]);
    };

    const createAiContext = (adapter) => {
      const unusedAiContext = core.createAiContext();
      const ReactContext = react.createContext(unusedAiContext);
      return {
        // React component that provides the AI context to the children
        // To be used as <aiContextInstance.Provider> context aware app .. </aiContextInstance.Provider>
        Provider: (props) => {
          const [
            contextId,
            setContextId
          ] = react.useState();
          const [
            contextInitError,
            setContextInitError
          ] = react.useState();
          const [
            coreAiContext,
            setCoreAiContext
          ] = react.useState();
          react.useEffect(() => {
            let usableContext = true;
            const newContext = core.createAiContext().withAdapter(adapter).withDataSyncOptions({
              syncStrategy: "auto",
              contextSize: core.predefinedContextSize["100k"]
            });
            setCoreAiContext(newContext);
            newContext.initialize(props.initialItems || {}).then((result) => {
              if (!usableContext) {
                return;
              }
              if (result.success) {
                setContextId(result.contextId);
              } else {
                setContextInitError(new Error(result.error));
              }
            });
            return () => {
              usableContext = false;
              newContext.destroy();
            };
          }, []);
          const { children } = props;
          if (contextInitError) {
            if (props.errorComponent) {
              return /* @__PURE__ */ jsxRuntime.jsx(props.errorComponent, { error: contextInitError.message });
            }
            return /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntime.jsx("h1", { children: "Error initializing AI context" }),
              /* @__PURE__ */ jsxRuntime.jsx("p", { children: contextInitError.message })
            ] });
          }
          if (!contextId || !coreAiContext) {
            if (props.loadingComponent) {
              return /* @__PURE__ */ jsxRuntime.jsx(props.loadingComponent, {});
            }
            return null;
          }
          return /* @__PURE__ */ jsxRuntime.jsx(ReactContext.Provider, { value: coreAiContext, children });
        },
        ref: ReactContext
      };
    };

    const useDeepCompareEffect = useDeepCompareEffect$1;

    exports.AiChat = AiChat;
    exports.AiChatUI = AiChatUI;
    exports.Markdown = Markdown;
    exports.createAiContext = createAiContext;
    exports.useAiChatApi = useAiChatApi;
    exports.useAiContext = useAiContext;
    exports.useAiTask = useAiTask;
    exports.useAsBatchAdapter = useAsBatchAdapter;
    exports.useAsRscAdapter = useAsRscAdapter;
    exports.useAsStreamAdapter = useAsStreamAdapter;
    exports.useDeepCompareEffect = useDeepCompareEffect;

}));
//# sourceMappingURL=nlux-react.js.map
