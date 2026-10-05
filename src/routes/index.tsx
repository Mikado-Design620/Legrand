import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceScreen } from "@/components/workspace/WorkspaceScreen";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Legrand SPD AI Trainer — Interactive Product Workspace" },
      {
        name: "description",
        content:
          "Premium AI-powered training workspace for Legrand Surge Protection Devices. Explore an interactive 3D SPD with voice-enabled AI guidance.",
      },
      { property: "og:title", content: "Legrand SPD AI Trainer" },
      {
        property: "og:description",
        content:
          "Interactive AI Trainer + 3D SPD digital twin + knowledge panel.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <WorkspaceScreen />;
}
