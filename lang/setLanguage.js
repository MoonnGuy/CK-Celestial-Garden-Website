import { en } from "./en.js";
import { vi } from "./vi.js";

const translations = {
  en,
  vi
};

export function setLanguage(language) {
  console.log("Language clicked:", language);

  localStorage.setItem("selectedLanguage", language);

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");

    if (translations[language] && translations[language][key]) {
      element.textContent = translations[language][key];
    }
  });

  document.querySelectorAll("[data-placeholder]").forEach((element) => {
    const key = element.getAttribute("data-placeholder");

    if (translations[language] && translations[language][key]) {
      element.placeholder = translations[language][key];
    }
  });

  const languageSelect = document.getElementById("languageSelect");
  if (languageSelect) {
    languageSelect.value = language;
  }

  const languageModal = document.getElementById("languageModal");
  if (languageModal) {
    languageModal.style.display = "none";
  }
}

export function showMessage() {
  const language = localStorage.getItem("selectedLanguage") || "en";
  alert(translations[language].alertMessage);
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