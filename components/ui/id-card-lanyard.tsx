"use client";

import React, { useEffect, useRef, useState } from "react";

/* ==========================================================================
   IDCardLanyard — React/shadcn port.

   This is the React source of truth. The live cyclocerine.github.io site is a
   static GitHub Pages build with no bundler, so the shipped page runs the
   equivalent vanilla implementation in assets/id-card-lanyard.js (+ .css).
   Behaviour is kept in lockstep: Verlet cord, drag physics, tap/Enter flip,
   pointer tilt, generated barcode + QR.

   Requires: React 18+, Tailwind (for the host layout only — the card styles
   below are self-contained), TypeScript.
   ========================================================================== */

export interface IDCardLanyardProps {
  /** Full name shown on the card and used for the back-face signature. */
  name?: string;
  /** Job title / role line under the name. */
  role?: string;
  /** Wordmark shown top-left on the front face. */
  brand?: string;
  /** Small caption under the wordmark. */
  brandTagline?: string;
  /** Three short values stacked top-right (e.g. your working pillars). */
  pillars?: [string, string, string];
  /** Optional portrait. Falls back to the generated SVG avatar when omitted. */
  photoUrl?: string;
  location?: string;
  idNumber?: string;
  validThru?: string;
  /** URL/label shown next to the back-face QR code. */
  site?: string;
  /** Social links shown as small icon buttons on the back face. Omit any you don't want rendered. */
  githubUrl?: string;
  linkedinUrl?: string;
  instagramUrl?: string;
  /** Horizontal anchor for the lanyard clip: a percentage ("50%"), a px value ("120px"), or "calc(100% - 130px)" to anchor from the right edge. */
  anchorX?: string;
  /** Vertical anchor offset in px from the top of the viewport. */
  anchorY?: number;
  /** Stacking order of the fixed overlay. Raise this if the card renders under other fixed UI. */
  zIndex?: number;
  /** Show the "drag to swing" hint until the visitor first interacts with the card. */
  showHint?: boolean;
  /**
   * Layout mode.
   * `overlay` (default) pins the card to the viewport corner like a badge.
   * `inline` makes it hang inside the parent box — no border, no background —
   * which is what a hero column wants.
   */
  variant?: "overlay" | "inline";
  /** Height of the hanging area in inline mode. */
  stageHeight?: number | string;
  /** Diameter/proportion of the card. */
  className?: string;
}

