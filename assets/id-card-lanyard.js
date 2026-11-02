/* ==========================================================================
   ID Card Lanyard — vanilla port of components/ui/id-card-lanyard.tsx
   Verlet-integration cord + flip/drag interaction, no React/bundler needed.
   Markup:  <div class="idcl-stage" data-idcl> ... </div>
   ========================================================================== */
(function () {
    'use strict';

    var NUM_POINTS = 13;
    var FRICTION = 0.98;
    var CONSTRAINT_ITERATIONS = 6;
    var TAP_THRESHOLD = 6;
    var MAX_TILT = 9;

    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function initStage(stage) {
        if (stage.dataset.idclReady === 'true') return;
        stage.dataset.idclReady = 'true';

        var canvas = stage.querySelector('.idcl-rope');
        var rail = stage.querySelector('.idcl-rail');
        var card = stage.querySelector('.idcl-card');
        var hint = stage.querySelector('.idcl-hint');
        var barcodeEl = stage.querySelector('.idcl-barcode');
        var qrEls = stage.querySelectorAll('.idcl-qr');
        var holeEl = stage.querySelector('.idcl-hole');
        if (!canvas || !card) return;
        var ctx = canvas.getContext('2d');
        if (!ctx) return;

        /* ---- generated details ------------------------------------------ */
        if (barcodeEl && !barcodeEl.childElementCount) {
            for (var b = 0; b < 30; b++) {
                var bar = document.createElement('span');
                bar.style.height = ((b * 37) % 100 > 40 ? 100 : 55) + '%';
                barcodeEl.appendChild(bar);
            }
        }

        qrEls.forEach(function (qrEl, index) {
            if (qrEl.childElementCount) return;
            var N = 9;
            var seed = 928371 + index * 211;
            var fixed = {
                0: 1, 1: 1, 2: 1, 9: 1, 10: 1, 11: 1, 18: 1, 19: 1, 20: 1,
                6: 1, 7: 1, 8: 1, 15: 1, 16: 1, 17: 1, 24: 1, 25: 1, 26: 1,
                54: 1, 55: 1, 56: 1, 63: 1, 64: 1, 65: 1, 72: 1, 73: 1, 74: 1
            };
            for (var q = 0; q < N * N; q++) {
                var cell = document.createElement('i');
                if (fixed[q] || (q * seed) % 97 < 46) cell.className = 'on';
                qrEl.appendChild(cell);
            }
        });

        /* ---- geometry --------------------------------------------------- */
        var width = 0;
        var height = 0;
        var anchor = { x: 0, y: 0 };
        var restLength = 100;
        var segmentLength = 25;
        var holeY = 0;
        var points = [];
        var dragging = false;
        var pointerId = null;
        var flipped = false;
        var downPos = { x: 0, y: 0 };
        var pointer = { x: 0, y: 0 };
        var lastMove = { x: 0, y: 0, t: 0 };
        var velocity = { x: 0, y: 0 };
        var tiltTarget = { x: 0, y: 0 };
        var tiltCurrent = { x: 0, y: 0 };
        var interacted = false;
        var rafId = 0;
        var running = false;

        function markInteracted() {
            if (interacted) return;
            interacted = true;
            if (hint) hint.classList.add('idcl-hint-hidden');
        }

        function layout() {
            var rect = stage.getBoundingClientRect();
            width = rect.width || 1;
            height = rect.height || 1;
            canvas.width = Math.round(width * (window.devicePixelRatio || 1));
            canvas.height = Math.round(height * (window.devicePixelRatio || 1));
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);

            var cardH = card.offsetHeight || width * (460 / 236);
            // Every internal size is expressed in em, so scaling the base
            // font-size with the measured card width keeps proportions exact.
            var base = Math.max(5.5, (card.offsetWidth || width * 0.3) * (16 / 236));
            card.style.fontSize = base.toFixed(3) + 'px';
            holeY = holeEl ? holeEl.offsetTop + holeEl.offsetHeight / 2 : base;

            anchor.x = width * 0.5;
            anchor.y = Math.max(18, base * 1.4);
            if (rail) {
                rail.style.left = anchor.x + 'px';
                rail.style.top = (anchor.y - 3) + 'px';
            }

            var preferred = Math.min(width * 0.62, base * 9);
            var available = height - cardH - anchor.y - base * 5.8;
            restLength = Math.max(base * 3, Math.min(preferred, available));
            segmentLength = restLength / (NUM_POINTS - 1);

            card.style.transformOrigin = '50% ' + holeY + 'px';

            points = [];
            for (var i = 0; i < NUM_POINTS; i++) {
                var py = anchor.y + i * segmentLength;
                points.push({ x: anchor.x, y: py, ox: anchor.x, oy: py });
            }
            pointer.x = anchor.x;
            pointer.y = anchor.y + restLength;
            draw();
        }

        /* ---- physics ---------------------------------------------------- */
        var gravity = 0.55;

        function simulate() {
            var i, p;
            for (i = 1; i < points.length; i++) {
                if (dragging && i === points.length - 1) continue;
                p = points[i];
                var vx = (p.x - p.ox) * FRICTION;
                var vy = (p.y - p.oy) * FRICTION;
                p.ox = p.x;
                p.oy = p.y;
                p.x += vx;
                p.y += vy + gravity;
            }

            points[0].x = anchor.x;
            points[0].y = anchor.y;

            if (dragging) {
                var last = points[points.length - 1];
                last.x = pointer.x;
                last.y = pointer.y;
                last.ox = pointer.x - velocity.x;
                last.oy = pointer.y - velocity.y;
            }

            for (var iter = 0; iter < CONSTRAINT_ITERATIONS; iter++) {
                for (i = 0; i < points.length - 1; i++) {
                    var p1 = points[i];
                    var p2 = points[i + 1];
                    var dx = p2.x - p1.x;
                    var dy = p2.y - p1.y;
                    var dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
                    var diff = (segmentLength - dist) / dist;
                    var offX = dx * diff * 0.5;
                    var offY = dy * diff * 0.5;
                    var p2Locked = dragging && i + 1 === points.length - 1;
                    if (i !== 0) { p1.x -= offX; p1.y -= offY; }
                    if (!p2Locked) { p2.x += offX; p2.y += offY; }
                }
            }

            // keep the cord inside the stage bounds
            var margin = 14;
            for (i = 1; i < points.length; i++) {
                points[i].x = Math.max(margin, Math.min(width - margin, points[i].x));
                points[i].y = Math.max(anchor.y + 6, Math.min(height - 8, points[i].y));
            }
        }

        function drawRope() {
            ctx.clearRect(0, 0, width, height);
            if (points.length < 2) return;

            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';

            var path = new Path2D();
            path.moveTo(points[0].x, points[0].y);
            for (var i = 1; i < points.length - 1; i++) {
                var mx = (points[i].x + points[i + 1].x) / 2;
                var my = (points[i].y + points[i + 1].y) / 2;
                path.quadraticCurveTo(points[i].x, points[i].y, mx, my);
            }
            var n = points.length;
            path.lineTo(points[n - 1].x, points[n - 1].y);

            // cord body
            ctx.strokeStyle = 'rgba(28, 32, 40, .92)';
            ctx.lineWidth = 3.4;
            ctx.stroke(path);

            // inner highlight
            ctx.strokeStyle = 'rgba(148, 158, 176, .55)';
            ctx.lineWidth = 1.1;
            ctx.stroke(path);
        }

        function draw() {
            drawRope();
            var n = points.length;
            var tip = points[n - 1];
            var prev = points[n - 2];
            var angle = Math.atan2(tip.y - prev.y, tip.x - prev.x) * 180 / Math.PI - 90;

            tiltCurrent.x += (tiltTarget.x - tiltCurrent.x) * 0.12;
            tiltCurrent.y += (tiltTarget.y - tiltCurrent.y) * 0.12;

            card.style.transform =
                'translate3d(' + (tip.x - card.offsetWidth / 2).toFixed(2) + 'px,' +
                (tip.y - holeY).toFixed(2) + 'px,0) ' +
                'rotate(' + angle.toFixed(2) + 'deg) ' +
                'rotateX(' + tiltCurrent.x.toFixed(2) + 'deg) ' +
                'rotateY(' + tiltCurrent.y.toFixed(2) + 'deg)';
        }

        function loop() {
            if (!running) return;
            simulate();
            draw();
            rafId = window.requestAnimationFrame(loop);
        }

        function start() {
            if (running) return;
            running = true;
            if (prefersReducedMotion) {
                // settle instantly, then draw one static frame
                for (var i = 0; i < 40; i++) simulate();
                draw();
                running = false;
                return;
            }
            rafId = window.requestAnimationFrame(loop);
        }

        function stop() {
            running = false;
            if (rafId) window.cancelAnimationFrame(rafId);
            rafId = 0;
        }

        /* ---- interaction ------------------------------------------------ */
        function setFlipped(next) {
            flipped = next;
            card.classList.toggle('idcl-flipped', flipped);
            card.setAttribute('aria-pressed', flipped ? 'true' : 'false');
            var back = card.querySelector('.idcl-back');
            var front = card.querySelector('.idcl-front');
            if (back) back.inert = !flipped;
            if (front) front.inert = flipped;
            markInteracted();
        }

        function onPointerDown(e) {
            if (e.button !== undefined && e.button !== 0) return;
            if (e.target.closest('a')) return; // let links work
            dragging = true;
            pointerId = e.pointerId;
            downPos.x = e.clientX;
            downPos.y = e.clientY;
            velocity.x = 0;
            velocity.y = 0;
            lastMove = { x: e.clientX, y: e.clientY, t: performance.now() };
            card.classList.add('idcl-hovering');
            try { card.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
            if (prefersReducedMotion) {
                var rect = stage.getBoundingClientRect();
                pointer.x = e.clientX - rect.left;
                pointer.y = e.clientY - rect.top;
                var lp = points[points.length - 1];
                lp.x = pointer.x;
                lp.y = pointer.y;
                draw();
            }
            e.preventDefault();
        }

        function onPointerMove(e) {
            var rect = stage.getBoundingClientRect();
            var local = { x: e.clientX - rect.left, y: e.clientY - rect.top };

            // specular sheen follows the pointer over the card
            var cardRect = card.getBoundingClientRect();
            card.style.setProperty('--mx', ((e.clientX - cardRect.left) / cardRect.width * 100).toFixed(1) + '%');
            card.style.setProperty('--my', ((e.clientY - cardRect.top) / cardRect.height * 100).toFixed(1) + '%');

            if (!dragging) return;

            var now = performance.now();
            var dt = Math.max(1, now - lastMove.t);
            velocity.x = Math.max(-26, Math.min(26, (e.clientX - lastMove.x) / dt * 16));
            velocity.y = Math.max(-26, Math.min(26, (e.clientY - lastMove.y) / dt * 16));
            lastMove = { x: e.clientX, y: e.clientY, t: now };

            pointer.x = Math.max(10, Math.min(width - 10, local.x));
            pointer.y = Math.max(anchor.y + 14, Math.min(height - 12, local.y));
            tiltTarget.x = Math.max(-MAX_TILT, Math.min(MAX_TILT, velocity.y * 0.6));
            tiltTarget.y = Math.max(-MAX_TILT * 2.2, Math.min(MAX_TILT * 2.2, velocity.x * 1.4));

            if (prefersReducedMotion) {
                var lp = points[points.length - 1];
                lp.x = pointer.x;
                lp.y = pointer.y;
                draw();
            }
        }

        function onPointerUp(e) {
            if (!dragging) return;
            dragging = false;
            tiltTarget.x = 0;
            tiltTarget.y = 0;
            card.classList.remove('idcl-hovering');
            try { card.releasePointerCapture(pointerId); } catch (err) { /* ignore */ }
            pointerId = null;

            var moved = Math.abs(e.clientX - downPos.x) + Math.abs(e.clientY - downPos.y);
            if (moved < TAP_THRESHOLD) setFlipped(!flipped);
            else markInteracted();
        }

        function onKeyDown(e) {
            if (e.target !== card) return;
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                setFlipped(!flipped);
            }
        }

        card.addEventListener('pointerdown', onPointerDown);
        card.addEventListener('pointermove', onPointerMove);
        card.addEventListener('pointerup', onPointerUp);
        card.addEventListener('pointercancel', onPointerUp);
        card.addEventListener('keydown', onKeyDown);
        card.addEventListener('pointerleave', function () {
            if (!dragging) card.classList.remove('idcl-hovering');
        });

        /* ---- observers -------------------------------------------------- */
        var ro = null;
        if ('ResizeObserver' in window) {
            ro = new ResizeObserver(function () { layout(); });
            ro.observe(stage);
        } else {
            window.addEventListener('resize', layout);
        }

        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) start();
                    else stop();
                });
            }, { threshold: 0.02 });
            io.observe(stage);
        }

        layout();
        start();
        window.addEventListener('load', layout, { once: true });
        window.addEventListener('orientationchange', function () { window.setTimeout(layout, 220); });
    }

    function boot() {
        document.querySelectorAll('[data-idcl]').forEach(initStage);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
