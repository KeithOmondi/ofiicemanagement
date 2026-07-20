// src/utils/pasteSanitizer.ts

/**
 * Sanitizes clipboard HTML before it's inserted into the contentEditable
 * body editor. Word/Excel paste payloads carry a lot of baggage that
 * survives straight through to the saved `body` HTML and, from there,
 * into the PDF template:
 *
 *  - Empty `<p>&nbsp;</p>` / `<p>.</p>`-style paragraphs Word uses for
 *    vertical spacing (these are what show up as stray "." lines
 *    immediately above/below a pasted table).
 *  - `mso-*` inline styles (margins, line-height, font metrics) that
 *    inflate the effective height of the pasted block well beyond what
 *    it visually appears to take up in the editor.
 *  - Conditional-comment cruft (`<!--[if ...]-->`), `<o:p>`, `<font>`,
 *    and deeply nested `<span>` wrappers.
 *
 * formatBodyHtml() in MemoTemplate.ts already isolates <table> blocks so
 * newline-to-<br/> conversion doesn't get "foster-parented" in front of
 * a table — but it was never meant to strip this Word-specific bloat
 * sitting around the table. That has to happen here, at paste time,
 * before the HTML is ever written into the editor or saved.
 */
export function sanitizePastedHtml(html: string): string {
  let clean = html;

  // Strip Word/Office conditional comments and their contents,
  // e.g. <!--[if gte mso 9]>...<![endif]-->
  clean = clean.replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '');
  clean = clean.replace(/<!--[\s\S]*?-->/g, '');

  // Strip <o:p>, <o:p/>, and Word's <?xml ... ?> / <w:...> namespace tags
  clean = clean.replace(/<\/?o:p[^>]*>/gi, '');
  clean = clean.replace(/<\?xml[\s\S]*?\?>/gi, '');
  clean = clean.replace(/<\/?w:[a-zA-Z]+[^>]*>/gi, '');

  // Strip <style> and <script> blocks entirely
  clean = clean.replace(/<style[\s\S]*?<\/style>/gi, '');
  clean = clean.replace(/<script[\s\S]*?<\/script>/gi, '');

  // Strip class="Mso..." and any mso-* declarations inside style="" attrs
  // (leaves other legitimate inline styles, e.g. table border widths, intact)
  clean = clean.replace(/\sclass="Mso[^"]*"/gi, '');
  clean = clean.replace(/style="([^"]*)"/gi, (_match, styleContent: string) => {
    const kept = styleContent
      .split(';')
      .filter((decl: string) => !/^\s*mso-/i.test(decl))
      .join(';')
      .trim();
    return kept ? `style="${kept}"` : '';
  });

  // Remove empty spacer paragraphs Word inserts for vertical whitespace:
  // <p>&nbsp;</p>, <p> </p>, <p>.</p>, or a bare <p></p>, optionally with
  // leftover (now-stripped-of-mso) style/class attributes.
  clean = clean.replace(
    /<p[^>]*>(\s|&nbsp;|\.|·)*<\/p>/gi,
    ''
  );

  // Collapse now-redundant empty spans Word wraps every run of text in
  // (safe no-op if none present)
  clean = clean.replace(/<span[^>]*>(\s*)<\/span>/gi, '$1');

  return clean.trim();
}