
// Loader
window.addEventListener("load", () => {
    const loader = document.querySelector(".loader");
    loader.style.display = "none";
});

// Smooth Scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
    e.preventDefault();
    document.querySelector(this.getAttribute('href')).scrollIntoView({
        behavior: 'smooth'
    });
    });
});

// Mobile Navbar Toggle
const navbarToggle = document.querySelector(".navbar__toggle");
const navbarLinks = document.querySelector(".navbar__links");

navbarToggle.addEventListener("click", () => {
    navbarLinks.classList.toggle("active");
});

// Modal Functionality
const modal = document.getElementById("emailModal");
const contactBtn = document.getElementById("contactBtn");
const closeBtn = document.querySelector(".modal__close");

contactBtn.addEventListener("click", () => {
    modal.classList.add("show");
});

closeBtn.addEventListener("click", () => {
    modal.classList.remove("show");
});

window.addEventListener("click", (event) => {
    if (event.target === modal) {
    modal.classList.remove("show");
    }
});

// Accordion Functionality for Experience Section
const viewMoreEls = document.querySelectorAll(".view-more");
viewMoreEls.forEach((btn) => {
    btn.addEventListener("click", () => {
    const accordionContent = btn.closest(".timeline-content").querySelector(".accordion-content");
    accordionContent.classList.toggle("open");
    btn.textContent = accordionContent.classList.contains("open") ? "View Less" : "View More";
    });
});

// Back to Top Button
const backToTop = document.getElementById("backToTop");

window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
    backToTop.classList.add("visible");
    } else {
    backToTop.classList.remove("visible");
    }
});

backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
});

// Reveal Animation
document.addEventListener("DOMContentLoaded", () => {
    const reveals = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
        if(entry.isIntersecting) {
        entry.target.classList.add("active");
        obs.unobserve(entry.target);
        }
    });
    }, { threshold: 0.1 });
    reveals.forEach(el => observer.observe(el));
});
