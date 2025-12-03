import { Router } from "express";
import { getProviders } from "../utils";
import { client } from "../client";
import { getAvailablePorts, getUsedPorts } from "../data/access";

const router: Router = Router();

router.get("/modelconfigs", async (req, res) => {
  const providersData = await getProviders(client);
  if (!providersData) {
    return res
      .status(500)
      .json({ success: false, error: "Failed to get providers" });
  }
  const response: {
    id: string;
    modelName: string;
    providerId: string;
    providerName: string;
  }[] = [];
  const providers = providersData.providers;
  for (const provider of providers) {
    const providerId = provider.id;
    const providerName = provider.name;
    const models = Object.values(provider.models);
    for (const model of models) {
      response.push({
        id: model.id,
        modelName: model.name,
        providerId,
        providerName,
      });
    }
  }
  res.json({
    success: true,
    data: response,
  });
});

// Get available ports
router.get("/ports/available", async (req, res) => {
  try {
    const available = await getAvailablePorts();
    const used = await getUsedPorts();
    res.json({
      success: true,
      data: {
        available,
        used,
        total: available.length + used.length,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: errorMessage });
  }
});

export default router;
