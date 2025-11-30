import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Check, Bot, Loader2 } from "lucide-react";
import { useNavigate } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useModels, useCreateBatch } from "@/hooks/queries";
import { toast } from "sonner";

export default function Requests() {
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("Create a simple todo app");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { data, isLoading, error } = useModels();
  const createBatch = useCreateBatch();

  const availableModels = data?.models || [];

  const toggleModel = (id: string) => {
    setSelectedModels((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const handleStartBattle = async () => {
    if (selectedModels.length === 0 || !prompt.trim()) return;

    const modelConfigs = selectedModels
      .map((id) => {
        const model = availableModels.find((m: any) => m.id === id);
        return {
          id,
          providerId: model?.providerId || "",
        };
      })
      .filter((config) => config.providerId);

    setIsSubmitting(true);
    try {
      // Step 1: Create batch with sessions (stores prompt, creates sessions in setup_pending state)
      await createBatch.mutateAsync({
        modelConfigs,
        prompt,
      });

      toast.success("Batch created successfully!");
      navigate("/");
    } catch (error) {
      console.error("Error creating batch:", error);
      toast.error("Error creating batch. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-10 mx-auto max-w-5xl">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading models...</p>
        </div>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="container py-10 mx-auto max-w-5xl">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <p className="text-destructive">
            {error?.message || data?.error || "Failed to load models"}
          </p>
        </div>
      </div>
    );
  }

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

      <div className="mb-8 space-y-2">
        <h2 className="text-lg font-semibold">Prompt</h2>
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt here..."
          className="max-w-2xl"
          disabled={isSubmitting}
        />
      </div>

      {availableModels.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">No models available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {availableModels.map(
            (model: {
              id: string;
              modelName: string;
              providerId: string;
              providerName: string;
            }) => {
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
                      <CardTitle className="mt-4">{model.modelName}</CardTitle>
                      <CardDescription>{model.providerName}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {model.providerName} - {model.modelName}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              );
            },
          )}
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur border-t flex justify-center items-center gap-4 z-20 sm:static sm:bg-transparent sm:border-0 sm:p-0 sm:justify-end">
        <div className="text-sm text-muted-foreground hidden sm:block">
          {selectedModels.length} models selected
        </div>
        <Button
          size="lg"
          onClick={handleStartBattle}
          disabled={
            selectedModels.length === 0 || isSubmitting || !prompt.trim()
          }
          className="w-full sm:w-auto shadow-lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting...
            </>
          ) : (
            `Start Evaluation (${selectedModels.length})`
          )}
        </Button>
      </div>
    </div>
  );
}
