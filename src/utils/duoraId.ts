// Duora Permanent ID Generator and Validator
// Format: DUR-XXXX-XXXX (e.g. DUR-7K9M-2W8R)

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateDuoraId(): string {
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part1 += CHARSET.charAt(Math.floor(Math.random() * CHARSET.length));
    part2 += CHARSET.charAt(Math.floor(Math.random() * CHARSET.length));
  }
  return `DUR-${part1}-${part2}`;
}

export function isValidDuoraId(id: string): boolean {
  if (!id) return false;
  const regex = /^DUR-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
  return regex.test(id.trim());
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
}

export function isValidUsername(username: string): boolean {
  const norm = normalizeUsername(username);
  return norm.length >= 3 && norm.length <= 30;
}
