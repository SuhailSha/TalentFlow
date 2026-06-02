/**
 * Build a PostgreSQL tsquery string from arbitrary user input where each
 * token is prefix-matched and tokens are AND-combined.
 *
 * Example: `"sara eng"` → `"sara:* & eng:*"`
 *
 * The output is safe to pass to `to_tsquery('simple', ...)` because we strip
 * everything except Unicode letters/digits before tokenising. Without this
 * sanitisation, characters that tsquery treats as operators (`!`, `&`, `|`,
 * `<->`, `:`, `(`, `)`) would either crash the query or alter its meaning.
 *
 * Accents are stripped (NFKD + U+0300..U+036F removal) so "résumé" tokenises
 * to "resume", which matches how the existing tsvector columns were built
 * with the `simple` configuration.
 *
 * Returns null when the input has no usable tokens — callers should fall
 * back to a no-search path in that case rather than passing the empty
 * string to `to_tsquery`.
 */
// Combining diacritical marks block (U+0300..U+036F). Built via charCode so
// the source stays ASCII-safe regardless of editor rendering / encoding.
const COMBINING_MARKS = new RegExp(
  `[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`,
  'g',
);

export function buildPrefixTsQuery(raw: string | undefined | null): string | null {
  if (!raw) return null;

  const tokens = raw
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .map((t) => `${t}:*`);

  return tokens.length === 0 ? null : tokens.join(' & ');
}
