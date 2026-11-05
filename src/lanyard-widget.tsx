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
    name="Faiq Hammam Mutaqin"
    role="AI / ML & FULL-STACK ENGINEER"
    strapText="Faiq Hammam Mutaqin"
    strapLabel="AI / ML · FULL-STACK"
    strapColor="#111827"
    inkColor="#b79a62"
    cardColor="#f4efe3"
    cardWidth={220}
    height="100%"
    className="lanyard-badge-root"
    front={
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          background:
            "radial-gradient(ellipse at 50% 42%, #fffdf7 0%, #f4efe3 64%, #e8dfce 100%)",
          color: "#171717",
          textAlign: "center",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 9,
            border: "1px solid rgba(164, 132, 72, 0.62)",
            borderRadius: 7,
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 14,
            border: "1px solid rgba(164, 132, 72, 0.22)",
            borderRadius: 5,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 28,
            left: "50%",
            display: "grid",
            width: 43,
            height: 43,
            placeItems: "center",
            transform: "translateX(-50%)",
            border: "1px solid #b79a62",
            borderRadius: "50%",
            color: "#9b7b42",
            fontFamily: "Georgia, serif",
            fontSize: 16,
            letterSpacing: "-0.08em",
          }}
        >
          FH
        </div>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 84,
            left: "50%",
            width: 32,
            height: 1,
            transform: "translateX(-50%)",
            background: "#b79a62",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 103,
            left: 12,
            right: 12,
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 19,
            fontWeight: 600,
            lineHeight: 1.16,
            letterSpacing: "0.025em",
          }}
        >
          FAIQ HAMMAM
          <br />
          MUTAQIN
        </div>
        <div
          style={{
            position: "absolute",
            top: 158,
            left: 10,
            right: 10,
            color: "#927744",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 6,
            fontWeight: 700,
            letterSpacing: "0.17em",
          }}
        >
          AI / ML &amp; FULL-STACK ENGINEER
        </div>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            left: 0,
            height: "29%",
            background:
              "linear-gradient(135deg, #24231f 0%, #111111 58%, #29251d 100%)",
            clipPath: "polygon(0 26%, 50% 0, 100% 26%, 100% 100%, 0 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 0,
            bottom: 23,
            left: 0,
            color: "#d0b779",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 6,
            letterSpacing: "0.2em",
          }}
        >
          BUILT WITH PURPOSE
        </div>
      </div>
    }
    back={
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          background: "#f4efe3",
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
            color: "#927744",
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
            background: "#181716",
            color: "#d0b779",
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