const CSS = `
.idcl-root{
  --idcl-accent:#5b8cff;
  --idcl-card:#faf7f1;
  --idcl-card-2:#efeadf;
  --idcl-card-ink:#15171d;
  --idcl-card-soft:#666c78;
  --idcl-card-line:#e1dbcb;
  --idcl-font-display:'Space Grotesk','Archivo','Arial Narrow',sans-serif;
  --idcl-font-mono:'JetBrains Mono','Consolas',monospace;
  --idcl-font-script:'Caveat',cursive;
  font-family:var(--idcl-font-mono),system-ui,sans-serif;
}
.idcl-root *{ box-sizing:border-box; }

/* Host. No border, no background, no clipping — the card hangs free. */
.idcl-host{ position:relative; width:100%; overflow:visible; pointer-events:none; }
.idcl-stage{ position:absolute; inset:0; z-index:var(--idcl-z,2); overflow:visible; pointer-events:none; }

.idcl-rope{ position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }

.idcl-rail{
  position:absolute; top:0; width:64px; height:6px;
  transform:translateX(-50%);
  background:linear-gradient(180deg,#3a4150,#21252f);
  border-radius:0 0 4px 4px;
  box-shadow:0 2px 6px rgba(0,0,0,.35);
  pointer-events:none;
}

.idcl-card{
  position:absolute; top:0; left:0;
  width:clamp(128px,40%,196px);
  aspect-ratio:236 / 460;
  font-size:clamp(6.5px,2.2vw,11.4px);
  perspective:1400px;
  transform-origin:top center;
  cursor:grab; touch-action:pan-y; user-select:none; -webkit-user-select:none;
  pointer-events:auto; will-change:transform;
}
.idcl-card:active{ cursor:grabbing; }
.idcl-card:focus-visible{ outline:2px solid var(--idcl-accent); outline-offset:6px; border-radius:1.2em; }

.idcl-flipper{
  position:relative; width:100%; height:100%;
  transform-style:preserve-3d;
  transition:transform 620ms cubic-bezier(.34,1.2,.4,1);
}
.idcl-card.idcl-flipped .idcl-flipper{ transform:rotateY(180deg); }

.idcl-face{
  position:absolute; inset:0;
  display:flex; flex-direction:column;
  padding:1em 1em .875em;
  border-radius:1.1em;
  backface-visibility:hidden; -webkit-backface-visibility:hidden;
  box-shadow:0 32px 60px -16px rgba(0,0,0,.55),0 10px 20px -8px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.65),inset 0 0 0 1px rgba(0,0,0,.05);
}
.idcl-face::before{
  content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none;
  background:linear-gradient(180deg,rgba(255,255,255,.55) 0%,transparent 24%),radial-gradient(rgba(0,0,0,.07) 1px,transparent 1.3px) 0 0/3px 3px;
  mix-blend-mode:multiply; opacity:.6;
}
.idcl-face::after{
  content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none;
  background:radial-gradient(circle at var(--mx,50%) var(--my,50%),rgba(255,255,255,.6),transparent 40%);
  mix-blend-mode:overlay; opacity:0; transition:opacity .3s ease;
}
.idcl-card.idcl-hovering .idcl-face::after{ opacity:1; }

.idcl-front{ background:linear-gradient(165deg,var(--idcl-card),var(--idcl-card-2)); align-items:stretch; text-align:left; }
.idcl-back{ background:linear-gradient(165deg,var(--idcl-card-2),var(--idcl-card)); transform:rotateY(180deg); }

.idcl-holo{
  position:absolute; top:.875em; bottom:.875em; right:.3em; width:.375em; border-radius:.3em;
  background:repeating-linear-gradient(125deg,#eef1f7 0%,#cfd6e4 10%,#b9c2d6 20%,#e7ebf3 30%,#eef1f7 40%);
  background-size:220% 220%;
  animation:idcl-foil 7s linear infinite;
  box-shadow:inset 0 0 0 1px rgba(0,0,0,.1),0 0 6px rgba(255,255,255,.3);
  pointer-events:none;
}
@keyframes idcl-foil{ to{ background-position:220% 0%; } }

.idcl-hole{ width:2em; height:.56em; background:var(--idcl-card-ink); border-radius:.35em; margin:0 auto .6em; flex-shrink:0; opacity:.85; }

.idcl-header{ display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:.75em; }
.idcl-brand{ display:flex; align-items:flex-start; gap:.4em; }
.idcl-brand-mark{ font-size:.75em; color:var(--idcl-accent); line-height:1; margin-top:.08em; }
.idcl-brand-text{ display:flex; flex-direction:column; }
.idcl-brand-text b{ font-family:var(--idcl-font-display); font-weight:700; font-size:.72em; letter-spacing:.01em; color:var(--idcl-card-ink); line-height:1.2; }
.idcl-brand-text small{ font-family:var(--idcl-font-mono); font-size:.4em; letter-spacing:.09em; text-transform:uppercase; color:var(--idcl-card-soft); }
.idcl-pillars{ display:flex; flex-direction:column; align-items:flex-end; gap:.06em; }
.idcl-pillars span{ font-family:var(--idcl-font-mono); font-size:.44em; letter-spacing:.1em; text-transform:uppercase; color:var(--idcl-card-soft); white-space:nowrap; }
.idcl-pillars i{ width:1em; height:2px; background:var(--idcl-card-ink); margin-top:.2em; }

.idcl-photo{
  position:relative; width:100%; height:7em; border-radius:.625em;
  background:#eae7de; overflow:hidden; margin-bottom:.75em; flex-shrink:0;
  box-shadow:inset 0 0 0 1px rgba(0,0,0,.08),inset 0 2px 6px rgba(0,0,0,.12);
}
.idcl-photo img,.idcl-photo svg{ display:block; width:100%; height:100%; object-fit:cover; object-position:50% 28%; }
.idcl-photo::after{ content:""; position:absolute; inset:0; pointer-events:none; background:linear-gradient(180deg,rgba(255,255,255,.16),transparent 32%,rgba(0,0,0,.12)); }
.idcl-verified{
  position:absolute; right:-.3em; bottom:-.3em; z-index:2;
  display:flex; align-items:center; justify-content:center;
  width:1.375em; height:1.375em; border-radius:50%;
  background:linear-gradient(160deg,var(--idcl-accent),color-mix(in srgb,var(--idcl-accent) 62%,#101418));
  box-shadow:0 2px 6px rgba(0,0,0,.4),0 0 0 .19em var(--idcl-card);
}
.idcl-verified svg{ width:.7em; height:.7em; }

.idcl-name{ margin:0 0 .12em; font-family:var(--idcl-font-display); font-weight:700; font-size:1.125em; letter-spacing:-.01em; line-height:1.1; color:var(--idcl-card-ink); }
.idcl-role{ margin:0 0 .625em; font-size:.625em; font-weight:600; letter-spacing:.09em; text-transform:uppercase; color:var(--idcl-card-soft); }

.idcl-divider{ width:100%; height:1px; margin-bottom:.625em; background:var(--idcl-card-line); }

.idcl-idrow{ width:100%; display:flex; justify-content:space-between; align-items:flex-start; gap:.625em; }
.idcl-idrow-labels{ display:flex; flex-direction:column; gap:.3em; font-family:var(--idcl-font-mono); min-width:0; }
.idcl-idrow-labels div{ display:flex; gap:.5em; align-items:baseline; }
.idcl-idrow-labels span{ width:3.5em; flex-shrink:0; font-size:.47em; letter-spacing:.06em; text-transform:uppercase; color:var(--idcl-card-soft); }
.idcl-idrow-labels b{ font-size:.59em; font-weight:600; color:var(--idcl-card-ink); }

.idcl-footer{ width:100%; margin-top:auto; padding-top:.625em; border-top:1px solid var(--idcl-card-line); text-align:center; font-family:var(--idcl-font-mono); font-size:.53em; letter-spacing:.14em; text-transform:uppercase; color:var(--idcl-card-soft); }
.idcl-footer i{ color:var(--idcl-card-line); font-style:normal; margin:0 .3em; }

.idcl-stripe{ width:100%; height:1.875em; background:repeating-linear-gradient(45deg,#1b1d24,#1b1d24 6px,#26282f 6px,#26282f 12px); border-radius:.19em; margin-bottom:.75em; }
.idcl-barcode{ display:flex; align-items:flex-end; gap:2px; height:2em; width:100%; background:#fff; border-radius:.19em; padding:0 .25em; margin-bottom:.5em; overflow:hidden; }
.idcl-barcode span{ width:2px; background:#1a1c22; }
.idcl-idnum{ margin:0 0 .5em; font-family:var(--idcl-font-mono); font-size:.625em; font-weight:600; color:var(--idcl-card-ink); letter-spacing:.03em; display:flex; justify-content:space-between; font-variant-numeric:tabular-nums; }
.idcl-idnum em{ font-style:normal; color:var(--idcl-card-soft); }

.idcl-backrow{ display:flex; gap:.75em; align-items:flex-start; margin-bottom:.625em; }
.idcl-qr{ display:grid; grid-template-columns:repeat(9,1fr); gap:1px; width:3.625em; height:3.625em; background:#fff; padding:.25em; border-radius:.25em; flex-shrink:0; box-shadow:0 0 0 1px var(--idcl-card-line); }
.idcl-qr i{ background:transparent; }
.idcl-qr i.on{ background:#181a20; }

.idcl-scan{ font-family:var(--idcl-font-mono); font-size:.525em; color:var(--idcl-card-soft); line-height:1.5; padding-top:.125em; text-align:left; min-width:0; }
.idcl-scan b{ color:var(--idcl-card-ink); display:block; font-size:1.07em; margin-bottom:.15em; letter-spacing:.03em; overflow-wrap:anywhere; }

.idcl-sig{ margin-top:.75em; }
.idcl-sig .idcl-script{ font-family:var(--idcl-font-script); font-size:1.6em; color:var(--idcl-card-ink); line-height:1; }
.idcl-sig small{ display:block; font-family:var(--idcl-font-mono); font-size:.5em; letter-spacing:.08em; text-transform:uppercase; color:var(--idcl-card-soft); border-top:1px solid var(--idcl-card-line); margin-top:.25em; padding-top:.25em; }

.idcl-connect{ display:flex; align-items:center; justify-content:space-between; margin-top:auto; padding-top:.6em; }
.idcl-connect>span{ font-family:var(--idcl-font-mono); font-size:.5em; letter-spacing:.1em; text-transform:uppercase; color:var(--idcl-card-soft); }
.idcl-connect-icons{ display:flex; gap:.375em; }
.idcl-connect-icons a{
  width:1.5em; height:1.5em; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  border:1px solid var(--idcl-card-line); color:var(--idcl-card-soft);
  transition:border-color .15s ease,color .15s ease,transform .15s ease;
}
.idcl-connect-icons a:hover{ border-color:var(--idcl-accent); color:var(--idcl-accent); transform:translateY(-1px); }
.idcl-connect-icons svg{ width:.75em; height:.75em; }

.idcl-hint{
  position:absolute; bottom:1em; left:50%; transform:translateX(-50%);
  display:flex; align-items:center; gap:.4em;
  background:rgba(10,12,16,.72); color:#f3f0e9;
  padding:.45em .9em; border-radius:999px;
  font-family:var(--idcl-font-mono); font-size:9px; letter-spacing:.03em;
  pointer-events:none; white-space:nowrap;
  opacity:1; transition:opacity .4s ease;
}
.idcl-hint.idcl-hint-hidden{ opacity:0; }
.idcl-hint svg{ width:13px; height:13px; opacity:.75; flex-shrink:0; }

@media (prefers-reduced-motion: reduce){
  .idcl-holo{ animation:none; }
  .idcl-flipper{ transition:none; }
  .idcl-face::after{ transition:none; }
}
`;

