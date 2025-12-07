import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

const API_BASE = "http://localhost:3000";

// ==================== TYPES ====================

export type SessionStatus =
  | "uninitialized"
  | "setup_pending"
  | "setup_failed"
  | "ready"
  | "prompting"
  | "completed"
  | "failed";

export type DevServerStatus = "stopped" | "starting" | "running" | "error";

export interface Session {
  id: number;
  batchId: number | null;
  batchName?: string | null;
  opencodeSessionId: string | null;
  directory: string;
  modelId: string;
  providerId: string;
  starterTemplate: string;
  status: SessionStatus;
  error: string | null;
  port: number | null;
  devServerStatus: DevServerStatus;
  devServerPid: number | null;
}

export interface BatchWithoutSessions {
  id: number;
  name: string | null;
  prompt: string | null;
  createdAt: string;
  sessionCount?: number;
}

export interface Batch {
  id: number;
  name: string | null;
  prompt: string | null;
  createdAt: string;
  sessions: Session[];
}

export interface ModelConfig {
  id: string;
  modelName: string;
  providerId: string;
  providerName: string;
}

// ==================== PROMPTS ====================

export interface Prompt {
  id: number;
  title: string;
  description: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export const usePrompts = () => {
  return useQuery({
    queryKey: ["prompts"],
    queryFn: async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/prompts`);
        if (data.success) {
          return {
            prompts: data.data as Prompt[],
            success: true as const,
          };
        }
        return {
          prompts: [] as Prompt[],
          success: false as const,
          error: data.error as string,
        };
      } catch (error) {
        console.error("Error fetching prompts:", error);
        return {
          prompts: [] as Prompt[],
          success: false as const,
          error: "Failed to fetch prompts",
        };
      }
    },
  });
};

export const useCreatePrompt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      description,
    }: {
      title: string;
      description: string;
    }) => {
      const { data } = await axios.post(`${API_BASE}/prompts`, {
        title,
        description,
      });
      if (data.success) {
        return data.data as Prompt;
      }
      throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    },
  });
};

export const useUpdatePrompt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      title,
      description,
    }: {
      id: number;
      title: string;
      description: string;
    }) => {
      const { data } = await axios.put(`${API_BASE}/prompts/${id}`, {
        title,
        description,
      });
      if (data.success) {
        return data.data as Prompt;
      }
      throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    },
  });
};

export const useDeletePrompt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await axios.delete(`${API_BASE}/prompts/${id}`);
      if (data.success) {
        return true;
      }
      throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    },
  });
};

// ==================== MODELS ====================

export const useModels = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["models"],
    queryFn: async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/modelconfigs`);
        if (data.success) {
          return {
            models: data.data as ModelConfig[],
            success: true,
          };
        } else {
          return {
            models: [] as ModelConfig[],
            success: false,
            error: data.error,
          };
        }
      } catch (error) {
        console.error("Error fetching models:", error);
        return {
          models: [] as ModelConfig[],
          success: false,
          error: "Failed to fetch models",
        };
      }
    },
  });
  return { data, isLoading, error };
};

// ==================== PORTS ====================

export const useAvailablePorts = () => {
  return useQuery({
    queryKey: ["ports", "available"],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/ports/available`);
      if (data.success) {
        return data.data as {
          available: number[];
          used: number[];
          total: number;
        };
      }
      throw new Error(data.error);
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });
};

// ==================== BATCHES ====================

export const useBatches = () => {
  return useQuery({
    queryKey: ["batches"],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/batches`);
      if (data.success) {
        return data.data as BatchWithoutSessions[];
      }
      throw new Error(data.error);
    },
  });
};

export const useBatch = (batchId: number | null) => {
  return useQuery({
    queryKey: ["batches", batchId],
    queryFn: async () => {
      if (!batchId) return null;
      const { data } = await axios.get(`${API_BASE}/batches/${batchId}`);
      if (data.success) {
        return data.data as Batch;
      }
      throw new Error(data.error);
    },
    enabled: !!batchId,
    refetchInterval: 3000,
  });
};

export const useCreateBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      modelConfigs,
      prompt,
    }: {
      modelConfigs: { providerId: string; id: string }[];
      prompt?: string;
    }) => {
      const { data } = await axios.post(`${API_BASE}/batches`, {
        modelConfigs,
        prompt,
      });
      if (data.success) {
        return data.data;
      }
      throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
    },
  });
};

// ==================== SESSIONS ====================

export const useRunningSessions = () => {
  return useQuery({
    queryKey: ["sessions", "running"],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/sessions/running`);
      if (data.success) {
        return data.data as Session[];
      }
      throw new Error(data.error);
    },
    refetchInterval: 3000,
  });
};

export const useRunSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      message,
    }: {
      sessionId: number;
      message?: string;
    }) => {
      const { data } = await axios.post(
        `${API_BASE}/sessions/${sessionId}/run`,
        {
          message,
        },
      );
      if (data.success) {
        return data.data;
      }
      throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["ports"] });
    },
  });
};

export const useStartDevServer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: number) => {
      const { data } = await axios.post(
        `${API_BASE}/sessions/${sessionId}/start-dev`,
      );
      if (data.success) {
        return data.data;
      }
      throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["ports"] });
    },
  });
};

export const useStopDevServer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: number) => {
      const { data } = await axios.post(
        `${API_BASE}/sessions/${sessionId}/stop-dev`,
      );
      if (data.success) {
        return data.data;
      }
      throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["ports"] });
    },
  });
};
