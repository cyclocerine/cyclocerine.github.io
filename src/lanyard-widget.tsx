import { createRoot } from "react-dom/client";
import LanyardBadge from "../components/ui/lanyard-badge";
import "./widget.css";

const mountNode = document.getElementById("lanyardBadgeRoot");

if (!mountNode) {
  throw new Error("Missing #lanyardBadgeRoot mount point for the lanyard badge.");
}

createRoot(mountNode).render(
  <LanyardBadge
    title="Faiq Hammam Mutaqin"
    subtitle="AI / ML · FULL-STACK ENGINEER"
    name="Faiq Hammam Mutaqin"
    role="AI / ML & FULL-STACK ENGINEER"
    strapText="Faiq Hammam Mutaqin"
    strapLabel="AI / ML · FULL-STACK"
    strapColor="#111827"
    inkColor="#10b981"
    cardColor="#f5f2e9"
    cardWidth={220}
    height="100%"
    className="lanyard-badge-root"
  />,
);
