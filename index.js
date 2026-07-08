// ---------- Loader ----------
const loader = document.querySelector(".loader");
window.addEventListener("load", () => {
  setTimeout(() => loader && loader.classList.add("loader--hidden"), 900);
});

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- Cursor spotlight ----------
const spotlight = document.querySelector(".spotlight");
if (spotlight && !prefersReduced && window.matchMedia("(pointer: fine)").matches) {
  let tx = window.innerWidth / 2;
  let ty = window.innerHeight / 2;
  let cx = tx;
  let cy = ty;

  window.addEventListener("mousemove", (e) => {
    tx = e.clientX;
    ty = e.clientY;
    spotlight.style.opacity = "1";
  });

  const animate = () => {
    cx += (tx - cx) * 0.12;
    cy += (ty - cy) * 0.12;
    spotlight.style.left = `${cx}px`;
    spotlight.style.top = `${cy}px`;
    requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
}

// ---------- Navigation ----------
const navToggle = document.querySelector(".nav__toggle");
const navLinks = document.querySelector(".nav__links");
const navAnchors = document.querySelectorAll(".nav__links a");
const siteHeader = document.querySelector(".site-header");
const scrollProgress = document.getElementById("scrollProgress");

const closeNav = () => {
  if (!navLinks || !navToggle) return;
  navLinks.classList.remove("is-open");
  navToggle.classList.remove("is-open");
  navToggle.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
};

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("is-open");
    navToggle.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("menu-open", open);
  });
}

navAnchors.forEach((anchor) => {
  anchor.addEventListener("click", (event) => {
    const targetId = anchor.getAttribute("href");
    if (!targetId || !targetId.startsWith("#")) return;
    const target = document.querySelector(targetId);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    closeNav();
  });
});

document.addEventListener("click", (event) => {
  if (!navLinks || !navToggle || !navLinks.classList.contains("is-open")) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (navLinks.contains(target) || navToggle.contains(target)) return;
  closeNav();
});

window.addEventListener("keydown", (e) => e.key === "Escape" && closeNav());
window.addEventListener("resize", () => window.innerWidth > 820 && closeNav());

// ---------- Reveal on scroll ----------
const revealEls = document.querySelectorAll(".reveal, .hero__title .line");
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
);

revealEls.forEach((el, i) => {
  el.style.setProperty("--reveal-delay", `${(i % 5) * 0.07}s`);
  revealObserver.observe(el);
});

// ---------- Active section link ----------
const sections = document.querySelectorAll("main section[id]");
const navMap = new Map();
navAnchors.forEach((a) => {
  const id = a.getAttribute("href")?.slice(1);
  if (id) navMap.set(id, a);
});

const setActiveLink = () => {
  let active = "home";
  const offset = window.scrollY + 160;
  sections.forEach((s) => {
    if (offset >= s.offsetTop) active = s.id;
  });
  navMap.forEach((a, id) => a.classList.toggle("is-active", id === active));
};

// ---------- Header + progress ----------
const onScroll = () => {
  siteHeader?.classList.toggle("is-scrolled", window.scrollY > 12);
  if (scrollProgress) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgress.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
  }
  setActiveLink();
};

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll);
window.addEventListener("load", onScroll);
onScroll();

const finePointer = window.matchMedia("(pointer: fine)").matches;

