// Duora Built-in Avatar Symbols and Templates

export interface AvatarTemplate {
  id: string;
  name: string;
  gradient: string;
  iconText: string;
  bgHex: string;
}

export const AVATAR_TEMPLATES: AvatarTemplate[] = [
  { id: 'av1', name: 'Royal Violet', gradient: 'from-[#7057E8] to-[#4A32C8]', iconText: 'DV', bgHex: '#7057E8' },
  { id: 'av2', name: 'Cyber Neon', gradient: 'from-[#9333EA] to-[#C084FC]', iconText: 'CN', bgHex: '#9333EA' },
  { id: 'av3', name: 'Aurora Borealis', gradient: 'from-[#06B6D4] to-[#3B82F6]', iconText: 'AB', bgHex: '#06B6D4' },
  { id: 'av4', name: 'Emerald Sentinel', gradient: 'from-[#10B981] to-[#047857]', iconText: 'ES', bgHex: '#10B981' },
  { id: 'av5', name: 'Solar Flare', gradient: 'from-[#F59E0B] to-[#D97706]', iconText: 'SF', bgHex: '#F59E0B' },
  { id: 'av6', name: 'Rose Nebula', gradient: 'from-[#F43F5E] to-[#BE123C]', iconText: 'RN', bgHex: '#F43F5E' },
  { id: 'av7', name: 'Obsidian Core', gradient: 'from-[#1F2937] to-[#111827]', iconText: 'OC', bgHex: '#1F2937' },
  { id: 'av8', name: 'Electric Lilac', gradient: 'from-[#8B5CF6] to-[#6D28D9]', iconText: 'EL', bgHex: '#8B5CF6' },
  { id: 'av9', name: 'Crimson Pulse', gradient: 'from-[#EF4444] to-[#B91C1C]', iconText: 'CP', bgHex: '#EF4444' },
  { id: 'av10', name: 'Indigo Deep', gradient: 'from-[#6366F1] to-[#4338CA]', iconText: 'ID', bgHex: '#6366F1' },
  { id: 'av11', name: 'Ocean Mist', gradient: 'from-[#0EA5E9] to-[#0284C7]', iconText: 'OM', bgHex: '#0EA5E9' },
  { id: 'av12', name: 'Velvet Dusk', gradient: 'from-[#D946EF] to-[#A21CAF]', iconText: 'VD', bgHex: '#D946EF' }
];

export function getAvatarFallback(displayName: string): string {
  if (!displayName) return 'D';
  const parts = displayName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return displayName.substring(0, 2).toUpperCase();
}
