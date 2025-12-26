# Download Libraries for Offline Use

To run this Math Grapher fully offline, please download the following files and place them in the `lib` directory:

## 1. MathJS
- **URL**: `https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.8.0/math.min.js`
- **Save as**: `tools/math-graph/lib/math.min.js`

## 2. KaTeX
- **URL (JS)**: `https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js`
- **Save as**: `tools/math-graph/lib/katex.min.js`
- **URL (CSS)**: `https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css`
- **Save as**: `tools/math-graph/lib/katex.min.css`

## 3. Fonts (Optional but recommended for KaTeX)
KaTeX expects fonts in a `fonts` subdirectory relative to the CSS file.
- Create `tools/math-graph/lib/fonts/`
- Download font files from `https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/fonts/` if needed (e.g. `KaTeX_Main-Regular.woff2`, etc.)

## 4. Tailwind CSS (Optional)
The project is currently using a native CSS file (`style.css`), but if you want to use Tailwind for other parts:
- **URL**: `https://cdn.tailwindcss.com` (Save the script content)
- **Save as**: `tools/math-graph/lib/tailwindcss.js`

Once these are in place, the `index.html` will load them from your local disk.
