/**
 * Terminal Link Utility
 * Universal utility for creating clickable links in terminals
 */
import ansiEscapes from 'ansi-escapes';
import supportsHyperlinks from 'supports-hyperlinks';

export interface TerminalLinkOptions {
  fallback?: boolean | ((text: string, url: string) => string);
}

interface TerminalLinkFunction {
  (text: string, url: string, options?: TerminalLinkOptions): string;
  isSupported: boolean;
}

/**
 * Create a clickable terminal link
 * @param text - Text to display as the link
 * @param url - URL the link should point to
 * @param options - Configuration options
 * @returns Clickable link string or fallback text
 */
function createTerminalLink(
  text: string,
  url: string,
  options: TerminalLinkOptions = {},
): string {
  const { fallback } = options;

  if (!supportsHyperlinks.stdout) {
    if (fallback === false) {
      return text;
    }

    if (typeof fallback === 'function') {
      return fallback(text, url);
    }

    return `${text} ${url}`;
  }

  return ansiEscapes.link(text, url);
}

/**
 * Create a clickable terminal link
 */
export const terminalLink: TerminalLinkFunction = Object.assign(
  createTerminalLink,
  {
    isSupported: supportsHyperlinks.stdout,
  },
);
