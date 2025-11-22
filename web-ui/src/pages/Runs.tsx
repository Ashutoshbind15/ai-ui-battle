import { useState } from "react";
import { Maximize2, Minimize2, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

// Mock Runs Data
const MOCK_RUNS = [
  { id: "run-1", model: "GPT-4o", port: 5174, status: "running" },
  { id: "run-2", model: "Claude 3.5 Sonnet", port: 5175, status: "running" },
];

export default function Runs() {
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  // If we have a single expanded run, we show it full screen
  // Otherwise we show the grid

  const handleExpand = (id: string) => {
    if (expandedRun === id) {
      setExpandedRun(null);
    } else {
      setExpandedRun(id);
    }
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden bg-muted/10">
      <div className="flex items-center justify-between px-6 py-3 border-b bg-background/50 backdrop-blur-sm z-10">
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Live Comparison
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-3 h-3" />
            Refresh All
          </Button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-auto">
        <div
          className={`grid gap-4 h-full ${
            expandedRun ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
          } transition-all duration-300`}
        >
          {MOCK_RUNS.map((run) => {
            if (expandedRun && expandedRun !== run.id) return null;

            return (
              <div
                key={run.id}
                className="flex flex-col h-full min-h-[400px] rounded-xl border bg-card shadow-sm overflow-hidden ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-sm">{run.model}</div>
                    <div className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      Port: {run.port}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-7 w-7"
                      title="Open in new tab"
                      onClick={() =>
                        window.open(`http://localhost:${run.port}`, "_blank")
                      }
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-7 w-7"
                      onClick={() => handleExpand(run.id)}
                      title={expandedRun === run.id ? "Minimize" : "Maximize"}
                    >
                      {expandedRun === run.id ? (
                        <Minimize2 className="w-3.5 h-3.5" />
                      ) : (
                        <Maximize2 className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex-1 bg-white relative group">
                  {/* Iframe Container */}
                  <iframe
                    src={`http://localhost:${run.port}`}
                    className="w-full h-full border-0"
                    title={`${run.model} Preview`}
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  />
                  {/* Overlay for when iframe is not interactable or loading state could go here */}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
