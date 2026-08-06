document.addEventListener("DOMContentLoaded", () => {
    const menuToggle = document.getElementById("menuToggle");
    const navLinks = document.getElementById("navLinks");
    const navbar = menuToggle?.closest(".navbar");
    const mobileQuery = window.matchMedia("(max-width: 768px)");
  
    if (!menuToggle || !navLinks || !navbar) {
      return;
    }
  
    function setMenuState(isOpen) {
      const shouldOpen = mobileQuery.matches && isOpen;
  
      navbar.classList.toggle("mobile-menu-open", shouldOpen);
      navLinks.classList.toggle("open", shouldOpen);
      menuToggle.classList.toggle("active", shouldOpen);
  
      menuToggle.setAttribute("aria-expanded", String(shouldOpen));
  
      menuToggle.setAttribute(
        "aria-label",
        shouldOpen ? "Close navigation menu" : "Open navigation menu"
      );
    }
  
    menuToggle.addEventListener("click", () => {
      const isOpen = !navbar.classList.contains("mobile-menu-open");
      setMenuState(isOpen);
    });
  
    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        setMenuState(false);
      });
    });
  
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setMenuState(false);
      }
    });
  
    mobileQuery.addEventListener?.("change", () => {
      setMenuState(false);
    });
  });