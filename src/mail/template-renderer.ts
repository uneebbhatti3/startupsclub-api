import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Renders the email templates in `src/mail/templates/` (copied to `dist/` by `nest-cli.json`).
 * Each email has an `.html` and a `.txt` file with `{{key}}` placeholders; values are
 * HTML-escaped in the HTML part, and a placeholder without a value is an error rather than
 * being sent as raw braces.
 *
 * @packageDocumentation
 */

/** Folder of the templates, next to this file in `src/` and in `dist/`. */
export const MAIL_TEMPLATES_DIR = join(__dirname, "templates");

/** Both parts of a rendered email. */
export interface RenderedTemplate {
  html: string;
  text: string;
}

const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g;

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escapes text for HTML, so a value cannot add tags, links or attributes.
 *
 * @param value - Untrusted text.
 * @returns The escaped text.
 */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

/**
 * Replaces every `{{key}}` in a template.
 *
 * @param source - The template.
 * @param values - Values by key.
 * @param encode - Applied to each value (escaping for HTML, nothing for text).
 * @returns The filled template.
 * @throws Error when a placeholder has no value.
 */
export function fillTemplate(
  source: string,
  values: Readonly<Record<string, string>>,
  encode: (value: string) => string,
): string {
  return source.replace(PLACEHOLDER, (_match: string, key: string) => {
    const value = values[key];
    if (value === undefined) {
      throw new Error(`Email template placeholder "${key}" has no value`);
    }
    return encode(value);
  });
}

export class TemplateRenderer {
  private readonly files = new Map<string, Promise<string>>();

  /**
   * @param dir - Folder of the templates.
   */
  constructor(private readonly dir: string = MAIL_TEMPLATES_DIR) {}

  /**
   * Renders both parts of an email.
   *
   * @param name - Template name without extension, e.g. `waitlist-welcome`.
   * @param values - Placeholder values.
   * @returns The HTML and plain-text parts.
   */
  async render(name: string, values: Readonly<Record<string, string>>): Promise<RenderedTemplate> {
    const [html, text] = await Promise.all([this.read(`${name}.html`), this.read(`${name}.txt`)]);
    return {
      html: fillTemplate(html, values, escapeHtml),
      text: fillTemplate(text, values, (value) => value),
    };
  }

  /**
   * Reads a template file once and keeps it in memory.
   *
   * @param file - File name inside the templates folder.
   * @returns Its contents.
   */
  private read(file: string): Promise<string> {
    let contents = this.files.get(file);
    if (!contents) {
      contents = readFile(join(this.dir, file), "utf8");
      this.files.set(file, contents);
    }
    return contents;
  }
}
