import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export const useModels = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["models"],
    queryFn: async () => {
      try {
        const { data } = await axios.get("http://localhost:3000/modelconfigs");
        if (data.success) {
          return {
            models: data.data,
            success: true,
          };
        } else {
          return {
            models: [],
            success: false,
            error: data.error,
          };
        }
      } catch (error) {
        console.error("Error fetching models:", error);
        return {
          models: [],
          success: false,
          error: "Failed to fetch models",
        };
      }
    },
  });
  return { data, isLoading, error };
};
