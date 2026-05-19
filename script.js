const searchToggle = document.querySelector(".search-toggle");
const searchPanel = document.querySelector(".search-panel");
const menuToggle = document.querySelector(".menu-toggle");
const mobileNav = document.querySelector(".mobile-nav");
const modeToggle = document.querySelector(".mode-toggle");

searchToggle.addEventListener("click", () => {
  const isOpen = searchPanel.classList.toggle("open");
  searchToggle.setAttribute("aria-expanded", String(isOpen));
  searchPanel.setAttribute("aria-hidden", String(!isOpen));

  if (isOpen) {
    document.querySelector("#site-search").focus();
  }
});

menuToggle.addEventListener("click", () => {
  const isOpen = mobileNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

modeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark");
  modeToggle.textContent = isDark ? "Dark" : "Light";
  modeToggle.setAttribute("aria-pressed", String(isDark));
});

document.querySelector(".search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const query = document.querySelector("#site-search").value.trim();

  if (query) {
    searchToggle.textContent = `Search: ${query}`;
  }
});

document.querySelectorAll(".page-form, .newsletter-box form").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const button = form.querySelector("button");

    if (button) {
      button.textContent = "Received";
    }
  });
});
