/**
 * Normalizes a product name for comparison:
 * - lowercase
 * - remove accents
 * - collapse whitespace
 * - remove common noise words and punctuation
 */
export function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Finds the best match for an imported product name among existing products.
 * Returns the matched product id if similarity is high enough, null otherwise.
 */
export function findBestProductMatch(
  importedName: string,
  existingProducts: Array<{ id: string; name: string }>,
  threshold = 0.85,
): string | null {
  const normalizedImport = normalizeProductName(importedName);

  // Exact normalized match first
  for (const p of existingProducts) {
    if (normalizeProductName(p.name) === normalizedImport) {
      return p.id;
    }
  }

  // Token-based similarity
  let bestScore = 0;
  let bestId: string | null = null;

  for (const p of existingProducts) {
    const score = tokenSimilarity(normalizedImport, normalizeProductName(p.name));
    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestId = p.id;
    }
  }

  return bestId;
}

/**
 * Token-based Jaccard similarity + containment check.
 * Works well for product names like "COCA COLA 350ML" vs "Coca-Cola Lata 350ml"
 */
function tokenSimilarity(a: string, b: string): number {
  const tokensA = new Set(a.split(' ').filter(t => t.length > 1));
  const tokensB = new Set(b.split(' ').filter(t => t.length > 1));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }

  const union = new Set([...tokensA, ...tokensB]).size;
  const jaccard = intersection / union;

  // Also check containment (one name contains all tokens of the other)
  const containmentA = intersection / tokensA.size;
  const containmentB = intersection / tokensB.size;
  const containment = Math.max(containmentA, containmentB);

  // Weighted: favor containment for cases where one name is a subset
  return jaccard * 0.4 + containment * 0.6;
}
