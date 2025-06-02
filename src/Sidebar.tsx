import { componentNames } from "./Playground";

type SidebarProps = {
  currentExample: number;
  onExampleChange: (index: number) => void;
};

const Sidebar = ({ currentExample, onExampleChange }: SidebarProps) => (
  <aside className="flex-shrink-0 bg-gray-50 border-r border-gray-300 px-4 py-6 flex flex-col justify-between">
    <div>
      <div className="mb-8">
        <h2 className="mt-0 text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
          thiings-grid
        </h2>
        <div className="text-xs text-gray-500 font-medium tracking-wide uppercase">
          infinite scroll component
        </div>
      </div>

      <nav>
        <div className="list-none p-0 mb-8">
          {componentNames.map((exampleName, index) => (
            <div
              key={index}
              className={`mb-4 cursor-pointer px-3 py-2 rounded transition-colors ${
                currentExample === index
                  ? "bg-blue-50 border border-blue-500 font-bold"
                  : "hover:bg-gray-200"
              }`}
              onClick={() => onExampleChange(index)}
            >
              {exampleName}
            </div>
          ))}
        </div>
      </nav>
    </div>

    <div className="space-y-3">
      <a
        href="https://thiings.co"
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg text-center text-sm transition-colors duration-200 no-underline"
      >
        explore thiings.co
      </a>

      <a
        href="https://github.com/charlieclark/thiings-grid"
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg text-center text-sm transition-colors duration-200 no-underline"
      >
        view docs
      </a>
    </div>
  </aside>
);

export default Sidebar;