if (!prefersReduced && finePointer) {
  // ---------- Magnetic buttons ----------
  document.querySelectorAll("[data-magnetic]").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const mx = e.clientX - r.left - r.width / 2;
      const my = e.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${mx * 0.25}px, ${my * 0.35}px)`;
    });
    el.addEventListener("mouseleave", () => {
      el.style.transform = "";
    });
  });

  // ---------- Work cards: spotlight follow + 3D tilt ----------
  document.querySelectorAll(".work-card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
      const rx = (0.5 - py) * 6;
      const ry = (px - 0.5) * 6;
      card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });

  // ---------- Liquid metaball cursor ----------
  const gooGroup = document.querySelector(".goo-cursor__group");
  const gooDot = document.querySelector(".goo-cursor__dot");
  if (gooGroup && gooDot) {
    document.body.classList.add("cursor-ready");
    const svgNS = "http://www.w3.org/2000/svg";

    const N = 6;
    const startX = window.innerWidth / 2;
    const startY = window.innerHeight / 2;
    const blobs = [];
    for (let i = 0; i < N; i++) {
      const c = document.createElementNS(svgNS, "circle");
      const baseR = 14 - i * 1.6;
      c.setAttribute("r", String(baseR));
      gooGroup.appendChild(c);
      blobs.push({ el: c, x: startX, y: startY, r: baseR, cur: baseR });
    }

    let tx = startX, ty = startY;
    let hover = 0;

    window.addEventListener("mousemove", (e) => {
      tx = e.clientX;
      ty = e.clientY;
      gooGroup.style.opacity = gooDot.style.opacity = "1";
    });

    const setHover = (v) => (e) => {
      const t = e.target;
      if (t instanceof Element && t.closest("a, button, [data-magnetic], .swatch, .work-card, input")) {
        hover = v;
      }
    };
    document.addEventListener("mouseover", setHover(1));
    document.addEventListener("mouseout", setHover(0));

    let hoverEase = 0;
    const loop = () => {
      hoverEase += (hover - hoverEase) * 0.12;
      // lead blob chases the pointer; the rest chase the one ahead -> liquid stretch
      let px = tx, py = ty;
      blobs.forEach((b, i) => {
        const ease = 0.34 - i * 0.035;
        b.x += (px - b.x) * ease;
        b.y += (py - b.y) * ease;
        const targetR = b.r * (1 + hoverEase * 0.6);
        b.cur += (targetR - b.cur) * 0.2;
        b.el.setAttribute("cx", b.x.toFixed(1));
        b.el.setAttribute("cy", b.y.toFixed(1));
        b.el.setAttribute("r", b.cur.toFixed(1));
        px = b.x;
        py = b.y;
      });
      gooDot.setAttribute("cx", blobs[0].x.toFixed(1));
      gooDot.setAttribute("cy", blobs[0].y.toFixed(1));
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

// ---------- Accent color switcher ----------
const hexToRgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

const applyAccent = (hex) => {
  const root = document.documentElement;
  root.style.setProperty("--accent", hex);
  root.style.setProperty("--accent-dim", hexToRgba(hex, 0.14));
  root.style.setProperty("--accent-glow", hexToRgba(hex, 0.5));
  document.querySelectorAll(".swatch").forEach((s) => {
    s.classList.toggle("is-active", s.getAttribute("data-accent") === hex);
  });
};

const savedAccent = localStorage.getItem("accent");
if (savedAccent) applyAccent(savedAccent);

document.querySelectorAll(".swatch").forEach((sw) => {
  sw.addEventListener("click", () => {
    const hex = sw.getAttribute("data-accent");
    if (!hex) return;
    applyAccent(hex);
    localStorage.setItem("accent", hex);
  });
});

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
        if (i < (frame / total) * final.length) {
          out += final[i];
        } else if (final[i] === " ") {
          out += " ";
        } else {
          out += CHARS[Math.floor(Math.random() * CHARS.length)];
        }
      }
      el.textContent = out;
      frame++;
      if (frame <= total) requestAnimationFrame(tick);
      else el.textContent = final;
    };
    tick();
  };

  const scrambleObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        scramble(entry.target);
        scrambleObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.6 }
  );
  document.querySelectorAll(".marker").forEach((m) => scrambleObserver.observe(m));
}

// ---------- Local clock (IST) ----------
const clock = document.getElementById("localClock");
const updateClock = () => {
  if (!clock) return;
  const now = new Date();
  const ist = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  const hh = String(ist.getHours()).padStart(2, "0");
  const mm = String(ist.getMinutes()).padStart(2, "0");
  clock.textContent = `${hh}:${mm}`;
};
updateClock();
setInterval(updateClock, 30000);

// ---------- Back to top + year ----------
document.getElementById("backToTop")?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

// ---------- Mobile bottom dock ----------
const dockLinks = document.querySelectorAll(".mobile-dock a");
const dockMap = new Map();
dockLinks.forEach((a) => {
  const id = a.getAttribute("href")?.slice(1);
  if (id) dockMap.set(id, a);
  a.addEventListener("click", (e) => {
    const href = a.getAttribute("href");
    if (!href || !href.startsWith("#")) return;
    const t = document.querySelector(href);
    if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

const setDockActive = () => {
  if (!dockMap.size) return;
  let active = "home";
  const offset = window.scrollY + 160;
  sections.forEach((s) => {
    if (offset >= s.offsetTop) active = s.id;
  });
  dockMap.forEach((a, id) => a.classList.toggle("is-active", id === active));
};
window.addEventListener("scroll", setDockActive, { passive: true });
setDockActive();

// ---------- Command palette (⌘K) ----------
const cmdk = document.getElementById("cmdk");
const cmdInput = document.getElementById("cmdInput");
const cmdList = document.getElementById("cmdList");
const cmdTrigger = document.getElementById("cmdTrigger");

if (cmdk && cmdInput && cmdList) {
  const go = (id) => () => {
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toast = (msg) => {
    const el = document.createElement("div");
    el.textContent = msg;
    el.style.cssText =
      "position:fixed;left:50%;bottom:32px;transform:translateX(-50%);z-index:600;" +
      "background:var(--accent);color:#0a0a0b;font:600 0.85rem Inter,sans-serif;" +
      "padding:0.7rem 1.2rem;border-radius:999px;box-shadow:0 12px 30px rgba(0,0,0,.4)";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  };

  const commands = [
    { group: "Navigate", icon: "bi-house", label: "Home", hint: "01", run: go("#home") },
    { group: "Navigate", icon: "bi-person", label: "About", hint: "02", run: go("#about") },
    { group: "Navigate", icon: "bi-diagram-3", label: "Architecture", hint: "03", run: go("#architecture") },
    { group: "Navigate", icon: "bi-stack", label: "Stack", hint: "04", run: go("#stack") },
    { group: "Navigate", icon: "bi-folder", label: "Selected work", hint: "05", run: go("#work") },
    { group: "Navigate", icon: "bi-clock-history", label: "Journey", hint: "06", run: go("#journey") },
    { group: "Navigate", icon: "bi-envelope", label: "Contact", hint: "07", run: go("#contact") },
    { group: "Actions", icon: "bi-clipboard", label: "Copy email address", hint: "mail", run: () => {
        navigator.clipboard?.writeText("mohdsakib9398@gmail.com");
        toast("Email copied ✓");
      } },
    { group: "Actions", icon: "bi-download", label: "Download résumé", hint: "pdf", run: () => {
        const a = document.createElement("a");
        a.href = "MohdSakib_Resume.pdf";
        a.download = "";
        a.click();
      } },
    { group: "Actions", icon: "bi-github", label: "Open GitHub", run: () => window.open("https://github.com/MohdSakib535", "_blank") },
    { group: "Actions", icon: "bi-linkedin", label: "Open LinkedIn", run: () => window.open("https://www.linkedin.com/in/mohdsakibb/", "_blank") },
    { group: "Accent", sw: "#cdfb45", label: "Lime", run: () => { applyAccent("#cdfb45"); localStorage.setItem("accent", "#cdfb45"); } },
    { group: "Accent", sw: "#ff9f5a", label: "Amber", run: () => { applyAccent("#ff9f5a"); localStorage.setItem("accent", "#ff9f5a"); } },
    { group: "Accent", sw: "#4fd7ff", label: "Cyan", run: () => { applyAccent("#4fd7ff"); localStorage.setItem("accent", "#4fd7ff"); } },
    { group: "Accent", sw: "#c4a2ff", label: "Violet", run: () => { applyAccent("#c4a2ff"); localStorage.setItem("accent", "#c4a2ff"); } },
  ];

  let filtered = commands.slice();
  let cursor = 0;

  const render = () => {
    cmdList.innerHTML = "";
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
        : `<i class="bi ${cmd.icon}"></i>`;
      li.innerHTML = `${visual}<span>${cmd.label}</span>${cmd.hint ? `<span class="cmdk__hint">${cmd.hint}</span>` : ""}`;
      li.addEventListener("click", () => execute(i));
      li.addEventListener("mousemove", () => {
        cursor = i;
        updateActive();
      });
      cmdList.appendChild(li);
    });
  };

  const updateActive = () => {
    cmdList.querySelectorAll(".cmdk__item").forEach((el, i) => {
      el.classList.toggle("is-active", i === cursor);
    });
  };

  const execute = (i) => {
    const cmd = filtered[i];
    if (!cmd) return;
    closeCmd();
    cmd.run();
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

  const closeCmd = () => {
    cmdk.classList.remove("is-open");
    cmdk.setAttribute("aria-hidden", "true");
  };

  cmdInput.addEventListener("input", () => {
    const q = cmdInput.value.trim().toLowerCase();
    filtered = commands.filter(
      (c) => c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q)
    );
    cursor = 0;
    render();
  });

  cmdInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      cursor = Math.min(cursor + 1, filtered.length - 1);
      updateActive();
      cmdList.querySelectorAll(".cmdk__item")[cursor]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      cursor = Math.max(cursor - 1, 0);
      updateActive();
      cmdList.querySelectorAll(".cmdk__item")[cursor]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      execute(cursor);
    }
  });

  cmdTrigger?.addEventListener("click", openCmd);
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
