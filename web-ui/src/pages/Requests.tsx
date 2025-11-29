import { useState } from "react";
import { Button } from "@/components/ui/button";

import { Check, Bot } from "lucide-react";
import { useNavigate } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Mock Data
const AVAILABLE_MODELS = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    description: "Most capable model for complex tasks",
  },
  {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    description: "Excellent at coding and reasoning",
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    provider: "Google",
    description: "Large context window and multimodal",
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "OpenAI",
    description: "Fast and reliable",
  },
];

export default function Requests() {
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const navigate = useNavigate();

  const toggleModel = (id: string) => {
    setSelectedModels((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const handleStartBattle = () => {
    if (selectedModels.length === 0) return;
    // In a real app, we'd dispatch the request here
    console.log("Starting evaluation with:", selectedModels);
    navigate("/runs");
  };

  return (
    <div className="container py-10 mx-auto max-w-5xl">
      <div className="flex flex-col space-y-4 mb-8 text-center sm:text-left">
        <h1 className="text-3xl font-bold tracking-tight">
          Select Models to Compare
        </h1>
        <p className="text-muted-foreground">
          Select the LLMs you want to evaluate. They will receive the same
          prompt and starter code.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {AVAILABLE_MODELS.map((model) => {
          const isSelected = selectedModels.includes(model.id);
          return (
            <div
              key={model.id}
              onClick={() => toggleModel(model.id)}
              className={`cursor-pointer transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] relative group`}
            >
              <div
                className={`absolute inset-0 rounded-xl bg-primary/20 blur-md transition-opacity ${
                  isSelected
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-50"
                }`}
              />
              <Card
                className={`relative h-full border-2 transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="p-2 rounded-lg bg-background/50 border shadow-sm">
                      <Bot className="w-6 h-6 text-primary" />
                    </div>
                    {isSelected && (
                      <div className="rounded-full bg-primary text-primary-foreground p-1">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <CardTitle className="mt-4">{model.name}</CardTitle>
                  <CardDescription>{model.provider}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {model.description}
                  </p>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur border-t flex justify-center items-center gap-4 z-20 sm:static sm:bg-transparent sm:border-0 sm:p-0 sm:justify-end">
        <div className="text-sm text-muted-foreground hidden sm:block">
          {selectedModels.length} models selected
        </div>
        <Button
          size="lg"
          onClick={handleStartBattle}
          disabled={selectedModels.length === 0}
          className="w-full sm:w-auto shadow-lg"
        >
          Start Evaluation ({selectedModels.length})
        </Button>
      </div>
    </div>
  );
}
