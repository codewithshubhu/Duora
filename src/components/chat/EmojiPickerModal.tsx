import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface EmojiPickerModalProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇',
      '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑',
      '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬',
      '😌', '😔', '😪', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴',
      '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲',
      '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞',
      '😓', '😩', '😫', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '💩', '🤡', '👻'
    ]
  },
  {
    name: 'Hands & Gestures',
    emojis: [
      '👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤏', '👈',
      '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🙏', '🤝',
      '👏', '🙌', '👐', '🤲', '✍️', '💅', '🤳'
    ]
  },
  {
    name: 'Hearts & Symbols',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞',
      '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '🔥', '✨', '🌟', '⭐️', '💫',
      '⚡', '💥', '💯', '💢', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '👑'
    ]
  },
  {
    name: 'Activities & Nature',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷',
      '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴',
      '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🌸', '🌹', '🌺', '🌻', '🌼', '🌷', '🌱',
      '🌲', '🌳', '🌴', '🌵', '🍀', '🍁', '🍂', '🍃', '☀️', '🌤️', '⛅', '🌧️', '❄️'
    ]
  }
];

export const EmojiPickerModal: React.FC<EmojiPickerModalProps> = ({ onSelectEmoji, onClose }) => {
  const { theme } = useTheme();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  const allEmojis = EMOJI_CATEGORIES.flatMap(c => c.emojis);
  const filteredEmojis = search.trim()
    ? allEmojis.filter(e => e.includes(search.trim()))
    : EMOJI_CATEGORIES[activeTab].emojis;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-black/60 backdrop-blur-xs select-none animate-in fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl p-4 shadow-2xl border flex flex-col max-h-[75vh] animate-in slide-in-from-bottom-4"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          color: theme.colors.text
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: theme.colors.border }}>
          <span className="font-bold text-sm">React with Emoji</span>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:opacity-75 transition cursor-pointer"
          >
            <X className="w-4 h-4 text-stone-400" />
          </button>
        </div>

        {/* Category Tabs */}
        {!search && (
          <div className="flex items-center gap-1.5 py-2 border-b overflow-x-auto no-scrollbar" style={{ borderColor: theme.colors.border }}>
            {EMOJI_CATEGORIES.map((cat, idx) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => setActiveTab(idx)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  activeTab === idx
                    ? 'text-white'
                    : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: activeTab === idx ? theme.colors.primary : 'transparent',
                  color: activeTab === idx ? '#FFFFFF' : theme.colors.textMuted
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Emoji Grid */}
        <div className="flex-1 overflow-y-auto py-3 grid grid-cols-7 gap-2 place-items-center">
          {filteredEmojis.map((emoji, index) => (
            <button
              key={`${emoji}-${index}`}
              type="button"
              onClick={() => {
                onSelectEmoji(emoji);
                onClose();
              }}
              className="w-10 h-10 flex items-center justify-center text-2xl hover:scale-130 active:scale-95 transition-transform cursor-pointer rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
