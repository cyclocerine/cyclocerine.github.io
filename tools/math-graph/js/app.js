/**
 * Math Graph Application Logic
 * Integrates UI, GraphEngine, and MathJS/KaTeX
 */

const graph = new GraphEngine('graph-canvas', (compiledStr, scope) => {
    // We assume 'compiledStr' is actually a pre-compiled MathJS node
    // or we handle raw strings if needed.
    if (compiledStr && typeof compiledStr.evaluate === 'function') {
        return compiledStr.evaluate(scope);
    }
    return 0;
});
graph.onRender = draw;

// State
let functions = [
    { id: 1, expression: 'x^2', color: '#3b82f6', type: 'explicit', compiled: null, visible: true },
];
let nextId = 2;
let activeInputId = 1;

const colors = [
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#ec4899'  // Pink
];

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Initial Render
    renderFunctionList();
    updateAllFunctions();
});

// Update all functions (compile and draw)
function updateAllFunctions() {
    functions.forEach(f => compileFunction(f));
    draw();
}

function compileFunction(func) {
    const raw = func.expression.trim();
    if (!raw) {
        func.compiled = null;
        return;
    }

    try {
        let cleanExpr = normalizeInput(raw);
        let type = 'explicit';

        // Detect Type
        // 1. Polar: contains 'theta'
        if (cleanExpr.includes('theta')) {
            type = 'polar';
            if (cleanExpr.includes('=')) {
                cleanExpr = cleanExpr.split('=')[1]; // Assume r = ...
            }
            func.compiled = math.compile(cleanExpr);
        }
        // 2. Parametric: contains ',' and 't'
        else if (cleanExpr.includes(',') && (cleanExpr.includes('t') || cleanExpr.match(/\b(sin|cos)\b/))) {
            // (x(t), y(t)) or "sin(t), cos(t)"
            const parts = cleanExpr.split(',');
            if (parts.length === 2) {
                type = 'parametric';
                // Clean up parens if wrapped like (sin(t), cos(t))
                let xPart = parts[0].trim();
                if (xPart.startsWith('(')) xPart = xPart.substring(1);

                let yPart = parts[1].trim();
                if (yPart.endsWith(')')) yPart = yPart.substring(0, yPart.length - 1);

                func.compiled = {
                    x: math.compile(xPart),
                    y: math.compile(yPart)
                };
            } else {
                throw new Error("Invalid Parametric Format");
            }
        }
        // 3. Implicit / Equation: contains '='
        else if (cleanExpr.includes('=')) {
            type = 'implicit';
            const parts = cleanExpr.split('=');
            cleanExpr = `(${parts[0]}) - (${parts[1]})`;
            func.compiled = math.compile(cleanExpr);
        }
        // 4. Default Explicit
        else {
            func.compiled = math.compile(cleanExpr);
        }

        func.type = type;
        func.error = false;
    } catch (err) {
        console.warn("Compilation Error:", err);
        func.compiled = null;
        func.error = true;
    }
}

function draw() {
    graph.clear();

    functions.forEach(f => {
        if (!f.visible || !f.compiled) return;

        try {
            if (f.type === 'explicit') {
                graph.plotExplicit(f.compiled, f.color);
            } else if (f.type === 'implicit') {
                graph.plotImplicit(f.compiled, f.color);
            } else if (f.type === 'polar') {
                graph.plotPolar(f.compiled, f.color);
            } else if (f.type === 'parametric') {
                graph.plotParametric(f.compiled.x, f.compiled.y, f.color);
            }
        } catch (e) {
            console.error("Draw Error", e);
        }
    });
}

// UI Rendering
function renderFunctionList() {
    const container = document.getElementById('functions-list');
    container.innerHTML = '';

    functions.forEach(f => {
        const item = document.createElement('div');
        item.className = 'function-item group';
        if (f.error) item.classList.add('border-red-500');

        item.innerHTML = `
            <div class="flex items-center gap-2 mb-2">
                <div class="color-indicator" style="background-color: ${f.color}"></div>
                <span class="text-xs text-gray-400 font-mono">f${f.id}</span>
                <div class="ml-auto flex items-center gap-2">
                    <button onclick="toggleVisibility(${f.id})" class="text-gray-400 hover:text-gray-600">
                        <i class="fa-solid ${f.visible ? 'fa-eye' : 'fa-eye-slash'}"></i>
                    </button>
                    <button onclick="removeFunction(${f.id})" class="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="input-group">
                <input type="text" 
                    id="input-${f.id}"
                    value="${f.expression}"
                    placeholder="e.g. x^2, y=x^2"
                    oninput="handleInput(${f.id}, this.value)"
                    onfocus="activeInputId = ${f.id}"
                >
            </div>
            <div id="preview-${f.id}" class="math-preview"></div>
        `;
        container.appendChild(item);

        // Render Math Preview
        renderMathPreview(f.id, f.expression);
    });
}

// Actions
function handleInput(id, value) {
    const func = functions.find(f => f.id === id);
    if (func) {
        func.expression = value;
        compileFunction(func);
        draw();
        renderMathPreview(id, value);
    }
}

