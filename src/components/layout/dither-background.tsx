"use client";

import { useRef, useEffect } from "react";

// ── GLSL ES 3.00 shaders ─────────────────────────────────────────────────────

const VERT = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_waveSpeed;
uniform float u_waveFrequency;
uniform float u_waveAmplitude;
uniform vec3  u_waveColor;
uniform vec2  u_mousePos;
uniform int   u_enableMouse;
uniform float u_mouseRadius;
uniform float u_colorNum;
uniform float u_pixelSize;

out vec4 fragColor;

// --- Perlin noise ---
vec4 mod289v(vec4 x){ return x - floor(x*(1.0/289.0))*289.0; }
vec4 permv(vec4 x)  { return mod289v(((x*34.0)+1.0)*x); }
vec4 tiSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314*r; }

float cnoise(vec2 P){
  vec4 Pi = floor(P.xyxy) + vec4(0,0,1,1);
  vec4 Pf = fract(P.xyxy) - vec4(0,0,1,1);
  Pi = mod289v(Pi);
  vec4 ix=Pi.xzxz, iy=Pi.yyww, fx=Pf.xzxz, fy=Pf.yyww;
  vec4 i = permv(permv(ix)+iy);
  vec4 gx = fract(i*(1.0/41.0))*2.0-1.0;
  vec4 gy = abs(gx)-0.5;
  gx -= floor(gx+0.5);
  vec2 g00=vec2(gx.x,gy.x), g10=vec2(gx.y,gy.y),
       g01=vec2(gx.z,gy.z), g11=vec2(gx.w,gy.w);
  vec4 norm = tiSqrt(vec4(dot(g00,g00),dot(g01,g01),dot(g10,g10),dot(g11,g11)));
  g00*=norm.x; g01*=norm.y; g10*=norm.z; g11*=norm.w;
  vec2 f = Pf.xy; f = f*f*f*(f*(f*6.0-15.0)+10.0);
  vec2 nx = mix(vec2(dot(g00,vec2(fx.x,fy.x)),dot(g01,vec2(fx.z,fy.z))),
                vec2(dot(g10,vec2(fx.y,fy.y)),dot(g11,vec2(fx.w,fy.w))), f.x);
  return 2.3*mix(nx.x,nx.y,f.y);
}

float fbm(vec2 p){
  float v=0.0, a=1.0, fr=u_waveFrequency;
  for(int i=0;i<4;i++){ v+=a*abs(cnoise(p)); p*=fr; a*=u_waveAmplitude; }
  return v;
}

float wavePattern(vec2 p){
  vec2 p2 = p - u_time*u_waveSpeed;
  return fbm(p + fbm(p2));
}

// --- Bayer 8x8 dither ---
const float B[64] = float[64](
   0.0/64.0, 48.0/64.0, 12.0/64.0, 60.0/64.0,  3.0/64.0, 51.0/64.0, 15.0/64.0, 63.0/64.0,
  32.0/64.0, 16.0/64.0, 44.0/64.0, 28.0/64.0, 35.0/64.0, 19.0/64.0, 47.0/64.0, 31.0/64.0,
   8.0/64.0, 56.0/64.0,  4.0/64.0, 52.0/64.0, 11.0/64.0, 59.0/64.0,  7.0/64.0, 55.0/64.0,
  40.0/64.0, 24.0/64.0, 36.0/64.0, 20.0/64.0, 43.0/64.0, 27.0/64.0, 39.0/64.0, 23.0/64.0,
   2.0/64.0, 50.0/64.0, 14.0/64.0, 62.0/64.0,  1.0/64.0, 49.0/64.0, 13.0/64.0, 61.0/64.0,
  34.0/64.0, 18.0/64.0, 46.0/64.0, 30.0/64.0, 33.0/64.0, 17.0/64.0, 45.0/64.0, 29.0/64.0,
  10.0/64.0, 58.0/64.0,  6.0/64.0, 54.0/64.0,  9.0/64.0, 57.0/64.0,  5.0/64.0, 53.0/64.0,
  42.0/64.0, 26.0/64.0, 38.0/64.0, 22.0/64.0, 41.0/64.0, 25.0/64.0, 37.0/64.0, 21.0/64.0
);

vec3 dither(vec2 fc, vec3 color){
  int x = int(mod(floor(fc.x/u_pixelSize), 8.0));
  int y = int(mod(floor(fc.y/u_pixelSize), 8.0));
  float t = B[y*8+x] - 0.25;
  float s = 1.0/(u_colorNum-1.0);
  color += t*s;
  color  = clamp(color-0.2, 0.0, 1.0);
  return floor(color*(u_colorNum-1.0)+0.5)/(u_colorNum-1.0);
}

