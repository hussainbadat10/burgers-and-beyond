// Shared HTML-escaping helpers. Every file that builds HTML via string
// concatenation (instead of textContent/createElement) needs one of these —
// previously each file hand-reimplemented its own copy, and the drift
// between copies (some missing escapeAttr entirely, one missing the null
// guard) caused real attribute-breakout bugs. Import from here instead of
// redefining locally.
//
// escapeHtml: safe for TEXT NODE content (a `<div>`, `<p>`, `<textarea>`
// body, etc.) — escapes &, <, > but not quotes, since quotes need no
// escaping outside of an attribute value.
//
// escapeAttr: safe for ATTRIBUTE VALUE content (src="...", data-name="...",
// alt="...", etc.) — escapes quotes too, so the value can't break out of
// the surrounding double-quoted attribute.
export function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

export function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}
