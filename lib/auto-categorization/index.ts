/**
 * Auto-categorizare tranzacții bazată pe keyword-urile salvate ale userului.
 * Matching case-insensitive: dacă descrierea conține keyword-ul, returnează categoryId.
 */

interface UserKeyword {
  keyword: string;
  categoryId: string;
}

export function autoCategorize(
  description: string,
  userKeywords: UserKeyword[]
): string | null {
  if (!description || userKeywords.length === 0) return null;

  const normalizedDescription = description.toLowerCase().trim();

  for (const { keyword, categoryId } of userKeywords) {
    if (normalizedDescription.includes(keyword.toLowerCase().trim())) {
      return categoryId;
    }
  }

  return null;
}
