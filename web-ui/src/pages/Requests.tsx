import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FileText,
  Cpu,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
} from "lucide-react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useModels,
  useCreateBatch,
  usePrompts,
  useCreatePrompt,
  useUpdatePrompt,
  useDeletePrompt,
  type Prompt,
  type ModelConfig,
} from "@/hooks/queries";
import { toast } from "sonner";

const CUSTOM_PROMPT_ID = "__custom__";

export default function Requests() {
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>("");
  const [customPromptTitle, setCustomPromptTitle] = useState("");
  const [customPromptText, setCustomPromptText] = useState("");
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit mode state
  const [editingPromptId, setEditingPromptId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const navigate = useNavigate();
  const {
    data: modelsData,
    isLoading: modelsLoading,
    error: modelsError,
  } = useModels();
  const { data: promptsData, isLoading: promptsLoading } = usePrompts();
  const createBatch = useCreateBatch();
  const createPrompt = useCreatePrompt();
  const updatePrompt = useUpdatePrompt();
  const deletePrompt = useDeletePrompt();

  const availableModels = modelsData?.models || [];
  const storedPrompts = useMemo(
    () => promptsData?.prompts || [],
    [promptsData?.prompts],
  );

  const isCustomPrompt = selectedPromptId === CUSTOM_PROMPT_ID;

  const selectedPrompt = useMemo(() => {
    if (isCustomPrompt) return null;
    return (
      storedPrompts.find((p) => p.id.toString() === selectedPromptId) || null
    );
  }, [selectedPromptId, storedPrompts, isCustomPrompt]);

  const currentPromptText = isCustomPrompt
    ? customPromptText
    : selectedPrompt?.description || "";

  const toggleModel = (id: string) => {
    setSelectedModels((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  // Separate function to save custom prompt
  const handleSaveCustomPrompt = async () => {
    if (!customPromptTitle.trim() || !customPromptText.trim()) {
      toast.error("Please provide both title and description");
      return;
    }

    try {
      const saved = await createPrompt.mutateAsync({
        title: customPromptTitle.trim(),
        description: customPromptText.trim(),
      });
      toast.success("Prompt saved!");
      // Select the newly created prompt
      setSelectedPromptId(saved.id.toString());
      setCustomPromptTitle("");
      setCustomPromptText("");
    } catch (error) {
      console.error("Error saving prompt:", error);
      toast.error("Failed to save prompt");
    }
  };

  // Start editing a prompt
  const handleStartEdit = (prompt: Prompt) => {
    setEditingPromptId(prompt.id);
    setEditTitle(prompt.title);
    setEditDescription(prompt.description);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingPromptId(null);
    setEditTitle("");
    setEditDescription("");
  };

  // Save edited prompt
  const handleSaveEdit = async () => {
    if (!editingPromptId || !editTitle.trim() || !editDescription.trim()) {
      toast.error("Please provide both title and description");
      return;
    }

    try {
      await updatePrompt.mutateAsync({
        id: editingPromptId,
        title: editTitle.trim(),
        description: editDescription.trim(),
      });
      toast.success("Prompt updated!");
      handleCancelEdit();
    } catch (error) {
      console.error("Error updating prompt:", error);
      toast.error("Failed to update prompt");
    }
  };

  // Delete prompt
  const handleDeletePrompt = async (promptId: number) => {
    try {
      await deletePrompt.mutateAsync(promptId);
      toast.success("Prompt deleted!");
      if (selectedPromptId === promptId.toString()) {
        setSelectedPromptId("");
      }
    } catch (error) {
      console.error("Error deleting prompt:", error);
      toast.error("Failed to delete prompt");
    }
  };

  // Start comparison (batch creation only)
  const handleStartComparison = async () => {
    if (selectedModels.length === 0 || !currentPromptText.trim()) return;

    const modelConfigs = selectedModels
      .map((id) => {
        const model = availableModels.find((m: ModelConfig) => m.id === id);
        return {
          id,
          providerId: model?.providerId || "",
        };
      })
      .filter((config) => config.providerId);

    setIsSubmitting(true);
    try {
      await createBatch.mutateAsync({
        modelConfigs,
        prompt: currentPromptText,
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

  const isLoading = modelsLoading || promptsLoading;
  const isEditing = editingPromptId !== null;

  if (isLoading) {
    return (
      <div className="container py-10 mx-auto max-w-4xl">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (modelsError || !modelsData?.success) {
    return (
      <div className="container py-10 mx-auto max-w-4xl">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <p className="text-destructive">
            {modelsError?.message ||
              modelsData?.error ||
              "Failed to load models"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          New Comparison
        </h1>
        <p className="text-muted-foreground text-sm">
          Select a prompt and models to compare their UI generation
          capabilities.
        </p>
      </div>

      <div className="space-y-6">
        {/* Prompt Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Prompt
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Prompt Selector */}
            <div className="flex gap-3">
              <Select
                value={selectedPromptId}
                onValueChange={(value) => {
                  setSelectedPromptId(value);
                  setIsPromptExpanded(false);
                  handleCancelEdit();
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a prompt..." />
                </SelectTrigger>
                <SelectContent>
                  {storedPrompts.map((prompt) => (
                    <SelectItem key={prompt.id} value={prompt.id.toString()}>
                      <span className="flex items-center gap-2">
                        {prompt.isDefault && (
                          <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                        )}
                        {prompt.title}
                      </span>
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_PROMPT_ID}>
                    <span className="flex items-center gap-2">
                      <Plus className="w-3 h-3 shrink-0" />
                      Write custom prompt...
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Prompt Input */}
            {isCustomPrompt && (
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-dashed">
                <Input
                  value={customPromptTitle}
                  onChange={(e) => setCustomPromptTitle(e.target.value)}
                  placeholder="Prompt title"
                  disabled={isSubmitting}
                />
                <Textarea
                  value={customPromptText}
                  onChange={(e) => setCustomPromptText(e.target.value)}
                  placeholder="Describe what you want the AI to build..."
                  className="min-h-[120px] resize-y"
                  disabled={isSubmitting}
                />
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveCustomPrompt}
                    disabled={
                      !customPromptTitle.trim() ||
                      !customPromptText.trim() ||
                      createPrompt.isPending
                    }
                  >
                    {createPrompt.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Prompt
                  </Button>
                </div>
              </div>
            )}

            {/* Prompt Preview (for stored prompts) */}
            {selectedPrompt && !isEditing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isPromptExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                    <span>
                      {isPromptExpanded ? "Hide" : "Show"} prompt details
                    </span>
                  </button>

                  {!selectedPrompt.isDefault && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => handleStartEdit(selectedPrompt)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-destructive hover:text-destructive"
                        onClick={() => handleDeletePrompt(selectedPrompt.id)}
                        disabled={deletePrompt.isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {isPromptExpanded && (
                  <div className="p-4 bg-muted/50 rounded-lg border text-sm">
                    <pre className="whitespace-pre-wrap font-sans leading-relaxed text-foreground/90">
                      {selectedPrompt.description}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Edit Mode */}
            {selectedPrompt && isEditing && (
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Prompt title"
                  disabled={updatePrompt.isPending}
                />
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Prompt description..."
                  className="min-h-[120px] resize-y"
                  disabled={updatePrompt.isPending}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={updatePrompt.isPending}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={
                      !editTitle.trim() ||
                      !editDescription.trim() ||
                      updatePrompt.isPending
                    }
                  >
                    {updatePrompt.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Model Selection */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                Models
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {selectedModels.length} selected
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {availableModels.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No models available
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableModels.map((model: ModelConfig) => {
                  const isSelected = selectedModels.includes(model.id);
                  return (
                    <button
                      key={model.id}
                      onClick={() => toggleModel(model.id)}
                      disabled={isSubmitting}
                      className={`
                        inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                        border transition-all duration-150 select-none
                        ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background hover:bg-muted border-border hover:border-primary/50"
                        }
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      <span
                        className={`
                          w-4 h-4 rounded border flex items-center justify-center shrink-0
                          transition-colors duration-150
                          ${
                            isSelected
                              ? "bg-primary-foreground/20 border-primary-foreground/30"
                              : "border-muted-foreground/30"
                          }
                        `}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </span>
                      <span className="font-medium">{model.modelName}</span>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 ${
                          isSelected
                            ? "bg-primary-foreground/20 text-primary-foreground border-0"
                            : ""
                        }`}
                      >
                        {model.providerName}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <Button
            size="lg"
            onClick={handleStartComparison}
            disabled={
              selectedModels.length === 0 ||
              isSubmitting ||
              !currentPromptText.trim()
            }
            className="min-w-[180px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                Start Comparison
                {selectedModels.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 bg-primary-foreground/20 text-primary-foreground border-0"
                  >
                    {selectedModels.length}
                  </Badge>
                )}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
