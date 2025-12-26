/**
 * Native Canvas Graphing Engine
 * Supports: Explicit, Implicit (Marching Squares), Parametric, Polar
 * Features: Pan/Zoom, Auto-Grid, High DPI support
 */

class GraphEngine {
    constructor(canvasId, exprEvaluator) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.evaluate = exprEvaluator; // Function: (expr, scope) => number

        // Viewport State
        this.state = {
            centerX: 0,
            centerY: 0,
            scale: 40, // pixels per unit
            width: 0,
            height: 0
        };

        // Configuration
        this.config = {
            gridColor: '#e5e7eb', // tailwind gray-200
            axisColor: '#374151', // tailwind gray-700
            textColor: '#6b7280', // tailwind gray-500
            font: '12px Sora, sans-serif',
            stepSize: 5 // sampling step in pixels for marching squares (lower = quality, higher = perf)
        };

        // Event Listeners
        this.isDragging = false;
        this.lastMouse = { x: 0, y: 0 };
        this.setupEvents();

        // Initial Resize
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    setupEvents() {
        this.canvas.addEventListener('mousedown', e => {
            this.isDragging = true;
            this.lastMouse = { x: e.clientX, y: e.clientY };
            this.canvas.style.cursor = 'grabbing';
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.canvas.style.cursor = 'default';
        });

        window.addEventListener('mousemove', e => {
            if (!this.isDragging) return;
            const dx = e.clientX - this.lastMouse.x;
            const dy = e.clientY - this.lastMouse.y;
            this.lastMouse = { x: e.clientX, y: e.clientY };

            this.state.centerX -= dx / this.state.scale;
            this.state.centerY += dy / this.state.scale;
            this.requestRender();
        });

        this.canvas.addEventListener('wheel', e => {
            e.preventDefault();
            const zoomFactor = 1.1;
            const direction = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor;

            // Zoom towards mouse pointer
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const worldX = this.screenToWorldX(mouseX);
            const worldY = this.screenToWorldY(mouseY);

            this.state.scale *= direction;

            // Correction to keep mouse stable
            const newWorldX = this.screenToWorldX(mouseX);
            const newWorldY = this.screenToWorldY(mouseY);

            this.state.centerX -= (newWorldX - worldX);
            this.state.centerY -= (newWorldY - worldY);

            this.requestRender();
        }, { passive: false });
    }

    resize() {
        // Handle High DPI
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.state.width = rect.width;
        this.state.height = rect.height;

        this.ctx.scale(dpr, dpr);
        this.requestRender();
    }

    worldToScreenX(x) {
        return (x - this.state.centerX) * this.state.scale + this.state.width / 2;
    }

    worldToScreenY(y) {
        return -(y - this.state.centerY) * this.state.scale + this.state.height / 2;
    }

    screenToWorldX(sx) {
        return (sx - this.state.width / 2) / this.state.scale + this.state.centerX;
    }

    screenToWorldY(sy) {
        return -(sy - this.state.height / 2) / this.state.scale + this.state.centerY;
    }

