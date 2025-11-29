import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { BrowserRouter, Routes, Route } from "react-router";
import Requests from "./pages/Requests.tsx";
import Runs from "./pages/Runs.tsx";
import Layout from "./components/layout/index.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<App />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/runs" element={<Runs />} />
        </Route>
      </Routes>
    </QueryClientProvider>
  </BrowserRouter>,
);
