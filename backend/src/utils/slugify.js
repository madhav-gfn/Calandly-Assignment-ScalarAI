/**
 * Converts a string into a URL-safe slug.
 * "My Cool Event" → "my-cool-event"
 */
export function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')       // spaces → hyphens
    .replace(/[^\w-]+/g, '')    // strip non-word chars (except hyphens)
    .replace(/--+/g, '-')       // collapse multiple hyphens
    .replace(/^-+/, '')         // trim leading hyphens
    .replace(/-+$/, '');        // trim trailing hyphens
}

/**
 * Validates a slug: lowercase alphanumeric + hyphens only, 1-100 chars.
 */
export function isValidSlug(slug) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length <= 100;
}