    drawGrid() {
        const { ctx, state, config } = this;
        const { width, height, scale, centerX, centerY } = state;

        ctx.clearRect(0, 0, width, height);

        // Grid Lines
        ctx.beginPath();
        ctx.strokeStyle = config.gridColor;
        ctx.lineWidth = 1;

        // Adaptive grid steps
        const targetPixels = 100;
        const minStep = targetPixels / scale;
        // Find rough power of 2
        const magnitude = Math.pow(10, Math.floor(Math.log10(minStep)));
        const residual = minStep / magnitude;

        // Choose nice discrete steps: 1, 2, 5
        let step;
        if (residual > 5) step = 10 * magnitude;
        else if (residual > 2) step = 5 * magnitude;
        else if (residual > 1) step = 2 * magnitude;
        else step = 1 * magnitude;

        const startX = Math.floor(this.screenToWorldX(0) / step) * step;
        const endX = this.screenToWorldX(width);

        for (let x = startX; x <= endX; x += step) {
            const sx = this.worldToScreenX(x);
            ctx.moveTo(sx, 0);
            ctx.lineTo(sx, height);
        }

        const startY = Math.floor(this.screenToWorldY(height) / step) * step;
        const endY = this.screenToWorldY(0);

        for (let y = startY; y <= endY; y += step) {
            const sy = this.worldToScreenY(y);
            ctx.moveTo(0, sy);
            ctx.lineTo(width, sy);
        }
        ctx.stroke();

        // Axes
        ctx.beginPath();
        ctx.strokeStyle = config.axisColor;
        ctx.lineWidth = 2;
        const originX = this.worldToScreenX(0);
        const originY = this.worldToScreenY(0);

        if (originX >= 0 && originX <= width) {
            ctx.moveTo(originX, 0);
            ctx.lineTo(originX, height);
        }
        if (originY >= 0 && originY <= height) {
            ctx.moveTo(0, originY);
            ctx.lineTo(width, originY);
        }
        ctx.stroke();

        // Labels
        ctx.fillStyle = config.textColor;
        ctx.font = config.font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // X Axis Labels
        for (let x = startX; x <= endX; x += step) {
            if (Math.abs(x) < 1e-10) continue; // Skip 0 (origin handled separately or just skipped for cleanliness)
            const sx = this.worldToScreenX(x);
            // Place label below the axis if axis is visible, otherwise at bottom/top edge? 
            // Standard: sticky axis labels or just fixed at y=0.
            // Let's keep them at y=0 (originY) if visible, else clamp? 
            // For now, easy version: just at y=0.

            let labelY = originY + 8;
            if (labelY < 10) labelY = 10;
            if (labelY > height - 20) labelY = height - 20;

            ctx.fillText(parseFloat(x.toPrecision(6)).toString(), sx, labelY);
        }

        // Y Axis Labels
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let y = startY; y <= endY; y += step) {
            if (Math.abs(y) < 1e-10) continue;
            const sy = this.worldToScreenY(y);

            let labelX = originX - 8;
            if (labelX < 30) labelX = 30; // clamp to left
            if (labelX > width - 10) labelX = width - 10;

            ctx.fillText(parseFloat(y.toPrecision(6)).toString(), labelX, sy);
        }
    }

    clear() {
        const { ctx, state } = this;
        ctx.clearRect(0, 0, state.width, state.height);
        this.drawGrid();
    }

    plotExplicit(expr, color = '#3b82f6') {
        const { ctx, state } = this;
        const { width, scale } = state;

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;

        let scope = { x: 0 };
        const step = 2; // pixel interval

        let first = true;
        for (let sx = 0; sx <= width; sx += step) {
            const x = this.screenToWorldX(sx);
            scope.x = x;
            try {
                const y = this.evaluate(expr, scope);
                if (typeof y !== 'number' || !isFinite(y)) {
                    first = true;
                    continue;
                }
                const sy = this.worldToScreenY(y);

                if (first) {
                    ctx.moveTo(sx, sy);
                    first = false;
                } else {
                    ctx.lineTo(sx, sy);
                }
            } catch (e) {
                first = true;
            }
        }
        ctx.stroke();
    }

    plotPolar(expr, color = '#ec4899') {
        const { ctx, state } = this;
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;

        // Polar plot: theta 0 to 2pi (or more if user wants, defaulting to 2pi for now, 
        // really should check if trig repeats)
        const steps = 1000;
        let scope = { theta: 0 };
        let first = true;

        for (let i = 0; i <= steps; i++) {
            const theta = (i / steps) * Math.PI * 2; // Default 0 to 2pi
            scope.theta = theta;
            try {
                const r = this.evaluate(expr, scope);
                const x = r * Math.cos(theta);
                const y = r * Math.sin(theta);

                const sx = this.worldToScreenX(x);
                const sy = this.worldToScreenY(y);

                if (first) {
                    ctx.moveTo(sx, sy);
                    first = false;
                } else {
                    ctx.lineTo(sx, sy);
                }
            } catch (e) { first = true; }
        }
        ctx.stroke();
    }

    plotParametric(xExpr, yExpr, color = '#8b5cf6') {
        const { ctx, state } = this;
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;

        // Parametric: t from -10 to 10 by default? 
        // Or should we try to guess range? 
        // Let's do a wide range for general purpose: -20 to 20
        const tMin = -20;
        const tMax = 20;
        const steps = 2000;

        let scope = { t: 0 };
        let first = true;

        for (let i = 0; i <= steps; i++) {
            const t = tMin + (i / steps) * (tMax - tMin);
            scope.t = t;
            try {
                const x = this.evaluate(xExpr, scope);
                const y = this.evaluate(yExpr, scope);

                if (!isFinite(x) || !isFinite(y)) {
                    first = true;
                    continue;
                }

                const sx = this.worldToScreenX(x);
                const sy = this.worldToScreenY(y);

                if (first) {
                    ctx.moveTo(sx, sy);
                    first = false;
                } else {
                    ctx.lineTo(sx, sy);
                }
            } catch (e) { first = true; }
        }
        ctx.stroke();
    }

    plotImplicit(expr, color = '#10b981') {
        const { ctx, state, config } = this;
        const { width, height } = state;

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        // Marching Squares Algorithm
        const step = config.stepSize;
        // Limit resolution excessively high res
        const rows = Math.min(400, Math.ceil(height / step));
        const cols = Math.min(400, Math.ceil(width / step));
        const xStep = width / cols;
        const yStep = height / rows;

        // Pre-allocate grid values
        let grid = new Float32Array((rows + 1) * (cols + 1));

        try {
            // Evaluator scope re-use
            let scope = { x: 0, y: 0 };

            // Fill Grid
            for (let r = 0; r <= rows; r++) {
                for (let c = 0; c <= cols; c++) {
                    const sx = c * xStep;
                    const sy = r * yStep;
                    const x = this.screenToWorldX(sx);
                    const y = this.screenToWorldY(sy);
                    scope.x = x;
                    scope.y = y;
                    // Evaluate: standard form F(x,y) = 0
                    // If user provides "x^2 + y^2 = 9", we parse to "x^2 + y^2 - 9"
                    const val = this.evaluate(expr, scope);
                    grid[r * (cols + 1) + c] = val;
                }
            }

            // March
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const idx = r * (cols + 1) + c;
                    const v0 = grid[idx]; // TL
                    const v1 = grid[idx + 1]; // TR
                    const v2 = grid[idx + (cols + 1) + 1]; // BR
                    const v3 = grid[idx + (cols + 1)]; // BL

                    const mask = (v0 > 0 ? 1 : 0) | (v1 > 0 ? 2 : 0) | (v2 > 0 ? 4 : 0) | (v3 > 0 ? 8 : 0);

                    if (mask === 0 || mask === 15) continue; // All positive or all negative

                    // Interpolation functions (Linear)
                    const lerp = (vA, vB) => {
                        if (Math.abs(vA - vB) < 1e-9) return 0.5;
                        return vA / (vA - vB);
                    };

                    const xMin = c * xStep;
                    const xMax = (c + 1) * xStep;
                    const yMin = r * yStep;
                    const yMax = (r + 1) * yStep;

                    // Edge points (interpolated)
                    // Top: lerp v0, v1 (y = yMin)
                    const topX = xMin + lerp(v0, v1) * xStep;
                    const topY = yMin;

                    // Right: lerp v1, v2 (x = xMax)
                    const rightX = xMax;
                    const rightY = yMin + lerp(v1, v2) * yStep;

                    // Bottom: lerp v3, v2 (y = yMax) -> Note order v3 (left), v2 (right)
                    // Wait, v3 is BL, v2 is BR.
                    // Correct: v3 is val at (xMin, yMax), v2 is val at (xMax, yMax)
                    const bottomX = xMin + lerp(v3, v2) * xStep;
                    const bottomY = yMax;

                    // Left: lerp v0, v3 (x = xMin)
                    const leftX = xMin;
                    const leftY = yMin + lerp(v0, v3) * yStep;

                    const pTop = { x: topX, y: topY };
                    const pRight = { x: rightX, y: rightY };
                    const pBottom = { x: bottomX, y: bottomY };
                    const pLeft = { x: leftX, y: leftY };

                    switch (mask) {
                        case 1: this.dLine(ctx, pLeft, pTop); break;
                        case 2: this.dLine(ctx, pRight, pTop); break;
                        case 3: this.dLine(ctx, pLeft, pRight); break;
                        case 4: this.dLine(ctx, pRight, pBottom); break;
                        case 5: this.dLine(ctx, pLeft, pTop); this.dLine(ctx, pRight, pBottom); break;
                        case 6: this.dLine(ctx, pTop, pBottom); break;
                        case 7: this.dLine(ctx, pLeft, pBottom); break;
                        case 8: this.dLine(ctx, pLeft, pBottom); break;
                        case 9: this.dLine(ctx, pTop, pBottom); break;
                        case 10: this.dLine(ctx, pLeft, pBottom); this.dLine(ctx, pRight, pTop); break; // Ambiguous?
                        case 11: this.dLine(ctx, pRight, pBottom); break;
                        case 12: this.dLine(ctx, pLeft, pRight); break;
                        case 13: this.dLine(ctx, pRight, pTop); break;
                        case 14: this.dLine(ctx, pLeft, pTop); break;
                    }
                }
            }
        } catch (err) {
            console.error("Plot error:", err);
        }
        ctx.stroke();
    }

    dLine(ctx, p1, p2) {
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
    }

    requestRender() {
        if (this.onRender) this.onRender();
    }
}
