/**
 * Normalize text for URL
 * "Long Hair Cat" -> "long-hair-cat"
 * "Black & White" -> "black-white"
 */
export function normalizeForUrl(text: string, maxLength = 50): string {
  const normalized = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return normalized.length > maxLength
    ? normalized.substring(0, maxLength)
    : normalized;
}

/**
 * Generate slug for an entity — must match server-side generate_slug() exactly.
 * Format: {transliterated-name}-{first 8 chars of UUID}
 * "Мій Песик Барон" + "b2c3d4e5-..." -> "miy-pesik-baron-b2c3d4e5"
 */
export function generateSlug(name: string, id: string): string {
  let slug = (name || "").toLowerCase().trim();

  const multiChar: [string, string][] = [
    ["щ", "shch"], ["ж", "zh"], ["ё", "yo"], ["х", "kh"],
    ["ц", "ts"], ["ч", "ch"], ["ш", "sh"], ["ю", "yu"],
    ["я", "ya"], ["ї", "yi"], ["є", "ye"], ["ß", "ss"],
    ["æ", "ae"], ["œ", "oe"],
  ];
  for (const [from, to] of multiChar) {
    slug = slug.split(from).join(to);
  }

  slug = slug.split("ъ").join("").split("ь").join("");

  const charMap: Record<string, string> = {
    "à": "a", "á": "a", "â": "a", "ã": "a", "ä": "a", "å": "a",
    "è": "e", "é": "e", "ê": "e", "ë": "e",
    "ì": "i", "í": "i", "î": "i", "ï": "i",
    "ò": "o", "ó": "o", "ô": "o", "õ": "o", "ö": "o",
    "ù": "u", "ú": "u", "û": "u", "ü": "u",
    "ý": "y", "ÿ": "y", "ñ": "n", "ç": "c", "ø": "o",
    "š": "s", "ž": "z", "č": "c", "ř": "r", "ď": "d", "ť": "t", "ň": "n",
    "ů": "u", "ě": "e",
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "з": "z",
    "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o",
    "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f",
    "ы": "y", "э": "e", "і": "i", "ґ": "g",
  };
  slug = Array.from(slug).map((ch) => charMap[ch] ?? ch).join("");

  slug = slug
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

  slug = slug.substring(0, 42).replace(/-+$/, "");

  const uuid8 = id.slice(0, 8);
  return slug ? `${slug}-${uuid8}` : uuid8;
}
