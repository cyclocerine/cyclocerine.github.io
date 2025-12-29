import { generateData, processFeatures, buildModel } from './engine.js';
import { Visualizer } from './ui.js';

const state = {
    dataType: 'circle',
    ratio: 50,
    noise: 0,
    batchSize: 10,
    features: ['x', 'y'],
    hiddenLayers: [4, 4],
    lr: 0.03,
    activation: 'tanh',
    reg: 'none',
    regRate: 0,
    problem: 'classification',

    isTraining: false,
    epoch: 0,
};

// Elements
const viz = new Visualizer('heatmap-canvas', 'network-svg', 'loss-graph');
const lossDisplay = document.getElementById('loss-display');
const accDisplay = document.getElementById('acc-display');
const epochDisplay = document.getElementById('epoch-display');
const formulaDisplay = document.getElementById('formula-display');
const playBtn = document.getElementById('play-btn');

let model;
let rawData = [];
let tensors = {}; // xs, ys
let animationId;

function init() {
    bindControls();
    reset();
}

function bindControls() {
    // Play/Pause
    playBtn.onclick = toggleTraining;
    document.getElementById('reset-btn').onclick = () => { stopTraining(); reset(); };

    // Data Type
    document.querySelectorAll('[data-type]').forEach(btn => {
        btn.onclick = (e) => {
            document.querySelectorAll('[data-type]').forEach(b => b.classList.remove('text-orange-500'));
            const target = e.currentTarget;
            target.classList.add('text-orange-500');
            state.dataType = target.getAttribute('data-type');
            resetData();
        };
    });

    // Sliders
    bindSlider('ratio-val', (v) => { state.ratio = parseInt(v); resetData(); });
    bindSlider('noise-slider', (v) => {
        state.noise = parseInt(v);
        document.getElementById('noise-val').innerText = state.noise;
        resetData();
    });
    bindSlider('batch-slider', (v) => {
        state.batchSize = parseInt(v);
        document.getElementById('batch-val').innerText = state.batchSize;
    });

    // Features
    document.querySelectorAll('.feature-check input').forEach(input => {
        input.onchange = () => {
            const feats = [];
            document.querySelectorAll('.feature-check input:checked').forEach(c => feats.push(c.value));
            state.features = feats;
            reset(); // Rebuild model input shape changed
        };
    });

    // Layers
    document.getElementById('add-layer').onclick = () => {
        if (state.hiddenLayers.length < 6) {
            state.hiddenLayers.push(4);
            updateLayerCount();
            resetModel();
        }
    };
    document.getElementById('remove-layer').onclick = () => {
        if (state.hiddenLayers.length > 0) {
            state.hiddenLayers.pop();
            updateLayerCount();
            resetModel();
        }
    };

    // Hyperparams
    document.getElementById('lr-select').onchange = (e) => { state.lr = parseFloat(e.target.value); resetModel(); };
    document.getElementById('act-select').onchange = (e) => {
        state.activation = e.target.value;
        updateFormula();
        resetModel();
    };
}

function bindSlider(id, callback) {
    const el = document.getElementById(id); // Handles both span update and slider input if ID matches?
    // Actually IDs are varied.
    // For sliders: element is input[type=range]
    if (id === 'noise-slider' || id === 'batch-slider') {
        document.getElementById(id).oninput = (e) => callback(e.target.value);
    }
}

function updateLayerCount() {
    document.getElementById('layer-count').innerText = state.hiddenLayers.length;
}

function reset() {
    resetData();
    resetModel();
}

async function resetData() {
    rawData = generateData(state.dataType, 400, state.noise);
    // Process based on split?
    // For simpilicity use all for now, splitting later if "Ratio" needed
    tensors = processFeatures(rawData, state.features);

    // Redraw background to clear old points
    if (model) {
        const inputShape = model.inputs[0].shape;
        const expectedShape = state.features.length;

        // inputShape is [null, features]
        if (inputShape[1] === expectedShape) {
            try {
                await viz.drawHeatmap(model, state.features);
            } catch (e) {
                viz.ctx.clearRect(0, 0, viz.canvas.width, viz.canvas.height);
            }
        } else {
            // Shape mismatch, just clear
            viz.ctx.clearRect(0, 0, viz.canvas.width, viz.canvas.height);
        }
    } else {
        // Fallback clear
        viz.ctx.clearRect(0, 0, viz.canvas.width, viz.canvas.height);
    }

    viz.drawDataPoints(rawData);
}

