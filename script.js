import { setLanguage, showMessage, loadSavedLanguage } from "./lang/setLanguage.js";

console.log("script.js loaded");

// Make functions available to HTML onclick/onchange
window.setLanguage = setLanguage;
window.showMessage = showMessage;

window.addEventListener("DOMContentLoaded", () => {
  loadSavedLanguage();
});