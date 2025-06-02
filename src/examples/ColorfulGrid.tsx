import ThiingsGrid, { type ItemConfig } from "../../lib/ThiingsGrid";

const ColorfulCell = ({ gridIndex }: ItemConfig) => {
  const colors = [
    "bg-red-300",
    "bg-green-300",
    "bg-blue-300",
    "bg-yellow-300",
    "bg-pink-300",
    "bg-cyan-300",
  ];
  const colorClass = colors[gridIndex % colors.length];

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center ${colorClass} text-xs font-bold text-gray-800 shadow-sm`}
    >
      {gridIndex}
    </div>
  );
};

export const ColorfulGrid = () => (
  <ThiingsGrid gridSize={100} renderItem={ColorfulCell} />
);

export default ColorfulGrid;
