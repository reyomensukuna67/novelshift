/*
  Specular button shine effect — vanilla JS port of the React Bits
  SpecularButton component (https://reactbits.dev), adapted to attach
  to existing static buttons/links instead of rendering its own <button>.

  Usage:
    import { attachSpecularFX } from './specular-fx.js';
    attachSpecularFX(document.getElementById('some-btn'), {
      lineColor: '#ffffff',
      baseColor: '#C97B5C',
      ...
    });
*/
import { Renderer, Program, Mesh, Triangle, Color } from 'https://esm.sh/ogl';

const PAD = 20;

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform vec2 uCenter;
uniform vec2 uHalfSize;
uniform float uRadius;
uniform float uAngle;
uniform float uPx;
uniform vec3 uLineColor;
uniform vec3 uBaseColor;
uniform float uIntensity;
uniform float uShineSize;
uniform float uShineFade;
uniform float uThickness;
uniform float uBaseWidth;

out vec4 fragColor;

float sdRoundedRect(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float shapeSDF(vec2 p) { return sdRoundedRect(p, uHalfSize, uRadius); }

float gaussianLine(float d, float sigma) {
  float x = d / (sigma + 1e-6);
  float k = mix(1.0, 1.6, smoothstep(0.0, 1.5, x));
  return exp(-k * x * x);
}

void main() {
  vec2 p = gl_FragCoord.xy - uCenter;
  float d = shapeSDF(p);
  vec2 L = vec2(cos(uAngle), sin(uAngle));

  float base = (1.0 - smoothstep(0.0, uBaseWidth, abs(d))) * 0.45;

  vec2 nEll = normalize(p / (uHalfSize * uHalfSize) + 1e-6);
  float phi = acos(clamp(abs(dot(nEll, L)), 0.0, 1.0));
  float rim = 1.0 - smoothstep(uShineSize - uShineFade, uShineSize + uShineFade + 1e-4, phi);
  float line = gaussianLine(d, uThickness);
  float edgeClamp = 1.0 - smoothstep(0.5 * uPx, 3.0 * uPx, abs(d));
  float hi = line * rim * edgeClamp * uIntensity;

  vec3 col = uBaseColor * base + uLineColor * hi;
  float a = clamp(base + hi, 0.0, 1.0);
  fragColor = vec4(col, a);
}
`;

const DEFAULTS = {
  radius: null, // null = read from computed border-radius
  lineColor: '#ffffff',
  baseColor: '#525252',
  intensity: 1,
  shineSize: 10,
  shineFade: 40,
  thickness: 1,
  speed: 0.35,
  followMouse: true,
  proximity: 250,
  autoAnimate: false
};

/**
 * Attach the specular shine effect to an existing element (button or link).
 * Wraps the element's current content in a label span and injects an
 * absolutely-positioned canvas overlay behind it — the host element's own
 * classes/styles are left untouched.
 *
 * Returns a cleanup function that removes the effect.
 */
export function attachSpecularFX(host, options = {}) {
  if (!host) return () => {};
  const opts = { ...DEFAULTS, ...options };

  // Reduced-motion / no-WebGL: skip silently, host keeps its normal styling.
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return () => {};

  host.classList.add('specular-host');

  // Wrap existing content in a label span so it stays above the canvas.
  if (!host.querySelector(':scope > .specular-label')) {
    const label = document.createElement('span');
    label.className = 'specular-label';
    while (host.firstChild) label.appendChild(host.firstChild);
    host.appendChild(label);
  }

  const fx = document.createElement('span');
  fx.className = 'specular-fx';
  fx.setAttribute('aria-hidden', 'true');
  host.appendChild(fx);

  const dpr = window.devicePixelRatio || 1;
  let renderer;
  try {
    renderer = new Renderer({ alpha: true, premultipliedAlpha: true, antialias: true, dpr });
  } catch (e) {
    fx.remove();
    return () => {};
  }
  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const geometry = new Triangle(gl);
  if (geometry.attributes.uv) delete geometry.attributes.uv;

  const program = new Program(gl, {
    vertex: VERT,
    fragment: FRAG,
    uniforms: {
      uCenter: { value: [0, 0] },
      uHalfSize: { value: [1, 1] },
      uRadius: { value: 0 },
      uAngle: { value: 2.4 },
      uPx: { value: dpr },
      uLineColor: { value: [1, 1, 1] },
      uBaseColor: { value: [0.32, 0.32, 0.32] },
      uIntensity: { value: 1 },
      uShineSize: { value: 0.17 },
      uShineFade: { value: 0.7 },
      uThickness: { value: 1 },
      uBaseWidth: { value: dpr }
    }
  });

  const mesh = new Mesh(gl, { geometry, program });
  fx.appendChild(gl.canvas);

  const sizeRef = { w: 1, h: 1 };
  const computedRadius = () => {
    if (opts.radius != null) return opts.radius;
    const r = parseFloat(getComputedStyle(host).borderRadius);
    return Number.isFinite(r) ? r : 10;
  };

  const resize = () => {
    const rect = host.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    sizeRef.w = w;
    sizeRef.h = h;
    renderer.setSize(w + PAD * 2, h + PAD * 2);
    program.uniforms.uCenter.value = [(PAD + w / 2) * dpr, (PAD + h / 2) * dpr];
    program.uniforms.uHalfSize.value = [(w / 2) * dpr, (h / 2) * dpr];
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  let pointerAngle = null;
  let proximityT = 0;
  const onPointerMove = e => {
    const rect = host.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = Math.max(rect.left - e.clientX, 0, e.clientX - rect.right);
    const dy = Math.max(rect.top - e.clientY, 0, e.clientY - rect.bottom);
    const dist = Math.hypot(dx, dy);
    if (dist === 0) {
      const nx = (e.clientX - cx) / (rect.width / 2);
      const ny = (cy - e.clientY) / (rect.height / 2);
      pointerAngle = Math.atan2(2 / rect.height, -2 / rect.width) + nx * 0.3 + ny * 0.15;
    } else {
      pointerAngle = Math.atan2(cy - e.clientY, e.clientX - cx);
    }
    const t = Math.max(0, 1 - dist / Math.max(opts.proximity, 1));
    proximityT = t * t * (3 - 2 * t);
  };
  window.addEventListener('pointermove', onPointerMove);

  let angle = 2.4;
  let idleAngle = 2.4;
  let bright = 0;
  let last = performance.now();
  let raf = 0;

  const lineC = new Color();
  const baseC = new Color();

  const update = now => {
    raf = requestAnimationFrame(update);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    idleAngle += opts.speed * dt;
    const steer = opts.followMouse && pointerAngle != null && (!opts.autoAnimate || proximityT > 0);
    const target = steer ? pointerAngle : idleAngle;
    const diff = ((target - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    angle += diff * (1 - Math.exp(-dt * 7));

    const brightTarget = opts.autoAnimate ? 1 : proximityT;
    bright += (brightTarget - bright) * (1 - Math.exp(-dt * 8));

    lineC.set(opts.lineColor);
    baseC.set(opts.baseColor);
    program.uniforms.uAngle.value = angle;
    program.uniforms.uRadius.value = Math.min(computedRadius(), Math.min(sizeRef.w, sizeRef.h) / 2) * dpr;
    program.uniforms.uLineColor.value = [lineC.r, lineC.g, lineC.b];
    program.uniforms.uBaseColor.value = [baseC.r, baseC.g, baseC.b];
    program.uniforms.uIntensity.value = opts.intensity * bright;
    program.uniforms.uShineSize.value = (opts.shineSize * Math.PI) / 180;
    program.uniforms.uShineFade.value = (opts.shineFade * Math.PI) / 180;
    program.uniforms.uThickness.value = opts.thickness * dpr;
    renderer.render({ scene: mesh });
  };
  raf = requestAnimationFrame(update);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    window.removeEventListener('pointermove', onPointerMove);
    if (gl.canvas.parentNode === fx) fx.removeChild(gl.canvas);
    fx.remove();
    host.classList.remove('specular-host');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
}
