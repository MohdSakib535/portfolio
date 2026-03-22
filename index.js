const loader = document.querySelector(".loader");
window.addEventListener("load", () => {
  if (!loader) return;
  loader.classList.add("loader--hidden");
});

const navToggle = document.querySelector(".nav__toggle");
const navLinks = document.querySelector(".nav__links");
const navAnchors = document.querySelectorAll(".nav__links a");

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(open));
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

    if (navLinks?.classList.contains("is-open")) {
      navLinks.classList.remove("is-open");
      navToggle?.setAttribute("aria-expanded", "false");
    }
  });
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

revealElements.forEach((element) => revealObserver.observe(element));

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
