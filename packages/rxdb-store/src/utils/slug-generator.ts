/**
 * Slug Generator
 *
 * Must match server-side generate_slug() PL/pgSQL function exactly.
 * Format: {transliterated-name}-{first 8 chars of UUID}
 */

const MULTI_CHAR: [string, string][] = [
  ['щ', 'shch'], ['ж', 'zh'], ['ё', 'yo'], ['х', 'kh'],
  ['ц', 'ts'], ['ч', 'ch'], ['ш', 'sh'], ['ю', 'yu'],
  ['я', 'ya'], ['ї', 'yi'], ['є', 'ye'], ['ß', 'ss'],
  ['æ', 'ae'], ['œ', 'oe'],
];

const CHAR_MAP: Record<string, string> = {
  'à':'a','á':'a','â':'a','ã':'a','ä':'a','å':'a',
  'è':'e','é':'e','ê':'e','ë':'e',
  'ì':'i','í':'i','î':'i','ï':'i',
  'ò':'o','ó':'o','ô':'o','õ':'o','ö':'o',
  'ù':'u','ú':'u','û':'u','ü':'u',
  'ý':'y','ÿ':'y','ñ':'n','ç':'c','ø':'o',
  'š':'s','ž':'z','č':'c','ř':'r','ď':'d','ť':'t','ň':'n','ů':'u','ě':'e',
  'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','з':'z',
  'и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o',
  'п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f',
  'ы':'y','э':'e','і':'i','ґ':'g',
};

export function generateSlug(name: string, id: string): string {
  let slug = (name || '').toLowerCase().trim();

  // Multi-char replacements (order matters: щ before ш)
  for (const [from, to] of MULTI_CHAR) {
    slug = slug.split(from).join(to);
  }

  // Remove soft/hard signs
  slug = slug.split('ъ').join('').split('ь').join('');

  // Single-char transliteration
  slug = Array.from(slug).map(ch => CHAR_MAP[ch] ?? ch).join('');

  // Replace non-alphanumeric with hyphens, collapse, trim
  slug = slug
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

  // Truncate to 42 chars, remove trailing hyphen
  slug = slug.substring(0, 42).replace(/-+$/, '');

  // Append UUID suffix
  const uuid8 = id.slice(0, 8);
  return slug ? `${slug}-${uuid8}` : uuid8;
}
