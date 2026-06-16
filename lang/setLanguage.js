import { en } from "./en.js";
import { vi } from "./vi.js";

const translations = {
  en,
  vi
};

export function getCurrentLanguage() {
  return localStorage.getItem("selectedLanguage") || "en";
}

export function translate(key) {
  const language = getCurrentLanguage();
  return translations[language]?.[key] || translations.en[key] || key;
}

export function setLanguage(language) {
  const selectedLanguage = translations[language] ? language : "en";

  localStorage.setItem("selectedLanguage", selectedLanguage);
  document.documentElement.lang = selectedLanguage;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");

    if (translations[selectedLanguage] && translations[selectedLanguage][key]) {
      element.textContent = translations[selectedLanguage][key];
    }
  });

  document.querySelectorAll("[data-placeholder]").forEach((element) => {
    const key = element.getAttribute("data-placeholder");

    if (translations[selectedLanguage] && translations[selectedLanguage][key]) {
      element.placeholder = translations[selectedLanguage][key];
    }
  });

  const languageSelect = document.getElementById("languageSelect");
  if (languageSelect) {
    languageSelect.value = selectedLanguage;
  }

  const languageModal = document.getElementById("languageModal");
  if (languageModal) {
    languageModal.style.display = "none";
  }

  window.dispatchEvent(
    new CustomEvent("languageChanged", {
      detail: { language: selectedLanguage }
    })
  );
}

export function showMessage() {
  alert(translate("alertMessage"));
}

export function loadSavedLanguage() {
  const savedLanguage = localStorage.getItem("selectedLanguage");

  if (savedLanguage) {
    setLanguage(savedLanguage);
  } else {
    const languageModal = document.getElementById("languageModal");

    if (languageModal) {
      languageModal.style.display = "flex";
    }
  }
}