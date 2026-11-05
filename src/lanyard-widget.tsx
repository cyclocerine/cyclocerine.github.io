import { createRoot } from "react-dom/client";
import { QRCodeSVG } from "qrcode.react";
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
    back={
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          background: "#f5f2e9",
          color: "#111827",
          textAlign: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
            padding: 7,
            background: "#ffffff",
            borderRadius: 8,
            boxShadow: "0 2px 8px rgba(17, 24, 39, 0.12)",
            lineHeight: 0,
          }}
        >
          <QRCodeSVG
            value="https://github.com/cyclocerine"
            size={112}
            level="H"
            bgColor="#ffffff"
            fgColor="#111827"
          />
        </div>
        <div
          style={{
            position: "absolute",
            top: 154,
            left: 10,
            right: 10,
            color: "#047857",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 7,
            fontWeight: 700,
            letterSpacing: "0.12em",
          }}
        >
          SCAN TO VISIT GITHUB
        </div>
        <div
          style={{
            position: "absolute",
            top: 171,
            left: 10,
            right: 10,
            fontFamily: "var(--font-tech, sans-serif)",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          FAIQ HAMMAM MUTAQIN
        </div>
        <div
          style={{
            position: "absolute",
            top: 190,
            left: 10,
            right: 10,
            color: "#4b5563",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 7,
          }}
        >
          github.com/cyclocerine
        </div>
        <div
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            left: 0,
            height: "34%",
            overflow: "hidden",
            borderTopLeftRadius: 38,
            background: "#111827",
            color: "#10b981",
          }}
          aria-hidden="true"
        >
          <span
            style={{
              position: "absolute",
              top: 27,
              right: 0,
              left: 0,
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 7,
              letterSpacing: "0.16em",
            }}
          >
            AI / ML · FULL-STACK
          </span>
        </div>
      </div>
    }
  />,
);
