import ThiingsGrid, { type ItemConfig } from "../../lib/ThiingsGrid";

const EmojiCell = ({ gridIndex }: ItemConfig) => {
  const emojis = ["🎨", "🚀", "🌟", "🎪", "🎭", "🎨", "🎸", "🎯", "🎲", "🎳"];
  const emoji = emojis[gridIndex % emojis.length];

  return (
    <div className="absolute inset-2 flex items-center justify-center bg-gradient-to-br from-gray-100 to-white border border-gray-300 rounded-full text-2xl shadow-md">
      {emoji}
    </div>
  );
};

export const EmojiFun = () => (
  <ThiingsGrid
    gridSize={120}
    renderItem={EmojiCell}
    initialPosition={{ x: 0, y: 0 }}
  />
);

export default EmojiFun;
