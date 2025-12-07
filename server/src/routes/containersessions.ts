import { Router } from "express";
import { findSessionContainer, getSession } from "../data/access";
import {
  createContainer,
  extractServerPort,
  getContainerPorts,
  getContainerStatus,
} from "../docker/manager";
import axios from "axios";

const router = Router();

const isContainerRunning = async (sessionId: number) => {
  const sessionContainer = await findSessionContainer(sessionId);
  if (!sessionContainer) {
    return false;
  }
  const containerStatus = await getContainerStatus(
    sessionContainer.containerId,
  );
  return containerStatus.Running ? sessionContainer.containerId : null;
};

router.post("/sessions/:id/setup", async (req, res) => {
  const sessionId = parseInt(req.params.id);

  try {
    const session = await getSession(sessionId);
    if (!session) {
      return res
        .status(404)
        .json({ success: false, error: "Session not found" });
    }

    if (session.status === "setup_pending" || session.status === "ready") {
      return res
        .status(400)
        .json({ success: false, error: "Session already setup or ready" });
    }

    const sessionContainer = await findSessionContainer(sessionId);

    if (sessionContainer) {
      // this auto-checks whether the container is running
      const containerStatus = await getContainerStatus(
        sessionContainer.containerId,
      );

      if (containerStatus.Running) {
        const ports = await getContainerPorts(sessionContainer.containerId);
        if (!ports) {
          return res
            .status(500)
            .json({ success: false, error: "Failed to get container ports" });
        }

        const serverPort = extractServerPort(ports);
        if (!serverPort) {
          return res
            .status(500)
            .json({ success: false, error: "Failed to extract server port" });
        }

        const { data } = await axios.post(
          `http://localhost:${serverPort}/setup`,
          {
            template: session.starterTemplate,
            sessionId,
          },
        );

        if (!data.success) {
          return res
            .status(500)
            .json({ success: false, error: "Failed to setup session" });
        } else {
          return res.json({ success: true, data: data.message });
        }
      } else {
        // here we'd need to restart the container
      }
    } else {
      // no db field means the container hasn't even been created yet, so we'd need to create
      // and start it, before asking for setup
    }
  } catch (error) {}
});

router.post("/sessions/:id/execute", async (req, res) => {
  const sessionId = parseInt(req.params.id);

  try {
    const session = await getSession(sessionId);
    if (!session) {
      return res
        .status(404)
        .json({ success: false, error: "Session not found" });
    }

    if (session.status !== "ready") {
      return res
        .status(400)
        .json({ success: false, error: "Session not ready" });
    }

    const containerId = await isContainerRunning(sessionId);
    if (containerId) {
      const ports = await getContainerPorts(containerId);
      if (!ports) {
        return res
          .status(500)
          .json({ success: false, error: "Failed to get container ports" });
      }

      const serverPort = extractServerPort(ports);
      if (!serverPort) {
        return res
          .status(500)
          .json({ success: false, error: "Failed to extract server port" });
      }

      const { data } = await axios.post(
        `http://localhost:${serverPort}/execute`,
        {
          sessionId,
          modelId: session.modelId,
          prompt: session.prompt,
        },
      );

      if (!data.success) {
        return res
          .status(500)
          .json({ success: false, error: "Failed to execute session" });
      } else {
        return res.json({ success: true, data: data.message });
      }
    } else {
    }
  } catch (error) {}
});

router.post("/sessions/:id/container", async (req, res) => {
  const sessionId = parseInt(req.params.id);

  try {
    const session = await getSession(sessionId);
    if (!session) {
      return res
        .status(404)
        .json({ success: false, error: "Session not found" });
    }

    const container = await findSessionContainer(sessionId);
    if (container) {
      const containerStatus = await getContainerStatus(container.containerId);
      return res.json({
        success: true,
        status: containerStatus,
      });
    } else {
      const newContainer = await createContainer(sessionId);
      if (newContainer) {
        return res.status(201).json({
          success: true,
          containerData: newContainer,
        });
      } else {
        return res.status(500).json({
          success: false,
          error: "Failed to create container",
        });
      }
    }
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: "Failed to create container" });
  }
});
