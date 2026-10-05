/* Mohd Sakib — portfolio runtime. Vanilla JS, no dependencies. */
(() => {
  "use strict";

  const root = document.documentElement;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const mqDesktop = window.matchMedia("(min-width: 981px)");
  const EMAIL = "mohdsakib9398@gmail.com";
  const GITHUB = "https://github.com/MohdSakib535";
  const LINKEDIN = "https://www.linkedin.com/in/mohdsakibb/";
  const RESUME = "MohdSakib_Resume.pdf";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
  };

  // ---------- Shared rAF ticker ----------
  // One loop for everything that animates continuously (field, cursor, marquee).
  const ticker = (() => {
    const subs = new Set();
    let raf = 0;
    let last = 0;
    const loop = (now) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      subs.forEach((fn) => fn(dt, now));
      raf = subs.size ? requestAnimationFrame(loop) : 0;
      if (!raf) last = 0;
    };
    return {
      add(fn) {
        subs.add(fn);
        if (!raf) raf = requestAnimationFrame(loop);
      },
      remove(fn) { subs.delete(fn); },
    };
  })();

  // Smoothed scroll velocity (px/s) — feeds the marquee and the field spin.
  const scrollState = { v: 0 };
  if (!prefersReduced) {
    let prevY = window.scrollY;
    ticker.add((dt) => {
      const y = window.scrollY;
      const inst = (y - prevY) / dt;
      prevY = y;
      scrollState.v += (inst - scrollState.v) * 0.18;
      if (Math.abs(scrollState.v) < 0.5) scrollState.v = 0;
    });
  }

  // ---------- Toast ----------
  const toastEl = $("#toast");
  let toastTimer = 0;
  const toast = (msg) => {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-on"), 1800);
  };

  const copyEmail = () => {
    const done = () => toast("Email copied ✓");
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(EMAIL).then(done, () => toast(EMAIL));
    } else {
      toast(EMAIL);
    }
  };

  const downloadResume = () => {
    const a = document.createElement("a");
    a.href = RESUME;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  let introDone = false; // flips once the loader lifts; gates field scene changes

  const scrollToId = (id) => {
    document.querySelector(id)?.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
  };

  // =====================================================================
  // Particle field — one WebGL canvas behind the page. Each section has a
  // "scene": a target shape plus placement; particles ease between shapes
  // on the CPU and are drawn as soft additive points on the GPU.
  // =====================================================================
  const createField = () => {
    const canvas = $("#field");
    if (!canvas) return null;
    let gl = null;
    try {
      gl = canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      gl = null;
    }
    if (!gl) {
      canvas.remove();
      return null;
    }

    const compact = !mqDesktop.matches || !finePointer;
    const COUNT = compact ? 2600 : 7000;

    // deterministic random so shapes are identical on every load
    let seed = 20260;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const gauss = () => {
      let u = 0;
      let v = 0;
      while (!u) u = rnd();
      while (!v) v = rnd();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    const make = (fn) => {
      const a = new Float32Array(COUNT * 3);
      for (let i = 0; i < COUNT; i++) {
        const p = fn(i, COUNT);
        a[i * 3] = p[0];
        a[i * 3 + 1] = p[1];
        a[i * 3 + 2] = p[2];
      }
      return a;
    };
    const TAU = Math.PI * 2;
    const GOLDEN = Math.PI * (3 - Math.sqrt(5));

    const shapes = {
      scatter: make(() => {
        const r = 2.6 + rnd() * 2.4;
        const th = rnd() * TAU;
        const ph = Math.acos(2 * rnd() - 1);
        return [r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph)];
      }),
      // a planet-like cluster: Fibonacci shell + a tilted ring of "satellites"
      sphere: make((i, n) => {
        const shell = Math.floor(n * 0.84);
        if (i < shell) {
          const y = 1 - (i / (shell - 1)) * 2;
          const r = Math.sqrt(1 - y * y);
          const th = i * GOLDEN;
          const j = 1 + (rnd() - 0.5) * 0.035;
          return [Math.cos(th) * r * j, y * j, Math.sin(th) * r * j];
        }
        const a = rnd() * TAU;
        const R = 1.42 + gauss() * 0.035;
        const x = Math.cos(a) * R;
        const z = Math.sin(a) * R;
        const y = gauss() * 0.012;
        const tilt = 0.42;
        return [x, y * Math.cos(tilt) - z * Math.sin(tilt), y * Math.sin(tilt) + z * Math.cos(tilt)];
      }),
      galaxy: make(() => {
        const arms = 3;
        const arm = Math.floor(rnd() * arms);
        const r = Math.pow(rnd(), 0.55) * 1.45;
        const a = arm * (TAU / arms) + r * 3.4 + gauss() * 0.2 * (1.5 - r * 0.6);
        return [Math.cos(a) * r, gauss() * 0.05 * (1.6 - r), Math.sin(a) * r];
      }),
      plane: make((i, n) => {
        const side = Math.ceil(Math.sqrt(n));
        const x = ((i % side) / (side - 1)) * 2 - 1;
        const z = (Math.floor(i / side) / (side - 1)) * 2 - 1;
        return [x * 1.8, 0.16 * Math.sin(x * 3.2) * Math.cos(z * 2.6), z * 1.15];
      }),
      rings: make((i, n) => {
        if (i < n * 0.1) {
          const th = rnd() * TAU;
          const ph = Math.acos(2 * rnd() - 1);
          const r = 0.17 * Math.cbrt(rnd());
          return [r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)];
        }
        const radii = [0.48, 0.8, 1.12];
        let pick = rnd() * 2.4;
        let k = 0;
        while (k < 2 && pick > radii[k]) {
          pick -= radii[k];
          k++;
        }
        const a = rnd() * TAU;
        const R = radii[k] + gauss() * 0.012;
        return [Math.cos(a) * R, gauss() * 0.012, Math.sin(a) * R];
      }),
      helix: make((i, n) => {
        const t = rnd();
        const rad = 0.42;
        if (i < n * 0.22) {
          const step = Math.round(t * 46) / 46;
          const ang = step * Math.PI * 7;
          const s = rnd() * 2 - 1;
          return [-2.1 + step * 4.2, Math.cos(ang) * rad * s, Math.sin(ang) * rad * s];
        }
        const ang = t * Math.PI * 7 + (i % 2 ? Math.PI : 0);
        return [-2.1 + t * 4.2, Math.cos(ang) * rad + gauss() * 0.015, Math.sin(ang) * rad + gauss() * 0.015];
      }),
      knot: make(() => {
        const t = rnd() * TAU;
        const r = Math.cos(3 * t) + 2;
        const s = 0.38;
        return [
          r * Math.cos(2 * t) * s + gauss() * 0.028,
          r * Math.sin(2 * t) * s + gauss() * 0.028,
          -Math.sin(3 * t) * s * 1.4 + gauss() * 0.028,
        ];
      }),
      portal: make((i, n) => {
        const a = rnd() * TAU;
        if (i < n * 0.7) {
          const R = 1.15 + gauss() * 0.035;
          return [Math.cos(a) * R, Math.sin(a) * R, gauss() * 0.04];
        }
        const R = 1.15 + Math.abs(gauss()) * 0.6;
        return [Math.cos(a) * R, Math.sin(a) * R, gauss() * 0.25];
      }),
    };

    // x/y: screen offset (NDC); m*: overrides for narrow screens
    const SCENES = {
      home: { shape: "sphere", x: 0.36, y: 0.02, mx: 0.4, my: 0.5, scale: 1, ms: 0.78, alpha: 1, tilt: 0.32, yaw: 0.12 },
      about: { shape: "galaxy", x: 0.46, y: 0.05, scale: 1.05, alpha: 0.6, tilt: 1.05, yaw: 0.08 },
      architecture: { shape: "plane", x: 0, y: -0.38, scale: 1.3, alpha: 0.4, tilt: 0.95, yaw: 0.025, wave: 1 },
      stack: { shape: "rings", x: 0.42, y: 0, scale: 1.35, alpha: 0.42, tilt: 1.2, yaw: 0.14 },
      work: { shape: "helix", x: 0, y: -0.05, scale: 1.05, alpha: 0.32, tilt: 0.25, yaw: 0, roll: 0.45 },
      journey: { shape: "knot", x: -0.52, y: -0.05, scale: 0.85, alpha: 0.55, tilt: 0.45, yaw: 0.16 },
      contact: { shape: "portal", x: 0, y: 0.08, scale: 1.25, alpha: 0.6, tilt: 0, yaw: 0, spinZ: 0.06 },
    };

    const VS = `
      attribute vec3 aPos;
      attribute vec4 aSeed;
      uniform mat3 uRot;
      uniform vec2 uProj;
      uniform vec2 uOffset;
      uniform float uScale;
      uniform float uTime;
      uniform float uWave;
      uniform float uAlpha;
      uniform float uSize;
      uniform float uAspect;
      uniform vec3 uMouse;
      uniform vec3 uPulse;
      varying float vAlpha;
      varying float vTint;
      const float CAM = 4.0;

      void main() {
        vec3 p = aPos;
        float ph = aSeed.w * 6.2831;
        p += 0.014 * vec3(sin(uTime * 0.9 + ph), cos(uTime * 0.7 + ph * 1.3), sin(uTime * 0.8 + ph * 0.7));
        p.y += uWave * 0.11 * sin(p.x * 3.6 + uTime * 1.3) * cos(p.z * 3.2 + uTime * 0.9);
        p = uRot * (p * uScale);

        float persp = CAM / max(CAM - p.z, 0.6);
        vec2 ndc = p.xy * uProj * persp + uOffset;

        vec2 asp = vec2(uAspect, 1.0);
        vec2 dm = (ndc - uMouse.xy) * asp;
        float lm = length(dm);
        ndc += (dm / max(lm, 1e-4)) / asp * smoothstep(0.34, 0.0, lm) * 0.075 * uMouse.z;

        vec2 dp = (ndc - uPulse.xy) * asp;
        float lp = length(dp);
        float band = exp(-pow((lp - uPulse.z * 1.5) * 6.0, 2.0)) * exp(-uPulse.z * 1.6);
        ndc += (dp / max(lp, 1e-4)) / asp * band * 0.07;

        gl_Position = vec4(ndc, 0.0, 1.0);
        gl_PointSize = aSeed.z * uSize * persp * (1.0 + band * 1.4);

        float depth = smoothstep(-1.6, 1.4, p.z);
        vAlpha = uAlpha * mix(0.18, 1.0, depth) * (0.45 + 0.55 * aSeed.x) * (1.0 + band * 1.5);
        vTint = aSeed.y;
      }`;

    const FS = `
      precision mediump float;
      uniform vec3 uAccent;
      varying float vAlpha;
      varying float vTint;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float r = dot(c, c) * 4.0;
        if (r > 1.0) discard;
        float a = 1.0 - r;
        a *= a;
        vec3 col = mix(vec3(0.93, 0.92, 0.89), uAccent, vTint);
        float al = a * vAlpha;
        gl_FragColor = vec4(col * al, al);
      }`;

    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn("[field] shader:", gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, VS);
    const fs = compile(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) {
      canvas.remove();
      return null;
    }
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("[field] link:", gl.getProgramInfoLog(prog));
      canvas.remove();
      return null;
    }
    gl.useProgram(prog);

    const pos = new Float32Array(shapes.scatter);
    let tgt = shapes.scatter;
    const seeds = new Float32Array(COUNT * 4);
    const ease = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      seeds[i * 4] = rnd();
      seeds[i * 4 + 1] = rnd() < 0.68 ? 0.75 + rnd() * 0.25 : rnd() * 0.15;
      seeds[i * 4 + 2] = 0.7 + Math.pow(rnd(), 4) * 2.6;
      seeds[i * 4 + 3] = rnd();
      ease[i] = 0.022 + rnd() * 0.05;
    }

    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

    const seedBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf);
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
    const aSeed = gl.getAttribLocation(prog, "aSeed");
    gl.enableVertexAttribArray(aSeed);
    gl.vertexAttribPointer(aSeed, 4, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);

    const U = {};
    ["uRot", "uProj", "uOffset", "uScale", "uTime", "uWave", "uAlpha", "uSize", "uAspect", "uMouse", "uPulse", "uAccent"].forEach(
      (n) => (U[n] = gl.getUniformLocation(prog, n))
    );

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.clearColor(0, 0, 0, 0);

    // column-major 3x3 rotations
    const rotX = (a) => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, s, 0, -s, c]; };
    const rotY = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 1, 0, s, 0, c]; };
    const rotZ = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, -s, c, 0, 0, 0, 1]; };
    const mul = (A, B) => {
      const o = new Array(9);
      for (let col = 0; col < 3; col++) {
        for (let row = 0; row < 3; row++) {
          o[col * 3 + row] = A[row] * B[col * 3] + A[3 + row] * B[col * 3 + 1] + A[6 + row] * B[col * 3 + 2];
        }
      }
      return o;
    };

    const cur = { x: 0.36, y: 0, scale: 1, alpha: 0, tilt: 0.3, yaw: 0.1, roll: 0, spinZ: 0, wave: 0 };
    let goal = { ...cur };
    const ang = { yaw: 0, roll: 0, z: 0 };
    const mouse = { x: 0, y: 0, tx: 0, ty: 0, s: 0, ts: 0 };
    const pulse = { x: 0, y: 0, t: -100 };
    let accent = [0.8, 0.98, 0.27];
    let time = 0;
    let settled = false;
    let sceneId = "";
    let extraX = 0;
    let W = 1;
    let H = 1;
    let dpr = 1;
    let aspect = 1;
    let projX = 0.44;
    let projY = 0.44;
    let lost = false;

    const setAccent = (hex) => {
      const n = parseInt(String(hex).trim().slice(1), 16);
      if (Number.isNaN(n)) return;
      accent = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
      if (prefersReduced) draw();
    };

    const resize = () => {
      W = canvas.clientWidth || window.innerWidth;
      H = canvas.clientHeight || window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 1.75);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      aspect = W / H;
      const base = aspect >= 1 ? 0.44 : 0.6;
      if (aspect >= 1) {
        projX = base / aspect;
        projY = base;
      } else {
        projX = base;
        projY = base * aspect;
      }
      if (sceneId) applyGoal(SCENES[sceneId]);
      if (prefersReduced) draw();
    };

    const applyGoal = (sc) => {
      const narrow = !mqDesktop.matches;
      goal = {
        x: narrow ? sc.mx ?? 0 : sc.x,
        y: narrow ? sc.my ?? sc.y : sc.y,
        scale: sc.scale * (narrow ? sc.ms ?? 1 : 1),
        alpha: sc.alpha * (narrow && sc !== SCENES.home ? 0.7 : 1),
        tilt: sc.tilt,
        yaw: sc.yaw,
        roll: sc.roll || 0,
        spinZ: sc.spinZ || 0,
        wave: sc.wave || 0,
      };
    };

    const draw = () => {
      if (lost) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      const rot = mul(rotZ(ang.z), mul(rotX(cur.tilt + mouse.y * 0.18), mul(rotY(ang.yaw + mouse.x * 0.35), rotX(ang.roll))));
      gl.uniformMatrix3fv(U.uRot, false, rot);
      gl.uniform2f(U.uProj, projX, projY);
      gl.uniform2f(U.uOffset, cur.x + (sceneId === "work" ? extraX : 0), cur.y);
      gl.uniform1f(U.uScale, cur.scale);
      gl.uniform1f(U.uTime, time);
      gl.uniform1f(U.uWave, cur.wave);
      gl.uniform1f(U.uAlpha, cur.alpha);
      gl.uniform1f(U.uSize, (compact ? 2.4 : 2.2) * dpr);
      gl.uniform1f(U.uAspect, aspect);
      gl.uniform3f(U.uMouse, mouse.x, mouse.y, mouse.s);
      gl.uniform3f(U.uPulse, pulse.x, pulse.y, time - pulse.t);
      gl.uniform3f(U.uAccent, accent[0], accent[1], accent[2]);
      gl.drawArrays(gl.POINTS, 0, COUNT);
    };

    setAccent(getComputedStyle(root).getPropertyValue("--accent") || "#cdfb45");

    const frame = (dt) => {
      time += dt;
      const k = 1 - Math.pow(0.04, dt);
      for (const key in goal) cur[key] += (goal[key] - cur[key]) * k;
      ang.yaw += (cur.yaw + Math.min(Math.abs(scrollState.v) * 0.0009, 0.9)) * dt;
      ang.roll += cur.roll * dt;
      ang.z += cur.spinZ * dt;

      const km = 1 - Math.pow(0.002, dt);
      mouse.x += (mouse.tx - mouse.x) * km;
      mouse.y += (mouse.ty - mouse.y) * km;
      mouse.s += (mouse.ts - mouse.s) * km;

      if (!settled) {
        const f = Math.min(dt * 60, 3);
        let moving = false;
        for (let i = 0, j = 0; i < COUNT; i++, j += 3) {
          const e = Math.min(1, ease[i] * f);
          const dx = tgt[j] - pos[j];
          const dy = tgt[j + 1] - pos[j + 1];
          const dz = tgt[j + 2] - pos[j + 2];
          pos[j] += dx * e;
          pos[j + 1] += dy * e;
          pos[j + 2] += dz * e;
          if (!moving && (dx * dx + dy * dy + dz * dz) > 1e-6) moving = true;
        }
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos);
        if (!moving) settled = true;
      }

      draw();
    };

    const setScene = (id) => {
      const sc = SCENES[id];
      if (!sc || id === sceneId) return;
      if (prefersReduced && sceneId) return; // reduced motion: one static scene
      sceneId = id;
      tgt = shapes[sc.shape];
      settled = false;
      applyGoal(sc);
      if (prefersReduced) {
        Object.assign(cur, goal);
        pos.set(tgt);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos);
        settled = true;
        draw();
      }
    };

    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      lost = true;
      ticker.remove(frame);
      canvas.classList.remove("is-ready");
    });

    resize();
    window.addEventListener("resize", resize);
    root.classList.add("has-field");

    return {
      count: COUNT,
      start() {
        canvas.classList.add("is-ready");
        if (!prefersReduced) ticker.add(frame);
        else draw();
      },
      setScene,
      setAccent,
      setExtraX(v) { extraX = v; },
      pointer(cx, cy) {
        mouse.tx = (cx / W) * 2 - 1;
        mouse.ty = -((cy / H) * 2 - 1);
        mouse.ts = 1;
      },
      pointerOut() { mouse.ts = 0; },
      pulse(cx, cy) {
        if (prefersReduced) return;
        pulse.x = (cx / W) * 2 - 1;
        pulse.y = -((cy / H) * 2 - 1);
        pulse.t = time;
      },
    };
  };

  const field = createField();

  // ---------- Accent color ----------
  const hexToRgb = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const ACCENTS = { lime: "#cdfb45", amber: "#ff9f5a", cyan: "#4fd7ff", violet: "#c4a2ff" };

  const applyAccent = (hex) => {
    if (!/^#[0-9a-f]{6}$/i.test(hex || "")) return;
    const [r, g, b] = hexToRgb(hex);
    root.style.setProperty("--accent", hex);
    root.style.setProperty("--accent-dim", `rgba(${r}, ${g}, ${b}, 0.14)`);
    root.style.setProperty("--accent-glow", `rgba(${r}, ${g}, ${b}, 0.5)`);
    $$(".swatch").forEach((s) => s.classList.toggle("is-active", s.dataset.accent === hex));
    field?.setAccent(hex);
  };
  const setAccent = (hex) => {
    applyAccent(hex);
    store.set("accent", hex);
  };
  applyAccent(store.get("accent"));
  $$(".swatch").forEach((sw) => sw.addEventListener("click", () => setAccent(sw.dataset.accent)));

  // ---------- Split headings into words ----------
  const splitWords = (el, make) => {
    let idx = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(" "));
            else frag.appendChild(make(part, idx++));
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== "BR") {
          walk(child);
        }
      });
    };
    walk(el);
  };

  if (!prefersReduced) {
    $$("[data-split]").forEach((h) =>
      splitWords(h, (word, i) => {
        const w = document.createElement("span");
        w.className = "w";
        const inner = document.createElement("span");
        inner.className = "w__i";
        inner.style.setProperty("--wi", String(i));
        inner.textContent = word;
        w.appendChild(inner);
        return w;
      })
    );
  }

  // manifesto: words light up as it scrolls through the viewport
  const manifesto = $("[data-scrub]");
  let scrubWords = [];
  let scrubN = -1;
  if (manifesto && !prefersReduced) {
    splitWords(manifesto, (word) => {
      const s = document.createElement("span");
      s.className = "sw";
      s.textContent = word;
      return s;
    });
    scrubWords = $$(".sw", manifesto);
    manifesto.classList.add("is-scrub");
  }
  const updateScrub = () => {
    if (!scrubWords.length) return;
    const r = manifesto.getBoundingClientRect();
    const vh = window.innerHeight;
    const start = vh * 0.88;
    const end = vh * 0.4;
    const p = clamp((start - r.top) / (r.height + start - end), 0, 1);
    const n = Math.round(p * scrubWords.length);
    if (n === scrubN) return;
    const lo = Math.min(n, Math.max(scrubN, 0));
    const hi = Math.max(n, scrubN);
    for (let i = lo; i < hi; i++) scrubWords[i].classList.toggle("is-on", i < n);
    scrubN = n;
  };

  // ---------- Reveal on scroll ----------
  const revealIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealIO.unobserve(entry.target);
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -8% 0px" }
  );
  $$(".reveal").forEach((el) => {
    const siblings = el.parentElement ? $$(":scope > .reveal", el.parentElement) : [el];
    el.style.setProperty("--reveal-delay", `${(siblings.indexOf(el) % 6) * 0.08}s`);
    revealIO.observe(el);
  });
  $$("[data-split]").forEach((el) => revealIO.observe(el));

  // ---------- Count-up stats ----------
  if (!prefersReduced) {
    const countIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          countIO.unobserve(entry.target);
          const el = entry.target;
          const to = Number(el.dataset.count) || 0;
          const t0 = performance.now();
          const dur = 1400;
          const step = (now) => {
            const t = Math.min(1, (now - t0) / dur);
            el.textContent = String(Math.round(to * (1 - Math.pow(1 - t, 4))));
            if (t < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
      },
      { threshold: 0.6 }
    );
    $$("[data-count]").forEach((el) => {
      el.textContent = "0";
      countIO.observe(el);
    });
  }

  // ---------- Scramble decode on markers ----------
  if (!prefersReduced) {
    const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/(){}[]<>#$*";
    const scramble = (el) => {
      const final = el.dataset.text || el.textContent;
      el.dataset.text = final;
      let frame = 0;
      const total = 26;
      const tick = () => {
        let out = "";
        for (let i = 0; i < final.length; i++) {
          if (i < (frame / total) * final.length || final[i] === " ") out += final[i];
          else out += CHARS[Math.floor(Math.random() * CHARS.length)];
        }
        el.textContent = out;
        frame++;
        if (frame <= total) requestAnimationFrame(tick);
        else el.textContent = final;
      };
      tick();
    };
    const scrambleIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          scramble(entry.target);
          scrambleIO.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );
    $$(".marker").forEach((m) => scrambleIO.observe(m));
  }

  // ---------- Navigation ----------
  const header = $(".site-header");
  const navToggle = $(".nav__toggle");
  const navLinks = $("#navLinks");
  const navAnchors = $$(".nav__links > li > a");
  const indicator = $(".nav__indicator");
  const scrollProgress = $("#scrollProgress");

  const closeNav = () => {
    if (!navLinks || !navToggle) return;
    navLinks.classList.remove("is-open");
    navToggle.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  };

  navToggle?.addEventListener("click", () => {
    const open = navLinks.classList.toggle("is-open");
    navToggle.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("menu-open", open);
    header?.classList.remove("is-hidden");
  });

  // all in-page anchors scroll smoothly and close the drawer
  document.addEventListener("click", (e) => {
    const a = e.target instanceof Element ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    const id = a.getAttribute("href");
    if (!id || id === "#" || !document.querySelector(id)) return;
    e.preventDefault();
    scrollToId(id);
    closeNav();
  });

  document.addEventListener("click", (e) => {
    if (!navLinks?.classList.contains("is-open")) return;
    const t = e.target;
    if (!(t instanceof Element) || navLinks.contains(t) || navToggle.contains(t)) return;
    closeNav();
  });
  window.addEventListener("keydown", (e) => e.key === "Escape" && closeNav());
  mqDesktop.addEventListener?.("change", (e) => e.matches && closeNav());

  const navMap = new Map();
  navAnchors.forEach((a) => navMap.set(a.getAttribute("href").slice(1), a));
  const dockMap = new Map();
  $$(".mobile-dock a").forEach((a) => dockMap.set(a.getAttribute("href").slice(1), a));

  const moveIndicator = () => {
    if (!indicator) return;
    const a = navMap.get(activeId);
    if (!a || !mqDesktop.matches) {
      indicator.style.opacity = "0";
      return;
    }
    indicator.style.opacity = "1";
    indicator.style.width = `${a.offsetWidth}px`;
    indicator.style.transform = `translateX(${a.offsetLeft}px)`;
  };

  let activeId = "";
  const applyActive = (id) => {
    if (id === activeId) return;
    activeId = id;
    navMap.forEach((a, key) => a.classList.toggle("is-active", key === id));
    dockMap.forEach((a, key) => a.classList.toggle("is-active", key === id));
    moveIndicator();
    if (introDone) field?.setScene(id);
  };

  // ---------- Work: pinned horizontal gallery ----------
  const work = (() => {
    const pin = $("#workPin");
    const track = $("#workTrack");
    const viewport = $("#workViewport");
    const idxEl = $("#workIdx");
    const bar = $("#workBar");
    if (!pin || !track || !viewport) return { measure() {}, update() {} };
    const cards = $$(".project", track);
    const arts = cards.map((c) => c.querySelector(".art"));
    const projectCount = cards.filter((c) => !c.classList.contains("project--more")).length;
    let top = 0;
    let dist = 0;
    let on = false;
    let lastIdx = 0;
    let offsets = [];

    const setIdx = (i) => {
      const n = Math.min(i, projectCount - 1) + 1;
      if (n === lastIdx || !idxEl) return;
      lastIdx = n;
      idxEl.textContent = String(n).padStart(2, "0");
    };

    const measure = () => {
      on = mqDesktop.matches;
      offsets = cards.map((c) => ({ left: c.offsetLeft, w: c.offsetWidth }));
      if (!on) {
        pin.style.height = "";
        track.style.transform = "";
        arts.forEach((a) => a && (a.style.transform = ""));
        return;
      }
      dist = Math.max(0, track.scrollWidth - viewport.clientWidth);
      pin.style.height = `${window.innerHeight + dist}px`;
      top = pin.getBoundingClientRect().top + window.scrollY;
    };

    const update = (y) => {
      if (!on) return;
      const p = dist ? clamp((y - top) / dist, 0, 1) : 0;
      const x = -p * dist;
      track.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
      if (bar) bar.style.transform = `scaleX(${p.toFixed(4)})`;
      const mid = viewport.clientWidth / 2;
      let best = 0;
      let bestD = Infinity;
      offsets.forEach((o, i) => {
        const c = o.left + o.w / 2 + x;
        const d = Math.abs(c - mid);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
        // art drifts against the scroll for a touch of depth
        if (arts[i] && !prefersReduced) arts[i].style.transform = `translate3d(${((c - mid) * -0.05).toFixed(1)}px, 0, 0)`;
      });
      setIdx(best);
      field?.setExtraX(0.3 - p * 0.6);
    };

    // mobile: swipe carousel drives the same counter
    viewport.addEventListener(
      "scroll",
      () => {
        if (on) return;
        const max = Math.max(1, viewport.scrollWidth - viewport.clientWidth);
        if (bar) bar.style.transform = `scaleX(${(viewport.scrollLeft / max).toFixed(4)})`;
        const mid = viewport.scrollLeft + viewport.clientWidth / 2;
        let best = 0;
        let bestD = Infinity;
        offsets.forEach((o, i) => {
          const d = Math.abs(o.left + o.w / 2 - mid);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        });
        setIdx(best);
      },
      { passive: true }
    );

    return { measure, update };
  })();

  // ---------- Journey: scroll-drawn timeline ----------
  const journey = (() => {
    const tl = $("#timeline");
    const fill = $("#timelineFill");
    const yearEl = $("#journeyYear");
    const roleEl = $("#journeyRole");
    const items = $$(".tl-item");
    if (!tl || !items.length) return { measure() {}, update() {} };
    let tops = [];
    let tlTop = 0;
    let tlH = 1;
    let active = -1;
    let passed = -1;

    const measure = () => {
      const sy = window.scrollY;
      const r = tl.getBoundingClientRect();
      tlTop = r.top + sy;
      tlH = Math.max(1, r.height);
      tops = items.map((it) => it.getBoundingClientRect().top + sy);
    };

    const swap = (el, text) => {
      if (!el || el.textContent === text) return;
      el.textContent = text;
      el.classList.remove("is-swap");
      void el.offsetWidth;
      el.classList.add("is-swap");
    };

    const update = (y) => {
      const mid = y + window.innerHeight * 0.55;
      if (fill) fill.style.transform = `scaleY(${clamp((mid - tlTop) / tlH, 0, 1).toFixed(4)})`;
      let a = 0;
      let count = 0;
      tops.forEach((t, i) => {
        if (mid >= t) {
          a = i;
          count = i + 1;
        }
      });
      if (count !== passed) {
        passed = count;
        items.forEach((it, i) => it.classList.toggle("is-passed", i < count));
      }
      if (a !== active) {
        active = a;
        const yearSpan = yearEl;
        swap(yearSpan, items[a].dataset.year || "");
        swap(roleEl, items[a].dataset.role || "");
      }
    };

    return { measure, update };
  })();

  // ---------- Footer: outline name fills as you arrive ----------
  const footerBig = $("#footerBig");
  let footerP = -1;
  const updateFooter = () => {
    if (!footerBig) return;
    const r = footerBig.getBoundingClientRect();
    if (r.top > window.innerHeight && footerP === 0) return;
    // 0 when the name enters the viewport, 1 exactly at the bottom of the page
    const y = window.scrollY;
    const top = r.top + y;
    const span = scrollMax + window.innerHeight - top;
    const p = span > 0 ? clamp((y + window.innerHeight - top) / span, 0, 1) : 1;
    if (Math.abs(p - footerP) < 0.002) return;
    footerP = p;
    footerBig.style.setProperty("--fill", `${(p * 100).toFixed(1)}%`);
  };

  // ---------- Scroll loop ----------
  const sections = $$("main section[id]");
  let sectionTops = [];
  let scrollMax = 1;
  let lastY = window.scrollY;

  const measureSections = () => {
    const sy = window.scrollY;
    sectionTops = sections.map((s) => ({ id: s.id, top: s.getBoundingClientRect().top + sy }));
    scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  };

  const onScroll = () => {
    const y = window.scrollY;
    if (header) {
      header.classList.toggle("is-scrolled", y > 20);
      const menuOpen = document.body.classList.contains("menu-open");
      if (y > lastY + 6 && y > 400 && !menuOpen) header.classList.add("is-hidden");
      else if (y < lastY - 6 || y < 200) header.classList.remove("is-hidden");
      if (Math.abs(y - lastY) > 6) lastY = y;
    }
    if (scrollProgress) scrollProgress.style.transform = `scaleX(${clamp(y / scrollMax, 0, 1).toFixed(4)})`;
    const probe = y + window.innerHeight * 0.45;
    let id = sections[0]?.id || "home";
    for (const s of sectionTops) if (probe >= s.top) id = s.id;
    applyActive(id);
    work.update(y);
    journey.update(y);
    updateScrub();
    updateFooter();
  };

  let scrollQueued = false;
  window.addEventListener(
    "scroll",
    () => {
      if (scrollQueued) return;
      scrollQueued = true;
      requestAnimationFrame(() => {
        scrollQueued = false;
        onScroll();
      });
    },
    { passive: true }
  );

  // ---------- Stack orbit ----------
  const orbitWrap = $(".orbit-wrap");
  const orbit = $("#orbit");
  const scaleOrbit = () => {
    if (!orbitWrap) return;
    // 900 = 800px orbit box + room for the outer ring's pills
    const s = Math.min(1, orbitWrap.clientWidth / 900);
    orbitWrap.style.setProperty("--s", s.toFixed(3));
  };
  $$(".stack-cat").forEach((cat) => {
    const on = () => {
      if (orbit) orbit.dataset.active = cat.dataset.ring;
      cat.classList.add("is-active");
    };
    const off = () => {
      if (orbit) delete orbit.dataset.active;
      cat.classList.remove("is-active");
    };
    cat.addEventListener("mouseenter", on);
    cat.addEventListener("mouseleave", off);
    cat.addEventListener("focus", on);
    cat.addEventListener("blur", off);
  });

  // ---------- Pause off-screen animation ----------
  const archSvg = $(".arch__svg");
  const idleIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const el = entry.target;
        if (el instanceof SVGSVGElement && typeof el.pauseAnimations === "function") {
          entry.isIntersecting ? el.unpauseAnimations() : el.pauseAnimations();
        } else {
          el.classList.toggle("is-paused", !entry.isIntersecting);
        }
      });
    },
    { rootMargin: "120px 0px" }
  );
  const smilSvgs = $$("svg").filter((s) => s.querySelector("animateMotion"));
  if (prefersReduced) {
    smilSvgs.forEach((s) => s.pauseAnimations?.());
  } else {
    smilSvgs.forEach((s) => idleIO.observe(s));
    if (orbit) idleIO.observe(orbit);
  }

  // ---------- Architecture: trace a node ----------
  const ARCH = {
    client: ["Client", "Web and mobile clients reach the API over REST, GraphQL or WebSockets depending on the workflow."],
    api: ["API Layer", "FastAPI & DRF services own auth (JWT / OAuth2), role-based access and validation — serving sync reads directly and publishing async work as events."],
    ai: ["GenAI · RAG", "LangChain pipelines handle chunking, embeddings, retrieval tuning and grounded generation for summaries and Q&A."],
    vector: ["Vector DB", "ChromaDB stores document embeddings so retrieval stays semantic and fast."],
    data: ["Datastores", "Hybrid data layer — PostgreSQL for relational metadata, MongoDB for schema-less responses, with PgBouncer connection pooling."],
    kafka: ["Event Bus", "Apache Kafka decouples writes from processing, so real-time analytics never block the request path."],
    workers: ["Workers", "Celery workers run notifications, data sync and heavy computation off the request path."],
    redis: ["Redis", "Cache for hot reads and the Celery result store."],
  };
  const arch = $("#arch");
  if (arch) {
    const nodes = $$("[data-node]", arch);
    const wires = $$("[data-link]", arch);
    const tag = $("#archTag");
    const text = $("#archText");
    const info = $(".arch__info", arch);
    let current = "api";
    const select = (id) => {
      const near = new Set([id]);
      wires.forEach((w) => {
        const ends = w.dataset.link.split(" ");
        const lit = ends.includes(id);
        w.classList.toggle("is-lit", lit);
        if (lit) ends.forEach((e) => near.add(e));
      });
      nodes.forEach((n) => {
        n.classList.toggle("is-lit", n.dataset.node === id);
        n.classList.toggle("is-near", near.has(n.dataset.node));
      });
      arch.classList.add("has-focus");
      if (id !== current && ARCH[id]) {
        current = id;
        tag.textContent = ARCH[id][0];
        text.textContent = ARCH[id][1];
        info.classList.remove("is-swap");
        void info.offsetWidth;
        info.classList.add("is-swap");
      }
    };
    const clear = () => {
      arch.classList.remove("has-focus");
      nodes.forEach((n) => n.classList.remove("is-lit", "is-near"));
      wires.forEach((w) => w.classList.remove("is-lit"));
    };
    nodes.forEach((n) => {
      const id = n.dataset.node;
      n.addEventListener("pointerenter", () => select(id));
      n.addEventListener("click", () => select(id));
      n.addEventListener("focus", () => select(id));
      n.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          select(id);
        }
      });
    });
    archSvg?.addEventListener("pointerleave", (e) => e.pointerType === "mouse" && clear());
    arch.addEventListener("focusout", (e) => {
      if (!arch.contains(e.relatedTarget)) clear();
    });
  }

  // ---------- Pointer-driven flourishes (fine pointers only) ----------
  if (finePointer && !prefersReduced) {
    // hero name: letters swell and light up near the cursor
    const hero = $("#home");
    const chars = $$(".hero__name .ch");
    if (hero && chars.length) {
      const vals = new Float32Array(chars.length);
      let mx = -1e4;
      let my = -1e4;
      let running = false;
      const step = () => {
        const R = Math.max(240, window.innerWidth * 0.2);
        const rects = chars.map((c) => c.getBoundingClientRect());
        let moving = false;
        rects.forEach((r, i) => {
          const d = Math.hypot(mx - (r.left + r.width / 2), my - (r.top + r.height / 2));
          const t = Math.max(0, 1 - d / R);
          const goal = t * t * (3 - 2 * t);
          vals[i] += (goal - vals[i]) * 0.16;
          if (Math.abs(goal - vals[i]) > 0.003) moving = true;
        });
        chars.forEach((c, i) => c.style.setProperty("--p", vals[i].toFixed(3)));
        if (moving) requestAnimationFrame(step);
        else running = false;
      };
      const kick = () => {
        if (running) return;
        running = true;
        requestAnimationFrame(step);
      };
      hero.addEventListener("pointermove", (e) => {
        mx = e.clientX;
        my = e.clientY;
        kick();
      }, { passive: true });
      hero.addEventListener("pointerleave", () => {
        mx = my = -1e4;
        kick();
      });
    }

    // magnetic buttons
    $$("[data-magnetic]").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - r.left - r.width / 2;
        const my = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${(mx * 0.22).toFixed(1)}px, ${(my * 0.32).toFixed(1)}px)`;
      });
      el.addEventListener("pointerleave", () => (el.style.transform = ""));
    });

    // glow cards: one delegated listener feeds --mx/--my
    document.addEventListener(
      "pointermove",
      (e) => {
        const card = e.target instanceof Element ? e.target.closest(".glow-card") : null;
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${(e.clientX - r.left).toFixed(0)}px`);
        card.style.setProperty("--my", `${(e.clientY - r.top).toFixed(0)}px`);
      },
      { passive: true }
    );

    // custom cursor: dot tracks exactly, ring trails; labels from [data-cursor]
    const cursor = $(".cursor");
    const ring = $(".cursor__ring");
    const dot = $(".cursor__dot");
    const label = $(".cursor__label");
    if (cursor && ring && dot && label) {
      root.classList.add("has-cursor");
      let x = -100;
      let y = -100;
      let rx = -100;
      let ry = -100;
      window.addEventListener("pointermove", (e) => {
        if (e.pointerType !== "mouse") return;
        x = e.clientX;
        y = e.clientY;
        cursor.classList.add("is-visible");
        dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }, { passive: true });
      root.addEventListener("mouseleave", () => cursor.classList.remove("is-visible"));
      window.addEventListener("pointerdown", () => cursor.classList.add("is-down"));
      window.addEventListener("pointerup", () => cursor.classList.remove("is-down"));
      ticker.add((dt) => {
        if (Math.abs(x - rx) < 0.1 && Math.abs(y - ry) < 0.1) return;
        const k = 1 - Math.pow(0.0001, dt);
        rx += (x - rx) * k;
        ry += (y - ry) * k;
        ring.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
      });
      const INTERACTIVE = "a, button, input, [role='button'], .swatch, .stack-cat, .tag-list li, .cmdk__item";
      document.addEventListener("pointerover", (e) => {
        const t = e.target instanceof Element ? e.target : null;
        if (!t) return;
        const lab = t.closest("[data-cursor]");
        if (lab) {
          label.textContent = lab.dataset.cursor;
          cursor.classList.add("is-label");
          cursor.classList.remove("is-hover");
        } else {
          cursor.classList.remove("is-label");
          cursor.classList.toggle("is-hover", !!t.closest(INTERACTIVE));
        }
      });
    }
  }

  // particle field follows the pointer; any non-interactive click sends a pulse
  if (field) {
    if (finePointer) {
      window.addEventListener("pointermove", (e) => field.pointer(e.clientX, e.clientY), { passive: true });
      root.addEventListener("mouseleave", () => field.pointerOut());
    }
    document.addEventListener("pointerdown", (e) => {
      if (e.button > 0) return;
      const t = e.target;
      if (t instanceof Element && t.closest("a, button, input, label, [role='button'], .console, .cmdk, .nav__links, .orbit-wrap")) return;
      field.pulse(e.clientX, e.clientY);
    });
  }

  // ---------- Marquee: scroll-velocity driven ----------
  const marquee = (() => {
    const track = $(".marquee__track");
    if (!track || prefersReduced) return { measure() {} };
    root.classList.add("js-marquee");
    let x = 0;
    let half = 0;
    let visible = true;
    let dir = -1;
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(track);
    ticker.add((dt) => {
      if (!visible || !half) return;
      const v = scrollState.v;
      if (Math.abs(v) > 40) dir = v > 0 ? -1 : 1;
      const speed = 48 + Math.min(Math.abs(v) * 0.35, 900);
      x += dir * speed * dt;
      if (x <= -half) x += half;
      else if (x > 0) x -= half;
      const skew = clamp(-v * 0.004, -8, 8);
      track.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0) skewX(${skew.toFixed(2)}deg)`;
    });
    return { measure: () => (half = track.scrollWidth / 2) };
  })();

  // ---------- Measure everything that depends on layout ----------
  const remeasure = () => {
    scaleOrbit();
    work.measure();
    measureSections();
    journey.measure();
    marquee.measure();
    moveIndicator();
    onScroll();
  };
  let measureQueued = false;
  const queueMeasure = () => {
    if (measureQueued) return;
    measureQueued = true;
    requestAnimationFrame(() => {
      measureQueued = false;
      remeasure();
    });
  };
  window.addEventListener("resize", queueMeasure);
  window.addEventListener("load", queueMeasure);
  document.fonts?.ready.then(queueMeasure);
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(queueMeasure).observe(document.body);
  remeasure();

  // ---------- Loader → intro ----------
  const startIntro = () => {
    if (introDone) return;
    introDone = true;
    root.classList.add("is-loaded");
    field?.start();
    field?.setScene(activeId || "home");
  };

  const loader = $(".loader");
  let seen = false;
  try {
    seen = sessionStorage.getItem("ms-seen") === "1";
    sessionStorage.setItem("ms-seen", "1");
  } catch {
    /* storage blocked */
  }

  if (!loader || prefersReduced || seen) {
    loader?.classList.add("is-gone");
    startIntro();
  } else {
    const countEl = $("#loaderCount");
    const barEl = $("#loaderBar");
    const bootEl = $("#loaderBoot");
    const STEPS = ["booting services", "warming caches", "connecting kafka", "assembling the field"];
    const MIN = 1150;
    const MAX = 2600;
    const t0 = performance.now();
    let ready = document.readyState === "complete";
    window.addEventListener("load", () => (ready = true), { once: true });
    const finish = () => {
      loader.classList.add("is-done");
      setTimeout(startIntro, 260);
      setTimeout(() => loader.classList.add("is-gone"), 1200);
    };
    const tick = (now) => {
      const el = now - t0;
      let p = 1 - Math.pow(1 - Math.min(1, el / MIN), 3);
      if (!ready && el < MAX) p = Math.min(p, 0.92);
      if (countEl) countEl.textContent = String(Math.round(p * 100));
      if (barEl) barEl.style.transform = `scaleX(${p.toFixed(3)})`;
      if (bootEl) bootEl.textContent = STEPS[Math.min(STEPS.length - 1, Math.floor(p * STEPS.length))];
      if (p >= 1) finish();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ---------- Interactive console ----------
  (() => {
    const body = $("#consoleBody");
    const form = $("#consoleForm");
    const input = $("#consoleInput");
    if (!body || !form || !input) return;

    const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    const span = (cls) => (s) => `<span class="${cls}">${s}</span>`;
    const k = span("c-key");
    const v = span("c-val");
    const dim = span("c-dim");
    const ok = span("c-ok");
    const err = span("c-err");
    const dir = span("c-dir");
    const print = (html) => {
      const line = document.createElement("div");
      line.className = "l";
      line.innerHTML = html;
      body.appendChild(line);
    };
    const SECTIONS = ["home", "about", "architecture", "stack", "work", "journey", "contact"];
    const history = [];
    let hIdx = 0;

    const commands = {
      help: {
        desc: "list commands",
        run: () => [
          dim("available commands:"),
          ...Object.entries(commands)
            .filter(([, c]) => !c.hidden)
            .map(([name, c]) => `  ${k(name.padEnd(11))}${c.desc}`),
          dim("tip: ↑ ↓ history · tab completes"),
        ],
      },
      whoami: {
        desc: "who is behind this",
        run: () => [
          "Mohd Sakib — Software Engineer @ StatusNeo",
          dim("backend · event-driven systems · applied GenAI · New Delhi, IN"),
        ],
      },
      stack: {
        desc: "print stack.json",
        run: () => [
          "{",
          `  ${k('"apis"')}: ${v('"FastAPI · Django · DRF · GraphQL"')},`,
          `  ${k('"events"')}: ${v('"Kafka · Celery · RabbitMQ"')},`,
          `  ${k('"data"')}: ${v('"PostgreSQL · MongoDB · Redis · ChromaDB"')},`,
          `  ${k('"ai"')}: ${v('"LangChain · RAG"')},`,
          `  ${k('"cloud"')}: ${v('"AWS · Azure · Docker · Jenkins"')}`,
          "}",
        ],
      },
      projects: {
        desc: "featured builds",
        run: () => [
          ["RAG Q&A System", "FastAPI · LangChain · ChromaDB"],
          ["Banking-as-a-Service", "Django · GraphQL · WebSockets"],
          ["Face Recognition Attendance", "FastAPI · asyncpg · Celery"],
        ]
          .map(([name, tech], i) => `${ok(String(i + 1).padStart(2, "0"))}  ${esc(name.padEnd(29))}${dim(tech)}`)
          .concat(dim(`→ run ${k("cd work")} to see them`)),
      },
      experience: {
        desc: "career log",
        run: () => [
          `${v("2026 → now ")} Software Engineer · StatusNeo`,
          `${v("2025 → 2026")} Software Engineer · Kellton`,
          `${v("2024 → 2025")} Backend Developer · Spacepe`,
          `${v("2023 → 2024")} Associate Consultant · Oodles Technologies`,
          `${v("2022 → 2023")} Full Stack Developer · SEO Digital India`,
          `${v("2017 → 2021")} B.Tech CSE · JNTU Hyderabad`,
        ],
      },
      contact: {
        desc: "ways to reach me",
        run: () => [
          `${k("email")}    ${EMAIL}`,
          `${k("phone")}    +91 93989 80477`,
          `${k("github")}   github.com/MohdSakib535`,
          `${k("linkedin")} linkedin.com/in/mohdsakibb`,
        ],
      },
      resume: {
        desc: "download résumé",
        run: () => {
          downloadResume();
          return [ok("↓ downloading MohdSakib_Resume.pdf")];
        },
      },
      hire: {
        desc: "start a conversation",
        run: () => {
          setTimeout(() => (window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent("Let's work together")}`), 700);
          return [ok("✓ excellent choice."), "opening your mail client…"];
        },
      },
      ls: {
        desc: "list sections",
        run: () => [SECTIONS.map((s) => dir(`${s}/`)).join("  ")],
      },
      cd: {
        desc: "jump to a section",
        run: (arg) => {
          const target = arg.replace(/[/~.]/g, "").toLowerCase();
          if (!target) return [dim("usage: cd <section> — try ls")];
          if (!SECTIONS.includes(target)) return [err(`cd: no such section: ${esc(arg)}`)];
          setTimeout(() => scrollToId(`#${target}`), 250);
          return [ok(`→ /${target}`)];
        },
      },
      accent: {
        desc: "switch accent color",
        run: (arg) => {
          const hex = ACCENTS[arg.toLowerCase()];
          if (!hex) return [dim(`usage: accent ${Object.keys(ACCENTS).join(" | ")}`)];
          setAccent(hex);
          return [ok(`✓ accent set to ${arg.toLowerCase()}`)];
        },
      },
      date: {
        desc: "time in New Delhi",
        run: () => [
          new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "short" }).format(new Date()) + " IST",
        ],
      },
      echo: { desc: "print text", run: (arg) => [esc(arg)] },
      clear: {
        desc: "clear the screen",
        run: () => {
          body.innerHTML = "";
          return [];
        },
      },
      sudo: { hidden: true, run: () => [`${err("permission denied:")} nice try — but I do have root on scalable backends.`] },
      exit: { hidden: true, run: () => [dim("there is no exit. only `hire`.")] },
    };
    const ALIAS = { exp: "experience", journey: "experience", about: "whoami", email: "contact", cv: "resume", work: "projects", cls: "clear", "?": "help" };

    const run = (raw) => {
      const line = raw.trim();
      print(`<span class="c-prompt">guest@sakib:~$</span> <span class="c-cmd">${esc(line)}</span>`);
      if (line) {
        history.push(line);
        hIdx = history.length;
        const [name, ...rest] = line.split(/\s+/);
        const key = ALIAS[name.toLowerCase()] || name.toLowerCase();
        const cmd = commands[key];
        if (cmd) (cmd.run(rest.join(" ")) || []).forEach(print);
        else print(`${err(`command not found: ${esc(name)}`)} — try ${k("help")}`);
      }
      body.scrollTop = body.scrollHeight;
    };

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      run(input.value);
      input.value = "";
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!history.length) return;
        hIdx = Math.max(0, hIdx - 1);
        input.value = history[hIdx];
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        hIdx = Math.min(history.length, hIdx + 1);
        input.value = history[hIdx] || "";
      } else if (e.key === "Tab") {
        const q = input.value.trim().toLowerCase();
        if (!q) return;
        const match = Object.keys(commands).find((c) => !commands[c].hidden && c.startsWith(q));
        if (match) {
          e.preventDefault();
          input.value = `${match} `;
        }
      }
    });

    $$(".console__chips [data-cmd]").forEach((b) => b.addEventListener("click", () => run(b.dataset.cmd)));
    $("#console")?.addEventListener("click", (e) => {
      const t = e.target;
      if (t instanceof Element && t.closest("button, a, input")) return;
      if (window.getSelection()?.toString()) return;
      if (finePointer) input.focus({ preventScroll: true });
    });

    const login = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
    print(dim(`Last login: ${login} on ttys007`));
    print(`Welcome to ${k("sakib-sh")} — an interactive résumé. Type ${k("help")} or tap a command below.`);
  })();

  // ---------- Copy email / back to top / year / clock ----------
  $("#copyEmail")?.addEventListener("click", copyEmail);
  $("#backToTop")?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" }));
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const clock = $("#localClock");
  if (clock) {
    const istTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });
    const updateClock = () => {
      clock.textContent = istTime.format(new Date());
      // re-arm exactly on the next minute boundary
      setTimeout(updateClock, 60000 - (Date.now() % 60000) + 250);
    };
    updateClock();
  }

  // ---------- Command palette (⌘K) ----------
  const cmdk = $("#cmdk");
  const cmdInput = $("#cmdInput");
  const cmdList = $("#cmdList");
  if (cmdk && cmdInput && cmdList) {
    const go = (id) => () => scrollToId(id);
    const accentCmd = (name) => ({ group: "Accent", sw: ACCENTS[name], label: name[0].toUpperCase() + name.slice(1), run: () => setAccent(ACCENTS[name]) });
    const commands = [
      { group: "Navigate", icon: "house", label: "Home", hint: "01", run: go("#home") },
      { group: "Navigate", icon: "person", label: "About", hint: "02", run: go("#about") },
      { group: "Navigate", icon: "diagram-3", label: "Architecture", hint: "03", run: go("#architecture") },
      { group: "Navigate", icon: "stack", label: "Stack", hint: "04", run: go("#stack") },
      { group: "Navigate", icon: "folder", label: "Selected work", hint: "05", run: go("#work") },
      { group: "Navigate", icon: "clock-history", label: "Journey", hint: "06", run: go("#journey") },
      { group: "Navigate", icon: "envelope", label: "Contact", hint: "07", run: go("#contact") },
      { group: "Actions", icon: "terminal", label: "Open the console", hint: "sh", run: () => {
          scrollToId("#contact");
          setTimeout(() => $("#consoleInput")?.focus({ preventScroll: true }), 900);
        } },
      { group: "Actions", icon: "clipboard", label: "Copy email address", hint: "mail", run: copyEmail },
      { group: "Actions", icon: "download", label: "Download résumé", hint: "pdf", run: downloadResume },
      { group: "Actions", icon: "github", label: "Open GitHub", run: () => window.open(GITHUB, "_blank", "noopener") },
      { group: "Actions", icon: "linkedin", label: "Open LinkedIn", run: () => window.open(LINKEDIN, "_blank", "noopener") },
      ...Object.keys(ACCENTS).map(accentCmd),
    ];

    let filtered = commands.slice();
    let cursor = 0;
    let itemEls = [];

    const updateActive = () => itemEls.forEach((el, i) => el.classList.toggle("is-active", i === cursor));

    const closeCmd = () => {
      cmdk.classList.remove("is-open");
      cmdk.setAttribute("aria-hidden", "true");
    };

    const execute = (i) => {
      const cmd = filtered[i];
      if (!cmd) return;
      closeCmd();
      cmd.run();
    };

    const render = () => {
      cmdList.innerHTML = "";
      itemEls = [];
      if (!filtered.length) {
        cmdList.innerHTML = '<li class="cmdk__empty">No matches — try “work” or “accent”.</li>';
        return;
      }
      let lastGroup = "";
      filtered.forEach((cmd, i) => {
        if (cmd.group !== lastGroup) {
          lastGroup = cmd.group;
          const g = document.createElement("li");
          g.className = "cmdk__group";
          g.textContent = cmd.group;
          cmdList.appendChild(g);
        }
        const li = document.createElement("li");
        li.className = "cmdk__item" + (i === cursor ? " is-active" : "");
        const visual = cmd.sw
          ? `<span class="cmdk__sw" style="background:${cmd.sw}"></span>`
          : `<svg class="ico" aria-hidden="true"><use href="#i-${cmd.icon}"/></svg>`;
        li.innerHTML = `${visual}<span>${cmd.label}</span>${cmd.hint ? `<span class="cmdk__hint">${cmd.hint}</span>` : ""}`;
        li.addEventListener("click", () => execute(i));
        li.addEventListener("mousemove", () => {
          if (cursor === i) return;
          cursor = i;
          updateActive();
        });
        cmdList.appendChild(li);
        itemEls.push(li);
      });
    };

    const openCmd = () => {
      cmdk.classList.add("is-open");
      cmdk.setAttribute("aria-hidden", "false");
      cmdInput.value = "";
      filtered = commands.slice();
      cursor = 0;
      render();
      setTimeout(() => cmdInput.focus(), 40);
    };

    cmdInput.addEventListener("input", () => {
      const q = cmdInput.value.trim().toLowerCase();
      filtered = commands.filter((c) => c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q));
      cursor = 0;
      render();
    });

    cmdInput.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        cursor = Math.min(cursor + 1, filtered.length - 1);
        updateActive();
        itemEls[cursor]?.scrollIntoView({ block: "nearest" });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        cursor = Math.max(cursor - 1, 0);
        updateActive();
        itemEls[cursor]?.scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        e.preventDefault();
        execute(cursor);
      }
    });

    $("#cmdTrigger")?.addEventListener("click", openCmd);
    cmdk.querySelector("[data-cmd-close]")?.addEventListener("click", closeCmd);
    window.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        cmdk.classList.contains("is-open") ? closeCmd() : openCmd();
      } else if (e.key === "Escape" && cmdk.classList.contains("is-open")) {
        closeCmd();
      }
    });
  }
})();
