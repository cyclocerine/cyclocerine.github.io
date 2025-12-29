import * as tf from 'https://esm.sh/@tensorflow/tfjs';

export class LossGraph {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.data = []; // Array of loss values
        this.maxLen = 100;
    }

    add(loss) {
        this.data.push(loss);
        if (this.data.length > this.maxLen) this.data.shift();
        this.draw();
    }

    draw() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.ctx.clearRect(0, 0, w, h);

        if (this.data.length < 2) return;

        // Find min/max for scaling
        let maxVal = Math.max(...this.data) * 1.1;
        let minVal = 0;

        this.ctx.beginPath();
        this.ctx.strokeStyle = '#F97316';
        this.ctx.lineWidth = 2;

        const step = w / (this.maxLen - 1);

        this.data.forEach((val, i) => {
            const x = i * step;
            const y = h - ((val - minVal) / (maxVal - minVal) * h);
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        });

        this.ctx.stroke();
    }

    reset() {
        this.data = [];
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

export class Visualizer {
    constructor(canvasId, svgId, lossId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.svg = document.getElementById(svgId); // Standard DOM element for now, or D3 selection
        this.lossGraph = new LossGraph(lossId);

        this.heatMapSize = 50; // Resolution

        // Setup scaling
        this.width = this.canvas.clientWidth;
        this.height = this.canvas.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // Fix Loss Graph scaling
        const lg = document.getElementById(lossId);
        lg.width = lg.clientWidth;
        lg.height = lg.clientHeight;
    }

    drawDataPoints(points) {
        // Clear (but maybe keep heatmap?)
        // this.ctx.clearRect(0, 0, this.width, this.height);

        points.forEach(p => {
            const px = (p.x + 1) / 2 * this.width;
            const py = (1 - (p.y + 1) / 2) * this.height; // Flip Y

            this.ctx.beginPath();
            this.ctx.arc(px, py, 4, 0, 2 * Math.PI);
            this.ctx.fillStyle = p.label === 0 ? '#F97316' : '#3B82F6'; // Orange / Blue
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 1;
            this.ctx.fill();
            this.ctx.stroke();
        });
    }

    async drawHeatmap(model, currentFeatures) {
        if (!model) return;

        const w = this.canvas.width;
        const h = this.canvas.height;
        const resolution = 50; // Grid cells along one axis

        const inputs = [];
        const xCoords = [];
        const yCoords = [];

        // Generate grid coordinates
        for (let i = 0; i < resolution; i++) {
            for (let j = 0; j < resolution; j++) {
                // Map i,j to -1..1 range
                const x = (i / resolution) * 2 - 1;
                const y = ((resolution - j) / resolution) * 2 - 1; // Flip Y for typical cartesian

                // FEATURE TRANSFORM HERE
                // We need to mimic processFeatures for a single point [x,y,label=0]
                // But efficient batch
                // Manually construct the vector
                const feats = [];
                // ordered matching processFeatures
                // This is tightly coupled to engine's processFeatures, slightly risky duplicating logic 
                // but needed for speed in loop.
                // Better: pass the feature function? Or mimic it.

                // ['x', 'y', 'x2', 'y2', 'xy', 'sinx', 'siny']
                if (currentFeatures.includes('x')) feats.push(x);
                if (currentFeatures.includes('y')) feats.push(y);
                if (currentFeatures.includes('x2')) feats.push(x * x);
                if (currentFeatures.includes('y2')) feats.push(y * y);
                if (currentFeatures.includes('xy')) feats.push(x * y);
                if (currentFeatures.includes('sinx')) feats.push(Math.sin(x));
                if (currentFeatures.includes('siny')) feats.push(Math.sin(y));

                inputs.push(feats);
                xCoords.push(i);
                yCoords.push(j);
            }
        }

        // Batch predict
        const preds = tf.tidy(() => {
            const inputTensor = tf.tensor2d(inputs);
            return model.predict(inputTensor).dataSync();
        });

        // Draw to canvas
        // We can draw small rectangles
        const cellW = w / resolution;
        const cellH = h / resolution;

        for (let k = 0; k < preds.length; k++) {
            const p = preds[k];
            // Color interpolation: Orange (0) to Blue (1)
            // 0: 249, 115, 22 (Orange)
            // 1: 59, 130, 246 (Blue)
            // Simple linear interp
            const r = Math.round(249 + (59 - 249) * p);
            const g = Math.round(115 + (130 - 115) * p);
            const b = Math.round(22 + (246 - 22) * p);
            const alpha = 0.5; // Semi-transparent to see grid/points? Or solid background.

            this.ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
            this.ctx.fillRect(xCoords[k] * cellW, yCoords[k] * cellH, cellW, cellH);
        }
    }

    _drawLayerControls(x, size, hiddenIndex, onNeuronChange, totalLayers) {
        if (this.controlsContainer && onNeuronChange && hiddenIndex >= 0 && hiddenIndex < totalLayers - 2) {
            const ctrlDiv = document.createElement('div');
            ctrlDiv.className = 'absolute flex flex-col gap-1 items-center pointer-events-auto';
            ctrlDiv.style.left = (x - 16) + 'px'; // Center 32px
            ctrlDiv.style.top = '10px';
            ctrlDiv.style.width = '32px';

            const btnClass = "w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-300 transition-colors shadow-sm";

            const plusBtn = document.createElement('button');
            plusBtn.className = btnClass;
            plusBtn.innerText = '+';
            plusBtn.title = 'Add Neuron';
            plusBtn.onclick = () => onNeuronChange(hiddenIndex, 1);

            const countSpan = document.createElement('span');
            countSpan.innerText = size;
            countSpan.className = "text-[10px] text-gray-500 font-mono my-0.5";

            const minusBtn = document.createElement('button');
            minusBtn.className = btnClass;
            minusBtn.innerText = '-';
            minusBtn.title = 'Remove Neuron';
            minusBtn.onclick = () => onNeuronChange(hiddenIndex, -1);

            ctrlDiv.appendChild(plusBtn);
            ctrlDiv.appendChild(countSpan);
            ctrlDiv.appendChild(minusBtn);

            this.controlsContainer.appendChild(ctrlDiv);
        }
    }

    drawNetwork(model, inputLabels = [], onNeuronChange = null) {
        // Clear SVG
        while (this.svg.firstChild) {
            this.svg.removeChild(this.svg.firstChild);
        }

        // Clear Controls
        if (this.controlsContainer) this.controlsContainer.innerHTML = '';

        const width = this.svg.clientWidth;
        const height = this.svg.clientHeight;
        const layers = model.layers;

        // Define Architecture for visualization
        const inputSize = inputLabels.length || 2;
        const layerSizes = [inputSize];

        layers.forEach(l => {
            if (l.units) layerSizes.push(l.units);
        });

        // Calculate positions
        const xDist = width / (layerSizes.length + 0.5); // Add padding

        const nodes = [];

        layerSizes.forEach((size, i) => {
            const layerNodes = [];
            const x = (i + 0.5) * xDist; // Centered columns
            const availableH = height * 0.9;
            const stepY = Math.min(50, availableH / size);
            const startY = (height - (size - 1) * stepY) / 2;

            for (let j = 0; j < size; j++) {
                layerNodes.push({
                    x: x,
                    y: startY + j * stepY
                });
            }
            nodes.push(layerNodes);

            // Draw Controls for HIDDEN layers only (index 1 to length-2)
            // i=0 is input, i=length-1 is output
            if (i > 0 && i < layerSizes.length - 1) {
                const hiddenIndex = i - 1; // 0-based index for hidden layers array
                this._drawLayerControls(x, size, hiddenIndex, onNeuronChange, layerSizes.length);
            }
        });

        const createEl = (type, attrs) => {
            const el = document.createElementNS("http://www.w3.org/2000/svg", type);
            for (const k in attrs) el.setAttribute(k, attrs[k]);
            return el;
        };

        // Draw connections
        model.layers.forEach((layer, i) => {
            const sourceLayerIndex = i;
            const targetLayerIndex = i + 1;

            if (targetLayerIndex >= layerSizes.length) return;

            const sourceNodes = nodes[sourceLayerIndex];
            const targetNodes = nodes[targetLayerIndex];

            const weightsTensor = layer.getWeights()[0];
            const weights = weightsTensor ? weightsTensor.dataSync() : null;

            if (!weights) return;

            const n_output = targetNodes.length;

            sourceNodes.forEach((src, j) => {
                targetNodes.forEach((tgt, k) => {
                    const wVal = weights[j * n_output + k];
                    const wWidth = Math.abs(wVal);
                    const color = wVal > 0 ? '#3B82F6' : '#F97316';

                    if (Math.abs(wVal) < 0.1) return; // Prune weak links

                    const line = createEl('line', {
                        x1: src.x, y1: src.y,
                        x2: tgt.x, y2: tgt.y,
                        stroke: color,
                        'stroke-width': Math.min(wWidth, 4),
                        'stroke-opacity': 0.5
                    });
                    this.svg.appendChild(line);
                });
            });
        });

        // Draw Nodes
        nodes.forEach((layer, colIndex) => {
            layer.forEach((node, rowIndex) => {
                const circle = createEl('circle', {
                    cx: node.x, cy: node.y,
                    r: 6,
                    class: 'node',
                    stroke: '#fff',
                    'stroke-width': 2,
                    fill: '#1e1e1e'
                });

                // Add labels for Input Layer
                if (colIndex === 0 && inputLabels[rowIndex]) {
                    // Too complex to use SVG text easily here without messing up spacing
                    // Tooltip could work
                    circle.setAttribute('title', inputLabels[rowIndex]);
                }

                this.svg.appendChild(circle);
            });
        });
    }
}