function resetModel() {
    stopTraining();
    state.epoch = 0;
    epochDisplay.innerText = '000,000';
    lossDisplay.innerText = '0.000';
    accDisplay.innerText = '0.00%';
    viz.lossGraph.reset();

    if (model) model.dispose();

    updateFormula();

    // Input shape determined by features length
    const inputShape = [state.features.length];

    model = buildModel(inputShape, state.hiddenLayers, state.activation, state.lr);

    const onNeuronChange = (layerIndex, delta) => {
        const currentUnits = state.hiddenLayers[layerIndex];
        const newUnits = currentUnits + delta;
        if (newUnits >= 1 && newUnits <= 8) { // Max 8 neurons for visual sanity
            state.hiddenLayers[layerIndex] = newUnits;
            resetModel();
        }
    };

    viz.drawNetwork(model, state.features, onNeuronChange);

    // Draw heatmap then points
    viz.drawHeatmap(model, state.features).then(() => {
        viz.drawDataPoints(rawData);
    });
}

function stopTraining() {
    state.isTraining = false;
    cancelAnimationFrame(animationId);
    playBtn.classList.remove('text-orange-500'); // Visual toggle
    playBtn.innerHTML = '<i class="fa-solid fa-play text-xl"></i>';
}

function toggleTraining() {
    state.isTraining = !state.isTraining;
    if (state.isTraining) {
        playBtn.classList.add('text-orange-500');
        playBtn.innerHTML = '<i class="fa-solid fa-pause text-xl"></i>';
        trainLoop();
    } else {
        stopTraining();
    }
}

async function trainLoop() {
    if (!state.isTraining) return;

    const history = await model.fit(tensors.xs, tensors.ys, {
        epochs: 1,
        batchSize: state.batchSize,
        shuffle: true
    });

    const loss = history.history.loss[0];
    const acc = history.history.acc[0];

    lossDisplay.innerText = loss.toFixed(3);
    accDisplay.innerText = (acc * 100).toFixed(1) + '%';

    state.epoch++;
    epochDisplay.innerText = state.epoch.toLocaleString('en-US', { minimumIntegerDigits: 6, useGrouping: true });

    viz.lossGraph.add(loss);

    if (state.epoch % 5 === 0) {
        // Safe check for shape mismatch on mid-train updates (rare but possible if async interference)
        try {
            await viz.drawHeatmap(model, state.features);
        } catch (e) { }

        viz.drawDataPoints(rawData);

        // Pass features labels to network for tooltips?
        // Reuse same callback for simplicity, though modifying architecture mid-train usually resets it
        // We can define it globally or just pass a no-op if we want to disable during training, 
        // but resetting is fine.
        const onNeuronChange = (layerIndex, delta) => {
            const currentUnits = state.hiddenLayers[layerIndex];
            const newUnits = currentUnits + delta;
            if (newUnits >= 1 && newUnits <= 8) {
                state.hiddenLayers[layerIndex] = newUnits;
                resetModel();
            }
        };

        viz.drawNetwork(model, state.features, onNeuronChange);
    }

    if (state.isTraining) animationId = requestAnimationFrame(trainLoop);
}

function updateFormula() {
    // KaTeX render...
    let tex = '';
    const act = state.activation;
    if (act === 'tanh') tex = '\\tanh(x)';
    else if (act === 'relu') tex = '\\max(0, x)';
    else if (act === 'sigmoid') tex = '\\sigma(x)';

    if (window.katex) {
        katex.render(tex, formulaDisplay, { throwOnError: false });
    }
}

init();
