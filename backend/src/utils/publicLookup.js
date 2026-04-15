export function normalizePublicLookup(lookupOrSlug) {
  if (typeof lookupOrSlug === 'string') {
    return { slug: lookupOrSlug };
  }

  return lookupOrSlug;
}

export function buildEventTypeLookupWhere(lookupOrSlug) {
  const lookup = normalizePublicLookup(lookupOrSlug);

  const where = {
    slug: lookup.slug,
    isActive: true,
  };

  if (lookup.username) {
    where.user = {
      username: lookup.username,
    };
  }

  return where;
}