void main(){
  vec2 uv = gl_FragCoord.xy/u_resolution;
  uv -= 0.5;
  uv.x *= u_resolution.x/u_resolution.y;

  float f = wavePattern(uv);

  if(u_enableMouse==1){
    vec2 m = (u_mousePos/u_resolution - 0.5)*vec2(1.0,-1.0);
    m.x *= u_resolution.x/u_resolution.y;
    float d = length(uv-m);
    f -= 0.5*(1.0-smoothstep(0.0,u_mouseRadius,d));
  }

  vec3 col = mix(vec3(0.0), u_waveColor, f);
  col = dither(gl_FragCoord.xy, col);
  fragColor = vec4(col, 1.0);
}`;

// ── WebGL helpers ─────────────────────────────────────────────────────────────

function makeShader(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    console.error("Shader compile error:", gl.getShaderInfoLog(s));
  return s;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface DitherBackgroundProps {
  waveSpeed?: number;
  waveFrequency?: number;
  waveAmplitude?: number;
  waveColor?: [number, number, number];
  colorNum?: number;
  pixelSize?: number;
  enableMouseInteraction?: boolean;
  mouseRadius?: number;
  /** ms to ramp waveColor from [0,0,0] → target on mount. 0 = instant. */
  rampDurationMs?: number;
  /**
   * When true the canvas renders at z-index 9997 (above page content) so it
   * can be used as a splash-screen background. When false (default) it sits at
   * z-index -10 behind everything.
   */
  elevated?: boolean;
}

export function DitherBackground({
  waveSpeed = 0.03,
  waveFrequency = 6.7,
  waveAmplitude = 0.08,
  waveColor = [0.243, 0.251, 0.243],
  colorNum = 2.5,
  pixelSize = 2,
  enableMouseInteraction = true,
  mouseRadius = 0.5,
  rampDurationMs = 0,
  elevated = false,
}: DitherBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Live props — updated every render, read inside the rAF loop without re-init
  const propsRef = useRef({ waveSpeed, waveFrequency, waveAmplitude, waveColor, colorNum, pixelSize, enableMouseInteraction, mouseRadius, rampDurationMs });
  useEffect(() => {
    propsRef.current = { waveSpeed, waveFrequency, waveAmplitude, waveColor, colorNum, pixelSize, enableMouseInteraction, mouseRadius, rampDurationMs };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2");
    if (!gl) { console.error("WebGL2 not available"); return; }

    // Build program
    const prog = gl.createProgram()!;
    gl.attachShader(prog, makeShader(gl, gl.VERTEX_SHADER,   VERT));
    gl.attachShader(prog, makeShader(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // Full-screen quad (triangle strip)
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Cache uniform locations
    const U = {
      res:    gl.getUniformLocation(prog, "u_resolution"),
      time:   gl.getUniformLocation(prog, "u_time"),
      speed:  gl.getUniformLocation(prog, "u_waveSpeed"),
      freq:   gl.getUniformLocation(prog, "u_waveFrequency"),
      amp:    gl.getUniformLocation(prog, "u_waveAmplitude"),
      color:  gl.getUniformLocation(prog, "u_waveColor"),
      mpos:   gl.getUniformLocation(prog, "u_mousePos"),
      menable:gl.getUniformLocation(prog, "u_enableMouse"),
      mrad:   gl.getUniformLocation(prog, "u_mouseRadius"),
      cnum:   gl.getUniformLocation(prog, "u_colorNum"),
      psize:  gl.getUniformLocation(prog, "u_pixelSize"),
    };

    // Responsive canvas size
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = Math.floor(canvas.offsetWidth  * dpr);
      canvas.height = Math.floor(canvas.offsetHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Mouse
    let mx = 0, my = 0;
    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      mx = (e.clientX - r.left)  * dpr;
      my = (e.clientY - r.top)   * dpr;
    };
    window.addEventListener("mousemove", onMove);

    // Animation loop
    const t0 = performance.now();
    let raf = 0;

    const frame = () => {
      const p = propsRef.current;
      const t = (performance.now() - t0) / 1000;

      // Intensity ramp: scale waveColor from [0,0,0] → target over rampDurationMs
      let intensity = 1.0;
      if (p.rampDurationMs > 0) {
        const raw = Math.min(1.0, (t * 1000) / p.rampDurationMs);
        // Smoothstep easing — slow start, fast middle, settles gently
        intensity = raw * raw * (3.0 - 2.0 * raw);
      }
      const wc = p.waveColor;

      gl.uniform2f(U.res,     canvas.width, canvas.height);
      gl.uniform1f(U.time,    t);
      gl.uniform1f(U.speed,   p.waveSpeed);
      gl.uniform1f(U.freq,    p.waveFrequency);
      gl.uniform1f(U.amp,     p.waveAmplitude);
      gl.uniform3f(U.color,   wc[0] * intensity, wc[1] * intensity, wc[2] * intensity);
      gl.uniform2f(U.mpos,    mx, my);
      gl.uniform1i(U.menable, p.enableMouseInteraction ? 1 : 0);
      gl.uniform1f(U.mrad,    p.mouseRadius);
      gl.uniform1f(U.cnum,    p.colorNum);
      gl.uniform1f(U.psize,   p.pixelSize);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("mousemove", onMove);
      gl.deleteProgram(prog);
      gl.deleteBuffer(vbo);
    };
  }, []); // init once

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: elevated ? 9997 : -10, backgroundColor: "black" }}
    />
  );
}