function addFunction() {
    const newId = nextId++;
    functions.push({
        id: newId,
        expression: '',
        color: colors[functions.length % colors.length],
        type: 'explicit',
        compiled: null,
        visible: true
    });
    renderFunctionList();
}

function removeFunction(id) {
    if (functions.length <= 1) return;
    functions = functions.filter(f => f.id !== id);
    renderFunctionList();
    draw();
}

function toggleVisibility(id) {
    const func = functions.find(f => f.id === id);
    if (func) {
        func.visible = !func.visible;
        renderFunctionList();
        draw();
    }
}

// Helpers
function renderMathPreview(id, expr) {
    const el = document.getElementById(`preview-${id}`);
    if (!el || !expr) {
        if (el) el.innerHTML = '';
        return;
    }
    try {
        const clean = normalizeInput(expr);
        // Simple LaTeX conversion via MathJS or custom
        // MathJS toTex is decent
        const node = math.parse(clean);
        const latex = node.toTex({ parenthesis: 'keep', implicit: 'hide' });
        katex.render(latex, el, { throwOnError: false, displayMode: false });
    } catch (e) {
        // el.innerHTML = '<span class="text-red-400 text-xs">Invalid</span>';
    }
}

function normalizeInput(expr) {
    if (!expr) return '';
    let norm = expr;
    // Replacements from previous version
    norm = norm.replace(/²/g, '^2');
    norm = norm.replace(/³/g, '^3');
    norm = norm.replace(/√/g, 'sqrt');
    norm = norm.replace(/π/g, 'pi');
    norm = norm.replace(/θ/g, 'theta');

    // LaTeX command cleanups (very basic)
    // 1. Inverse Trig
    norm = norm.replace(/\\arcsin/g, 'asin'); // or 'arcsin' if mathjs supports it, but asin is safer
    norm = norm.replace(/\\arccos/g, 'acos');
    norm = norm.replace(/\\arctan/g, 'atan');
    norm = norm.replace(/arcsin/g, 'asin'); // Handle text input too
    norm = norm.replace(/arccos/g, 'acos');
    norm = norm.replace(/arctan/g, 'atan');

    // 2. Hyperbolic
    norm = norm.replace(/\\sinh/g, 'sinh');
    norm = norm.replace(/\\cosh/g, 'cosh');
    norm = norm.replace(/\\tanh/g, 'tanh');
    // MathJS supports asinh, acosh, atanh
    norm = norm.replace(/\\arsinh/g, 'asinh'); // LaTeX often uses \arsinh? Or just \sinh^{-1}?
    norm = norm.replace(/\\arcosh/g, 'acosh');
    norm = norm.replace(/\\artanh/g, 'atanh');
    // Standard names
    norm = norm.replace(/arsinh/g, 'asinh');
    norm = norm.replace(/arcosh/g, 'acosh');
    norm = norm.replace(/artanh/g, 'atanh');

    // 3. Regular Trig & Reciprocals
    norm = norm.replace(/\\sin/g, 'sin');
    norm = norm.replace(/\\cos/g, 'cos');
    norm = norm.replace(/\\tan/g, 'tan');
    norm = norm.replace(/\\sec/g, 'sec');
    norm = norm.replace(/\\csc/g, 'csc');
    norm = norm.replace(/\\cot/g, 'cot');

    // 4. Inverse Reciprocals (arcsec, arccsc, arccot)
    norm = norm.replace(/\\arcsec/g, 'asec');
    norm = norm.replace(/\\arccsc/g, 'acsc');
    norm = norm.replace(/\\arccot/g, 'acot');
    norm = norm.replace(/arcsec/g, 'asec');
    norm = norm.replace(/arccsc/g, 'acsc');
    norm = norm.replace(/arccot/g, 'acot');

    // 5. Special Functions
    // atan2 is usually not a latex macro, but we ensure it passes as 'atan2'
    // If user typed \arctan2 (unlikely but possible in some dialects), map to atan2
    norm = norm.replace(/\\arctan2/g, 'atan2');
    norm = norm.replace(/arctan2/g, 'atan2');

    // 6. Other
    norm = norm.replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)');
    norm = norm.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');
    norm = norm.replace(/\\ln/g, 'log');
    norm = norm.replace(/\\log/g, 'log10'); // Latex \log is usually base 10. MathJS log is base e.

    return norm;
}

// Expose to window for HTML event handlers
window.handleInput = handleInput;
window.addFunction = addFunction;
window.removeFunction = removeFunction;
window.toggleVisibility = toggleVisibility;
window.activeInputId = 1;
window.insertMath = function (symbol) {
    const input = document.getElementById(`input-${window.activeInputId}`);
    if (input) {
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const text = input.value;
        const newVal = text.substring(0, start) + symbol + text.substring(end);
        input.value = newVal;
        handleInput(window.activeInputId, newVal);
        input.focus();
        input.setSelectionRange(start + symbol.length, start + symbol.length);
    }
};
