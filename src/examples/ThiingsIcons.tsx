import ThiingsGrid, { type ItemConfig } from "../../lib/ThiingsGrid";

const images = [
  "https://charlieclark.github.io/thiings-grid/thiings/1.png",
  "https://charlieclark.github.io/thiings-grid/thiings/2.png",
  "https://charlieclark.github.io/thiings-grid/thiings/3.png",
  "https://charlieclark.github.io/thiings-grid/thiings/4.png",
  "https://charlieclark.github.io/thiings-grid/thiings/5.png",
  "https://charlieclark.github.io/thiings-grid/thiings/6.png",
  "https://charlieclark.github.io/thiings-grid/thiings/7.png",
  "https://charlieclark.github.io/thiings-grid/thiings/8.png",
  "https://charlieclark.github.io/thiings-grid/thiings/9.png",
];

const ThiingsIconCell = ({ gridIndex }: ItemConfig) => (
  <div className="absolute inset-1 flex items-center justify-center">
    <img src={images[gridIndex % images.length]} />
  </div>
);

export const ThiingsIcons = () => (
  <ThiingsGrid
    gridSize={200}
    renderItem={ThiingsIconCell}
    initialPosition={{ x: 0, y: 0 }}
  />
);

export default ThiingsIcons;
