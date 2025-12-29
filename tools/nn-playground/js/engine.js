import * as tf from 'https://esm.sh/@tensorflow/tfjs';

// ---- Data Generation ----

/**
 * Generates synthetic classification data.
 * @param {string} type - 'xor', 'circle', 'spiral', 'gauss'
 * @param {number} count - Number of points
 * @param {number} noise - Noise level (0-50)
 * @returns {Array} Array of {x, y, label}
 */
export function generateData(type, count = 400, noise = 0) {
    const points = [];
    const noiseFactor = noise / 100; // Scale 0-0.5

    for (let i = 0; i < count; i++) {
        let x, y, label;

        if (type === 'xor') {
            x = Math.random() * 2 - 1;
            y = Math.random() * 2 - 1;
            const padding = 0.1;
            label = (x > 0 && y > 0) || (x < 0 && y < 0) ? 0 : 1;
            if (Math.abs(x) < padding || Math.abs(y) < padding) continue;
        } else if (type === 'circle') {
            const r = Math.random() * 2;
            const theta = Math.random() * 2 * Math.PI;
            x = r * Math.cos(theta);
            y = r * Math.sin(theta);
            label = (x * x + y * y) <= 0.6 ? 0 : 1;
            x /= 2; y /= 2;
        } else if (type === 'spiral') {
            const n = count / 2;
            if (i < n) {
                const r = i / n;
                const t = 1.75 * i / n * 2 * Math.PI;
                x = r * Math.sin(t);
                y = r * Math.cos(t);
                label = 0;
            } else {
                const r = (i - n) / n;
                const t = 1.75 * (i - n) / n * 2 * Math.PI + Math.PI;
                x = r * Math.sin(t);
                y = r * Math.cos(t);
                label = 1;
            }
        } else if (type === 'gauss') {
            // Two gaussian blobs
            if (i < count / 2) {
                x = (Math.random() + Math.random() + Math.random()) / 3 - 0.8;
                y = (Math.random() + Math.random() + Math.random()) / 3 - 0.8;
                label = 0;
            } else {
                x = (Math.random() + Math.random() + Math.random()) / 3 + 0.2;
                y = (Math.random() + Math.random() + Math.random()) / 3 + 0.2;
                label = 1;
            }
        } else {
            x = Math.random() * 2 - 1;
            y = Math.random() * 2 - 1;
            label = x > 0 ? 1 : 0;
        }

        // Add Noise
        x += (Math.random() - 0.5) * noiseFactor;
        y += (Math.random() - 0.5) * noiseFactor;

        points.push({ x, y, label });
    }
    return points;
}

/**
 * Transforms raw x,y into feature vector based on enabled features.
 * @param {Array} points - Array of {x,y,label}
 * @param {Array<string>} features - e.g. ['x', 'y', 'x2', 'siny']
 * @returns {Object} { xs: Tensor, ys: Tensor, inputShape: number }
 */
export function processFeatures(points, features) {
    const processedData = points.map(p => {
        const feats = [];
        if (features.includes('x')) feats.push(p.x);
        if (features.includes('y')) feats.push(p.y);
        if (features.includes('x2')) feats.push(p.x * p.x);
        if (features.includes('y2')) feats.push(p.y * p.y);
        if (features.includes('xy')) feats.push(p.x * p.y);
        if (features.includes('sinx')) feats.push(Math.sin(p.x));
        if (features.includes('siny')) feats.push(Math.sin(p.y));
        return feats;
    });

    const labels = points.map(p => [p.label]);

    return {
        xs: tf.tensor2d(processedData),
        ys: tf.tensor2d(labels),
        inputShape: [features.length]
    };
}

// ---- Model Building ----

export function buildModel(inputShape, hiddenLayers = [4, 4], activation = 'tanh', lr = 0.03) {
    const model = tf.sequential();

    // Input Layer is implicit, first hidden layer needs inputShape
    // Hidden Layers
    hiddenLayers.forEach((units, i) => {
        const config = {
            units: units,
            activation: activation,
        };
        if (i === 0) {
            config.inputShape = inputShape;
        }
        model.add(tf.layers.dense(config));
    });

    // Output Layer (Binary Classification)
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

    model.compile({
        optimizer: tf.train.adam(lr),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
    });

    return model;
}
