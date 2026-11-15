import { escapeHtml, fillTemplate, TemplateRenderer } from "./template-renderer";

/**
 * Unit tests for the template renderer and the `waitlist-welcome` templates: both parts render
 * with the name, the name is escaped in the HTML, and no placeholder is left unfilled.
 *
 * @packageDocumentation
 */

describe("TemplateRenderer", () => {
  const renderer = new TemplateRenderer();

  it("renders both waitlist-welcome parts with the name and no leftover placeholders", async () => {
    const { html, text } = await renderer.render("waitlist-welcome", { name: "Test User" });

    for (const part of [html, text]) {
      expect(part).toContain("Hi Test User,");
      expect(part).toContain("Your spot is saved.");
      expect(part).toContain("What happens next");
      expect(part).not.toContain("{{");
    }
  });

  it("escapes HTML in the name in the HTML part only", async () => {
    const name = '<a href="https://evil.example">O\'Brien & Co</a>';

    const { html, text } = await renderer.render("waitlist-welcome", { name });

    expect(html).not.toContain("<a href=");
    expect(html).toContain("&lt;a href=&quot;https://evil.example&quot;&gt;O&#39;Brien &amp; Co");
    expect(text).toContain(`Hi ${name},`);
  });

  it("rejects a placeholder that has no value", () => {
    expect(() => fillTemplate("Hi {{name}}", {}, escapeHtml)).toThrow(
      'Email template placeholder "name" has no value',
    );
  });
});
