const loader = document.querySelector(".loader");
window.addEventListener("load", () => {
  if (!loader) return;
  loader.classList.add("loader--hidden");
});

const navToggle = document.querySelector(".nav__toggle");
const navLinks = document.querySelector(".nav__links");
const navAnchors = document.querySelectorAll(".nav__links a");
const siteHeader = document.querySelector(".site-header");
const scrollProgress = document.getElementById("scrollProgress");

const closeNavMenu = () => {
  if (!navLinks || !navToggle) return;
  navLinks.classList.remove("is-open");
  navToggle.setAttribute("aria-expanded", "false");
  navToggle.innerHTML = '<i class="bi bi-list"></i>';
  document.body.classList.remove("menu-open");
};

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("menu-open", open);
    navToggle.innerHTML = open
      ? '<i class="bi bi-x-lg"></i>'
      : '<i class="bi bi-list"></i>';
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

    closeNavMenu();
  });
});

document.addEventListener("click", (event) => {
  if (!navLinks || !navToggle || !navLinks.classList.contains("is-open")) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (navLinks.contains(target) || navToggle.contains(target)) return;
  closeNavMenu();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeNavMenu();
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 820) closeNavMenu();
});

const revealElements = document.querySelectorAll(".reveal");
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.14 }
);

revealElements.forEach((element, index) => {
  element.style.setProperty("--reveal-delay", `${(index % 6) * 0.06}s`);
  revealObserver.observe(element);
});

const sections = document.querySelectorAll("main section[id]");
const navMap = new Map();
navAnchors.forEach((anchor) => {
  const id = anchor.getAttribute("href")?.slice(1);
  if (id) navMap.set(id, anchor);
});

const setActiveSectionLink = () => {
  let activeSection = "home";
  const offset = window.scrollY + 140;

  sections.forEach((section) => {
    if (offset >= section.offsetTop) activeSection = section.id;
  });

  navMap.forEach((anchor, id) => {
    anchor.classList.toggle("is-active", id === activeSection);
  });
};

window.addEventListener("scroll", setActiveSectionLink);
window.addEventListener("load", setActiveSectionLink);

const updateHeaderState = () => {
  siteHeader?.classList.toggle("is-scrolled", window.scrollY > 16);
};

const updateScrollProgress = () => {
  if (!scrollProgress) return;
  const maxScroll =
    document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
  scrollProgress.style.transform = `scaleX(${progress})`;
};

window.addEventListener("scroll", updateHeaderState);
window.addEventListener("scroll", updateScrollProgress);
window.addEventListener("resize", updateScrollProgress);
updateHeaderState();
updateScrollProgress();

const experienceToggles = document.querySelectorAll(".exp-toggle");
experienceToggles.forEach((button) => {
  button.addEventListener("click", () => {
    const details = button
      .closest(".experience-item")
      ?.querySelector(".exp-details");

    if (!details) return;

    const open = details.classList.toggle("is-open");
    button.textContent = open ? "View less" : "View details";
    button.setAttribute("aria-expanded", String(open));
  });
});

const backToTop = document.getElementById("backToTop");
const toggleBackToTop = () => {
  if (!backToTop) return;
  backToTop.classList.toggle("is-visible", window.scrollY > 420);
};

window.addEventListener("scroll", toggleBackToTop);
toggleBackToTop();

backToTop?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

const yearElement = document.getElementById("year");
if (yearElement) {
  yearElement.textContent = String(new Date().getFullYear());
}
