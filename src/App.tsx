import { useState } from "react";
import { Toaster } from "sonner";
import Sidebar from "./Sidebar";
import Playground from "./Playground";
import SourceCode from "./SourceCode";

function App() {
  const [currentExample, setCurrentExample] = useState(0);

  return (
    <div className="flex h-screen w-screen font-sans">
      <Sidebar
        currentExample={currentExample}
        onExampleChange={setCurrentExample}
      />
      <main className="flex flex-1 flex-col h-screen">
        <div className="flex-[3] relative bg-white border-b border-gray-200">
          <Playground currentExample={currentExample} />
        </div>
        <div className="flex flex-1 min-h-[300px]">
          <SourceCode currentExample={currentExample} />
        </div>
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
