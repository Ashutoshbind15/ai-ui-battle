import { useState } from "react";
import {
  Maximize2,
  Minimize2,
  RefreshCw,
  ExternalLink,
  Play,
  Square,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  useBatches,
  useBatch,
  useRunningSessions,
  useRunSession,
  useStartDevServer,
  useStopDevServer,
  useAvailablePorts,
  type Session,
  type BatchWithoutSessions,
} from "@/hooks/queries";

// Status badge component
function SessionStatusBadge({ status }: { status: Session["status"] }) {
  const statusConfig = {
    setup_pending: {
      label: "Setting up",
      variant: "outline" as const,
      icon: Clock,
    },
    setup_failed: {
      label: "Setup Failed",
      variant: "destructive" as const,
      icon: AlertCircle,
    },
    ready: {
      label: "Ready",
      variant: "secondary" as const,
      icon: CheckCircle2,
    },
    prompting: { label: "Prompting", variant: "default" as const, icon: Zap },
    completed: {
      label: "Completed",
      variant: "secondary" as const,
      icon: CheckCircle2,
    },
    failed: {
      label: "Failed",
      variant: "destructive" as const,
      icon: AlertCircle,
    },
    uninitialized: {
      label: "Uninitialized",
      variant: "outline" as const,
      icon: Clock,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

// Dev server status badge
function DevServerStatusBadge({
  status,
}: {
  status: Session["devServerStatus"];
}) {
  const statusConfig = {
    stopped: { label: "Stopped", variant: "outline" as const, icon: Square },
    starting: {
      label: "Starting",
      variant: "secondary" as const,
      icon: Loader2,
    },
    running: { label: "Running", variant: "default" as const, icon: Play },
    error: {
      label: "Error",
      variant: "destructive" as const,
      icon: AlertCircle,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={`gap-1 ${status === "running" ? "bg-green-600 hover:bg-green-700" : ""}`}
    >
      <Icon
        className={`w-3 h-3 ${status === "starting" ? "animate-spin" : ""}`}
      />
      {config.label}
    </Badge>
  );
}

// Session card component
function SessionCard({
  session,
  expanded,
  onExpand,
}: {
  session: Session;
  expanded: boolean;
  onExpand: () => void;
}) {
  const runSession = useRunSession();
  const startDev = useStartDevServer();
  const stopDev = useStopDevServer();

  const isDevRunning = session.devServerStatus === "running";
  const isDevStarting = session.devServerStatus === "starting";
  const canStartDev =
    session.status === "completed" && session.devServerStatus === "stopped";
  const canRun =
    session.status === "uninitialized" || session.status === "setup_failed";

  const handleRunSession = () => {
    runSession.mutate({ sessionId: session.id });
  };

  const handleStartDev = () => {
    startDev.mutate(session.id);
  };

  const handleStopDev = () => {
    stopDev.mutate(session.id);
  };

  return (
    <div className="flex flex-col h-full min-h-[400px] rounded-xl border bg-card shadow-sm overflow-hidden ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="font-medium text-sm">
            {session.providerId}/{session.modelId}
          </div>
          <SessionStatusBadge status={session.status} />
          <DevServerStatusBadge status={session.devServerStatus} />
          {session.port && (
            <Badge variant="outline" className="text-xs">
              Port: {session.port}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Run session button */}
          {canRun && (
            <Button
              variant="default"
              size="sm"
              className="h-7 gap-1"
              onClick={handleRunSession}
              disabled={runSession.isPending}
            >
              {runSession.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Play className="w-3 h-3" />
              )}
              Run
            </Button>
          )}

          {/* Start dev server button */}
          {canStartDev && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1"
              onClick={handleStartDev}
              disabled={startDev.isPending}
            >
              {startDev.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Play className="w-3 h-3" />
              )}
              Start Dev
            </Button>
          )}

          {/* Stop dev server button */}
          {(isDevRunning || isDevStarting) && (
            <Button
              variant="destructive"
              size="sm"
              className="h-7 gap-1"
              onClick={handleStopDev}
              disabled={stopDev.isPending}
            >
              {stopDev.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Square className="w-3 h-3" />
              )}
              Stop
            </Button>
          )}

          {/* Open in new tab */}
          {session.port && isDevRunning && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-7 w-7"
              title="Open in new tab"
              onClick={() =>
                window.open(`http://localhost:${session.port}`, "_blank")
              }
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          )}

          {/* Expand/minimize */}
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7"
            onClick={onExpand}
            title={expanded ? "Minimize" : "Maximize"}
          >
            {expanded ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white relative group">
        {isDevRunning && session.port ? (
          <iframe
            src={`http://localhost:${session.port}`}
            className="w-full h-full border-0"
            title={`${session.providerId}/${session.modelId} Preview`}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center p-8">
              {session.status === "setup_pending" && (
                <>
                  <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-muted-foreground/50" />
                  <p className="text-sm">Setting up environment...</p>
                </>
              )}
              {session.status === "prompting" && (
                <>
                  <Zap className="w-8 h-8 mx-auto mb-3 text-yellow-500 animate-pulse" />
                  <p className="text-sm">AI is coding...</p>
                </>
              )}
              {session.status === "completed" &&
                session.devServerStatus === "stopped" && (
                  <>
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-green-500" />
                    <p className="text-sm mb-3">Session completed</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleStartDev}
                      disabled={startDev.isPending}
                    >
                      {startDev.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      Start Dev Server
                    </Button>
                  </>
                )}
              {session.devServerStatus === "starting" && (
                <>
                  <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-blue-500" />
                  <p className="text-sm">Starting dev server...</p>
                </>
              )}
              {session.status === "failed" && (
                <>
                  <AlertCircle className="w-8 h-8 mx-auto mb-3 text-red-500" />
                  <p className="text-sm text-red-600">Session failed</p>
                  {session.error && (
                    <p className="text-xs text-muted-foreground mt-2 max-w-xs">
                      {session.error}
                    </p>
                  )}
                </>
              )}
              {session.devServerStatus === "error" && (
                <>
                  <AlertCircle className="w-8 h-8 mx-auto mb-3 text-red-500" />
                  <p className="text-sm text-red-600">Dev server error</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Batch selector component
function BatchSelector({
  batches,
  selectedBatchId,
  onSelect,
}: {
  batches: BatchWithoutSessions[];
  selectedBatchId: number | null;
  onSelect: (id: number | null) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedBatchId?.toString() ?? ""}
        onValueChange={(value) => onSelect(value ? parseInt(value) : null)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select a batch..." />
        </SelectTrigger>
        <SelectContent>
          {batches.map((batch) => (
            <SelectItem key={batch.id} value={batch.id.toString()}>
              {batch.name} ({batch.sessionCount ?? 0} sessions)
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Port status indicator
function PortStatus() {
  const { data: ports } = useAvailablePorts();

  if (!ports) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
      <span>
        {ports.available.length} ports available / {ports.used.length} in use
      </span>
    </div>
  );
}

export default function Runs() {
  const [expandedRun, setExpandedRun] = useState<number | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);

  const { data: batches, refetch: refetchBatches } = useBatches();
  const { data: selectedBatch } = useBatch(selectedBatchId);
  const { data: runningSessions } = useRunningSessions();

  const handleExpand = (id: number) => {
    if (expandedRun === id) {
      setExpandedRun(null);
    } else {
      setExpandedRun(id);
    }
  };

  // Determine which sessions to show - use selectedBatch from useBatch hook for full session data
  const sessionsToShow: Session[] =
    selectedBatch?.sessions ?? runningSessions ?? [];

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden bg-muted/10">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-background/50 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Live Comparison
          </h1>
          <PortStatus />
        </div>
        <div className="flex items-center gap-3">
          {batches && batches.length > 0 && (
            <BatchSelector
              batches={batches}
              selectedBatchId={selectedBatchId}
              onSelect={setSelectedBatchId}
            />
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => refetchBatches()}
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Batch Prompt Banner */}
      {selectedBatch?.prompt && (
        <div className="px-6 py-2 border-b bg-muted/30">
          <Card className="border-muted bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-0.5">
                  Prompt:
                </span>
                <p className="text-sm text-foreground flex-1 whitespace-pre-wrap">
                  {selectedBatch.prompt}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-4 overflow-auto">
        {sessionsToShow.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p className="text-lg mb-2">No sessions to display</p>
              <p className="text-sm">
                {batches && batches.length > 0
                  ? "Select a batch from the dropdown to view sessions"
                  : "Create a batch from the Requests page to get started"}
              </p>
            </div>
          </div>
        ) : (
          <div
            className={`grid gap-4 h-full ${
              expandedRun ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
            } transition-all duration-300`}
          >
            {sessionsToShow.map((session) => {
              if (expandedRun && expandedRun !== session.id) return null;

              return (
                <SessionCard
                  key={session.id}
                  session={session}
                  expanded={expandedRun === session.id}
                  onExpand={() => handleExpand(session.id)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