const NUM_POINTS = 13;
const FRICTION = 0.98;
const CONSTRAINT_ITERATIONS = 6;
const TAP_THRESHOLD = 6;
const MAX_TILT = 9;

type Pt = { x: number; y: number; ox: number; oy: number };

export function IDCardLanyard({
  name = "Faiq Hammam",
  role = "IT Engineer",
  brand = "FAIQ HAMMAM",
  brandTagline = "IT Engineer",
  pillars = ["AI / ML", "Full-stack", "Web3"],
  photoUrl,
  location = "Yogyakarta, ID",
  idNumber = "FH-2026",
  validThru = "2026 – 2029",
  site = "cyclocerine.me",
  githubUrl,
  linkedinUrl,
  instagramUrl,
  anchorX = "calc(100% - 130px)",
  anchorY = 6,
  zIndex = 60,
  showHint = true,
  variant = "overlay",
  stageHeight = 560,
  className = "",
}: IDCardLanyardProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const barcodeRef = useRef<HTMLDivElement>(null);
  const qrBackRef = useRef<HTMLDivElement>(null);
  const [interacted, setInteracted] = useState(false);
  const [flipped, setFlipped] = useState(false);

  // keep the display fonts available (idempotent across instances)
  useEffect(() => {
    const id = "idcl-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Work+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&family=Caveat:wght@600;700&display=swap";
    document.head.appendChild(link);
  }, []);

  /* generated barcode + QR ------------------------------------------------- */
  useEffect(() => {
    const barcode = barcodeRef.current;
    if (barcode && !barcode.childElementCount) {
      for (let i = 0; i < 30; i++) {
        const bar = document.createElement("span");
        bar.style.height = ((i * 37) % 100 > 40 ? 100 : 55) + "%";
        barcode.appendChild(bar);
      }
    }
    const qr = qrBackRef.current;
    if (qr && !qr.childElementCount) {
      const fixed = new Set([
        0, 1, 2, 9, 10, 11, 18, 19, 20,
        6, 7, 8, 15, 16, 17, 24, 25, 26,
        54, 55, 56, 63, 64, 65, 72, 73, 74,
      ]);
      for (let i = 0; i < 81; i++) {
        const cell = document.createElement("i");
        if (fixed.has(i) || (i * 928371) % 97 < 46) cell.className = "on";
        qr.appendChild(cell);
      }
    }
  }, []);

  /* physics + interaction -------------------------------------------------- */
  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const rail = railRef.current;
    const card = cardRef.current;
    if (!stage || !canvas || !rail || !card) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 1;
    let height = 1;
    let anchor = { x: 0, y: 0 };
    let restLength = 100;
    let segmentLength = 25;
    let holeY = 0;
    let points: Pt[] = [];

    let dragging = false;
    let pointerId: number | null = null;
    let downPos = { x: 0, y: 0 };
    let pointer = { x: 0, y: 0 };
    let lastMove = { x: 0, y: 0, t: 0 };
    let velocity = { x: 0, y: 0 };
    const tiltTarget = { x: 0, y: 0 };
    const tiltCurrent = { x: 0, y: 0 };
    let rafId = 0;
    let running = false;

    const resolveAnchorX = () => {
      const v = anchorX.trim();
      const calc = v.match(/^calc\(\s*100%\s*-\s*([\d.]+)px\s*\)$/);
      if (calc) return width - parseFloat(calc[1]);
      if (v.endsWith("%")) return width * (parseFloat(v) / 100);
      const px = parseFloat(v);
      return Number.isFinite(px) ? px : width / 2;
    };

    const layout = () => {
      const rect = stage.getBoundingClientRect();
      width = rect.width || 1;
      height = rect.height || 1;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cardH = card.offsetHeight || width * (460 / 236);
      // every internal size is em-based, so the base font-size drives scale
      const base = Math.max(5.5, (card.offsetWidth || width * 0.4) * (16 / 236));
      card.style.fontSize = base.toFixed(3) + "px";
      holeY = base * 0.84;

      anchor = {
        x: variant === "inline" ? width * 0.5 : resolveAnchorX(),
        y: Math.max(18, anchorY > 6 ? anchorY : base * 1.4),
      };
      rail.style.left = anchor.x + "px";
      rail.style.top = anchor.y - 3 + "px";

      const preferred = Math.min(width * 0.62, base * 9);
      const available = height - cardH - anchor.y - base * 5.8;
      restLength = Math.max(base * 3, Math.min(preferred, available));
      segmentLength = restLength / (NUM_POINTS - 1);
      card.style.transformOrigin = `50% ${holeY}px`;

      points = Array.from({ length: NUM_POINTS }, (_, i) => {
        const y = anchor.y + i * segmentLength;
        return { x: anchor.x, y, ox: anchor.x, oy: y };
      });
      pointer = { x: anchor.x, y: anchor.y + restLength };
      draw();
    };

    const simulate = () => {
      for (let i = 1; i < points.length; i++) {
        if (dragging && i === points.length - 1) continue;
        const p = points[i];
        const vx = (p.x - p.ox) * FRICTION;
        const vy = (p.y - p.oy) * FRICTION;
        p.ox = p.x;
        p.oy = p.y;
        p.x += vx;
        p.y += vy + 0.55;
      }

      points[0].x = anchor.x;
      points[0].y = anchor.y;

      if (dragging) {
        const last = points[points.length - 1];
        last.x = pointer.x;
        last.y = pointer.y;
        last.ox = pointer.x - velocity.x;
        last.oy = pointer.y - velocity.y;
      }

      for (let iter = 0; iter < CONSTRAINT_ITERATIONS; iter++) {
        for (let i = 0; i < points.length - 1; i++) {
          const p1 = points[i];
          const p2 = points[i + 1];
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
          const diff = (segmentLength - dist) / dist;
          const offX = dx * diff * 0.5;
          const offY = dy * diff * 0.5;
          const p2Locked = dragging && i + 1 === points.length - 1;
          if (i !== 0) {
            p1.x -= offX;
            p1.y -= offY;
          }
          if (!p2Locked) {
            p2.x += offX;
            p2.y += offY;
          }
        }
      }

      const margin = 14;
      for (let i = 1; i < points.length; i++) {
        points[i].x = Math.max(margin, Math.min(width - margin, points[i].x));
        points[i].y = Math.max(anchor.y + 6, Math.min(height - 8, points[i].y));
      }
    };

    const drawRope = () => {
      ctx.clearRect(0, 0, width, height);
      if (points.length < 2) return;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      const path = new Path2D();
      path.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i++) {
        path.quadraticCurveTo(
          points[i].x,
          points[i].y,
          (points[i].x + points[i + 1].x) / 2,
          (points[i].y + points[i + 1].y) / 2
        );
      }
      const n = points.length;
      path.lineTo(points[n - 1].x, points[n - 1].y);
      ctx.strokeStyle = "rgba(28,32,40,.92)";
      ctx.lineWidth = 3.4;
      ctx.stroke(path);
      ctx.strokeStyle = "rgba(148,158,176,.55)";
      ctx.lineWidth = 1.1;
      ctx.stroke(path);
    };

    const draw = () => {
      drawRope();
      const n = points.length;
      const tip = points[n - 1];
      const prev = points[n - 2];
      const angle = (Math.atan2(tip.y - prev.y, tip.x - prev.x) * 180) / Math.PI - 90;

      tiltCurrent.x += (tiltTarget.x - tiltCurrent.x) * 0.12;
      tiltCurrent.y += (tiltTarget.y - tiltCurrent.y) * 0.12;

      card.style.transform =
        `translate3d(${(tip.x - card.offsetWidth / 2).toFixed(2)}px,${(tip.y - holeY).toFixed(2)}px,0) ` +
        `rotate(${angle.toFixed(2)}deg) rotateX(${tiltCurrent.x.toFixed(2)}deg) rotateY(${tiltCurrent.y.toFixed(2)}deg)`;
    };

    const loop = () => {
      if (!running) return;
      simulate();
      draw();
      rafId = window.requestAnimationFrame(loop);
    };

    const start = () => {
      if (running) return;
      if (reduced) {
        for (let i = 0; i < 40; i++) simulate();
        draw();
        return;
      }
      running = true;
      rafId = window.requestAnimationFrame(loop);
    };

    const stop = () => {
      running = false;
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = 0;
    };

    const markInteracted = () => setInteracted(true);

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      // let the back-face social links behave like links
      if ((e.target as HTMLElement).closest("a")) return;
      dragging = true;
      pointerId = e.pointerId;
      downPos = { x: e.clientX, y: e.clientY };
      velocity = { x: 0, y: 0 };
      lastMove = { x: e.clientX, y: e.clientY, t: performance.now() };
      card.classList.add("idcl-hovering");
      try {
        card.setPointerCapture(e.pointerId);
      } catch {
        /* older browsers */
      }
      if (reduced) {
        const rect = stage.getBoundingClientRect();
        pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const lp = points[points.length - 1];
        lp.x = pointer.x;
        lp.y = pointer.y;
        draw();
      }
      e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${((e.clientX - cardRect.left) / cardRect.width) * 100}%`);
      card.style.setProperty("--my", `${((e.clientY - cardRect.top) / cardRect.height) * 100}%`);

      if (!dragging) return;
      const now = performance.now();
      const dt = Math.max(1, now - lastMove.t);
      velocity = {
        x: Math.max(-26, Math.min(26, ((e.clientX - lastMove.x) / dt) * 16)),
        y: Math.max(-26, Math.min(26, ((e.clientY - lastMove.y) / dt) * 16)),
      };
      lastMove = { x: e.clientX, y: e.clientY, t: now };
      pointer = {
        x: Math.max(10, Math.min(width - 10, e.clientX - rect.left)),
        y: Math.max(anchor.y + 14, Math.min(height - 12, e.clientY - rect.top)),
      };
      tiltTarget.x = Math.max(-MAX_TILT, Math.min(MAX_TILT, velocity.y * 0.6));
      tiltTarget.y = Math.max(-MAX_TILT * 2.2, Math.min(MAX_TILT * 2.2, velocity.x * 1.4));

      if (reduced) {
        const lp = points[points.length - 1];
        lp.x = pointer.x;
        lp.y = pointer.y;
        draw();
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      tiltTarget.x = 0;
      tiltTarget.y = 0;
      card.classList.remove("idcl-hovering");
      try {
        if (pointerId !== null) card.releasePointerCapture(pointerId);
      } catch {
        /* ignore */
      }
      pointerId = null;
      const moved = Math.abs(e.clientX - downPos.x) + Math.abs(e.clientY - downPos.y);
      if (moved < TAP_THRESHOLD) setFlipped((f) => !f);
      markInteracted();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        setFlipped((f) => !f);
        markInteracted();
      }
    };

    card.addEventListener("pointerdown", onPointerDown);
    card.addEventListener("pointermove", onPointerMove);
    card.addEventListener("pointerup", onPointerUp);
    card.addEventListener("pointercancel", onPointerUp);
    card.addEventListener("keydown", onKeyDown);

    const onResize = () => layout();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(onResize);
      ro.observe(stage);
    } else {
      window.addEventListener("resize", onResize);
    }

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (entries) => entries.forEach((e) => (e.isIntersecting ? start() : stop())),
        { threshold: 0.02 }
      );
      io.observe(stage);
    }

    layout();
    start();

    return () => {
      stop();
      card.removeEventListener("pointerdown", onPointerDown);
      card.removeEventListener("pointermove", onPointerMove);
      card.removeEventListener("pointerup", onPointerUp);
      card.removeEventListener("pointercancel", onPointerUp);
      card.removeEventListener("keydown", onKeyDown);
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", onResize);
      if (io) io.disconnect();
    };
  }, [anchorX, anchorY, variant]);

  const shell =
    variant === "inline"
      ? { height: typeof stageHeight === "number" ? `${stageHeight}px` : stageHeight }
      : { position: "fixed" as const, inset: 0, pointerEvents: "none" as const, height: "100vh" };

  return (
    <div ref={rootRef} className={`idcl-root ${className}`} style={{ "--idcl-z": zIndex } as React.CSSProperties}>
      <style>{CSS}</style>
      <div className="idcl-host" style={shell}>
        <div className="idcl-stage" ref={stageRef}>
          <canvas className="idcl-rope" ref={canvasRef} aria-hidden="true" />
          <div className="idcl-rail" ref={railRef} aria-hidden="true" />

          <div
            className={`idcl-card${flipped ? " idcl-flipped" : ""}`}
            ref={cardRef}
            tabIndex={0}
            role="button"
            aria-pressed={flipped}
            aria-label={`${name} ID card. Drag to swing it, or press Enter to flip between front and back.`}
          >
            <div className="idcl-flipper">
              {/* front ---------------------------------------------------- */}
              <div className="idcl-face idcl-front" {...({ inert: flipped ? "" : undefined } as Record<string, unknown>)}>
                <span className="idcl-holo" aria-hidden="true" />
                <div className="idcl-hole" aria-hidden="true" />
                <div className="idcl-header">
                  <div className="idcl-brand">
                    <span className="idcl-brand-mark" aria-hidden="true">
                      ◆
                    </span>
                    <span className="idcl-brand-text">
                      <b>{brand}</b>
                      <small>{brandTagline}</small>
                    </span>
                  </div>
                  <div className="idcl-pillars" aria-hidden="true">
                    {pillars.map((p) => (
                      <span key={p}>{p}</span>
                    ))}
                    <i />
                  </div>
                </div>

                <div className="idcl-photo">
                  {photoUrl ? (
                    <img src={photoUrl} alt={`Portrait of ${name}`} width={460} height={460} />
                  ) : (
                    <svg viewBox="0 0 182 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                      <defs>
                        <linearGradient id="idcl-faceGrad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0" stopColor="#8fb0ff" />
                          <stop offset="1" stopColor="#3f5fd8" />
                        </linearGradient>
                      </defs>
                      <rect width="182" height="100" fill="#12151c" />
                      <circle cx="91" cy="62" r="46" fill="url(#idcl-faceGrad)" />
                      <path d="M42,46 Q91,-18 140,46 L140,66 Q91,38 42,66 Z" fill="#1c2029" />
                      <circle cx="72" cy="62" r="3.6" fill="#12151c" />
                      <circle cx="110" cy="62" r="3.6" fill="#12151c" />
                      <path d="M75,78 Q91,86 107,78" stroke="#12151c" strokeWidth="2.8" fill="none" strokeLinecap="round" />
                    </svg>
                  )}
                  <span className="idcl-verified" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                </div>

                <p className="idcl-name">{name}</p>
                <p className="idcl-role">{role}</p>
                <div className="idcl-divider" aria-hidden="true" />

                <div className="idcl-idrow">
                  <div className="idcl-idrow-labels">
                    <div>
                      <span>ID</span>
                      <b>{idNumber}</b>
                    </div>
                    <div>
                      <span>Based</span>
                      <b>{location}</b>
                    </div>
                    <div>
                      <span>Valid</span>
                      <b>{validThru}</b>
                    </div>
                  </div>
                </div>

                <div className="idcl-footer">
                  {pillars[0]}
                  <i>·</i>
                  {pillars[1]}
                  <i>·</i>
                  {pillars[2]}
                </div>
              </div>

              {/* back ----------------------------------------------------- */}
              <div className="idcl-face idcl-back" {...({ inert: flipped ? undefined : "" } as Record<string, unknown>)}>
                <span className="idcl-holo" aria-hidden="true" />
                <div className="idcl-hole" aria-hidden="true" />
                <div className="idcl-stripe" aria-hidden="true" />
                <div className="idcl-barcode" ref={barcodeRef} aria-hidden="true" />
                <p className="idcl-idnum">
                  <span>{idNumber}</span>
                  <em>VALID {validThru}</em>
                </p>

                <div className="idcl-backrow">
                  <div className="idcl-qr" ref={qrBackRef} aria-hidden="true" />
                  <div className="idcl-scan">
                    <b>{site}</b>
                    Scan for work, research
                    <br />&amp; contact details.
                  </div>
                </div>

                <div className="idcl-sig" aria-hidden="true">
                  <div className="idcl-script">{name}</div>
                  <small>Authorized Signature</small>
                </div>

                {(githubUrl || linkedinUrl || instagramUrl) && (
                  <div className="idcl-connect">
                    <span>Connect</span>
                    <div className="idcl-connect-icons">
                      {githubUrl && (
                        <a href={githubUrl} target="_blank" rel="noopener noreferrer" aria-label="GitHub profile">
                          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z" />
                          </svg>
                        </a>
                      )}
                      {linkedinUrl && (
                        <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn profile">
                          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z" />
                          </svg>
                        </a>
                      )}
                      {instagramUrl && (
                        <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram profile">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="2" y="2" width="20" height="20" rx="5" />
                            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {showHint && (
            <div className={`idcl-hint${interacted ? " idcl-hint-hidden" : ""}`} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v18M7 8l-4 4 4 4M17 8l4 4-4 4" />
              </svg>
              Drag to swing · Click to flip
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default IDCardLanyard;
