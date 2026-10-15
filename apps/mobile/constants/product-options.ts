/*
 * =========================================================
 * PRODUCT OPTIONS
 * =========================================================
 *
 * Fixed choices for the seller Add / Edit Product forms,
 * shown as tappable chips instead of free text so products
 * are categorized consistently across shops.
 * =========================================================
 */

export const PRODUCT_CATEGORIES = [
  'Bouquet',
  'Flower Basket',
  'Flower Box',
  'Vase Arrangement',
  'Flower Stand',
  'Single Stem',
  'Funeral Wreath',
] as const;

export const PRODUCT_OCCASIONS = [
  'Birthday',
  'Anniversary',
  'Sympathy',
  'Congratulations',
  "Valentine's Day",
  'Wedding',
  'Graduation',
  "Mother's Day",
  'Get Well Soon',
  'Thank You',
  'Just Because',
] as const;

/*
 * Keeps any saved value that is not in the fixed list
 * (older products used free text) so editing never drops it.
 */
export function withExtraOptions(
  options: readonly string[],
  saved: readonly (string | null | undefined)[]
): string[] {
  const list = [...options];

  for (const value of saved) {
    const trimmed = (value ?? '').trim();

    if (
      trimmed &&
      !list.some(option => option.toLowerCase() === trimmed.toLowerCase())
    ) {
      list.push(trimmed);
    }
  }

  return list;
}
