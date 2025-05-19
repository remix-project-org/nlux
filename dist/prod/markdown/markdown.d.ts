type Highlighter = (input: string, language: string) => string;
type HighlighterColorMode = 'dark' | 'light';
type CreateHighlighterOptions = {
    language?: string;
    colorMode?: HighlighterColorMode;
};
interface HighlighterExtension {
    createHighlighter(options?: CreateHighlighterOptions): Highlighter;
    highlightingClass(language?: string): string;
}

type CallbackArgType = object | string | number | boolean | symbol | null | undefined | void;
type CallbackFunction = (...args: CallbackArgType[]) => CallbackArgType;

/**
 * A type representing a function to use as HTML sanitizer.
 * This type can be passed to markdown parser, to be used to sanitize generated
 * HTML before appending it to the document.
 */
type SanitizerExtension = (html: string) => string;

type SnapshotParserOptions = {
    syntaxHighlighter?: HighlighterExtension;
    htmlSanitizer?: SanitizerExtension;
    markdownLinkTarget?: 'blank' | 'self';
    showCodeBlockCopyButton?: boolean;
    skipStreamingAnimation?: boolean;
};
type SnapshotParser = (snapshot: string, options?: SnapshotParserOptions) => string;

declare const parseMdSnapshot: SnapshotParser;

type MarkdownStreamParser = {
    next(value: string): void;
    complete(): void;
};
type MarkdownStreamParserOptions = {
    markdownLinkTarget?: 'blank' | 'self';
    syntaxHighlighter?: HighlighterExtension;
    htmlSanitizer?: SanitizerExtension;
    skipStreamingAnimation?: boolean;
    streamingAnimationSpeed?: number;
    waitTimeBeforeStreamCompletion?: number | 'never';
    showCodeBlockCopyButton?: boolean;
    onComplete?: CallbackFunction;
};
declare const createMarkdownStreamParser: (domElement: HTMLElement, options?: MarkdownStreamParserOptions) => MarkdownStreamParser;

export { type MarkdownStreamParser, type MarkdownStreamParserOptions, type SnapshotParser, type SnapshotParserOptions, createMarkdownStreamParser, parseMdSnapshot };
