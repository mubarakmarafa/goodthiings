import ThiingsGrid, { type ItemConfig } from "../../lib/ThiingsGrid";

const images = [
  "/thiings/1.png",
  "/thiings/2.png",
  "/thiings/3.png",
  "/thiings/4.png",
  "/thiings/5.png",
  "/thiings/6.png",
  "/thiings/7.png",
  "/thiings/8.png",
  "/thiings/9.png",
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
