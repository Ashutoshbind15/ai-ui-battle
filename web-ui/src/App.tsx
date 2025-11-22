import { Button } from "@/components/ui/button";
import { Link } from "react-router";
import { Zap, Layout, Bot } from "lucide-react";

function App() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <section className="flex-1 flex flex-col items-center justify-center space-y-10 py-24 text-center md:py-32 lg:py-40 overflow-hidden relative">
        {/* Background gradients/blobs */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/20 rounded-[100%] blur-[100px] opacity-50 animate-pulse" />
        </div>

        <div className="container px-4 md:px-6 relative z-10 flex flex-col items-center gap-6">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl max-w-3xl">
            Compare AI Agent <span className="text-primary">Capabilities</span>
          </h1>
          <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
            Evaluate multiple LLM coding agents side-by-side. Run the same
            prompt, visualize the results, and analyze differences in real-time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 min-w-[200px]">
            <Link to="/requests">
              <Button size="lg" className="w-full sm:w-auto text-lg h-12 px-8">
                Start Evaluation
              </Button>
            </Link>
            <Link to="/runs">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto text-lg h-12 px-8"
              >
                View Comparison
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="container py-12 md:py-24 lg:py-32 border-t bg-muted/40">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 text-center px-4">
          <div className="flex flex-col items-center space-y-4 p-6 rounded-xl bg-card shadow-sm hover:shadow-md transition-all">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold">Fast Execution</h3>
            <p className="text-muted-foreground">
              Scaffold and run multiple agents concurrently with optimized
              Bun-based infrastructure.
            </p>
          </div>
          <div className="flex flex-col items-center space-y-4 p-6 rounded-xl bg-card shadow-sm hover:shadow-md transition-all">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <Layout className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold">Side-by-Side Comparison</h3>
            <p className="text-muted-foreground">
              View generated UIs in real-time iframes. Spot the differences and
              nuances instantly.
            </p>
          </div>
          <div className="flex flex-col items-center space-y-4 p-6 rounded-xl bg-card shadow-sm hover:shadow-md transition-all">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold">Model Agnostic</h3>
            <p className="text-muted-foreground">
              Bring your own models. Configure providers and let them compete on
              the same prompt.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;
