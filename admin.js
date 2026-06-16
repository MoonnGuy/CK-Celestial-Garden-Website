import { translate, getCurrentLanguage } from "./setLanguage.js";

const adminToken = new URLSearchParams(window.location.search).get("token") || "";
const refreshButton = document.getElementById("refreshAdmin");
const statusMessage = document.getElementById("adminStatus");
const summaryGrid = document.getElementById("summaryGrid");
const bookingsTable = document.getElementById("bookingsTable");


function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(isoDate) {
  if (!isoDate) return "-";
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const language = getCurrentLanguage() === "vi" ? "vi-VN" : "en-US";

  return new Intl.DateTimeFormat(language, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function formatTime(time) {
  if (!time) return "-";
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date(Date.UTC(2026, 0, 1, hours, minutes));
  const language = getCurrentLanguage() === "vi" ? "vi-VN" : "en-US";

  return new Intl.DateTimeFormat(language, {
    hour: "numeric",
    minute: "2-digit",
    hour12: getCurrentLanguage() !== "vi",
    timeZone: "UTC"
  }).format(date);
}

function formatCreated(isoDateTime) {
  if (!isoDateTime) return "-";
  const language = getCurrentLanguage() === "vi" ? "vi-VN" : "en-US";
  return new Intl.DateTimeFormat(language, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(isoDateTime));
}

function setStatus(message, type = "info") {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
}

function apiUrl(path) {
  const url = new URL(path, window.location.origin);
  if (adminToken) {
    url.searchParams.set("token", adminToken);
  }
  return url.toString();
}

function renderSummary(summary) {
  summaryGrid.innerHTML = "";

  if (!summary.length) {
    const empty = document.createElement("p");
    empty.textContent = translate("noBookings");
    summaryGrid.appendChild(empty);
    return;
  }

  summary.forEach((slot) => {
    const card = document.createElement("div");
    card.className = "summary-card";
    card.innerHTML = `
      <strong>${formatDate(slot.date)} ${formatTime(slot.time)}</strong>
      <span>${slot.count}/${slot.capacity} families</span>
      <small>${slot.remaining} remaining</small>
    `;
    summaryGrid.appendChild(card);
  });
}

function renderBookings(bookings) {
  bookingsTable.innerHTML = "";

  if (!bookings.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="8">${translate("noBookings")}</td>`;
    bookingsTable.appendChild(row);
    return;
  }

  bookings.forEach((booking) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatDate(booking.date)}</td>
      <td>${formatTime(booking.time)}</td>
      <td>${escapeHtml(booking.name)}</td>
      <td>${escapeHtml(booking.phone)}</td>
      <td>${escapeHtml(booking.email || "-")}</td>
      <td>${escapeHtml(booking.status)}</td>
      <td>${formatCreated(booking.createdAt)}</td>
      <td><button class="small-button" data-booking-id="${escapeHtml(booking.id)}" ${booking.status === "cancelled" ? "disabled" : ""}>Cancel</button></td>
    `;
    bookingsTable.appendChild(row);
  });
}

async function loadAdminData() {
  try {
    const response = await fetch(apiUrl("/api/tours/admin"));
    if (!response.ok) throw new Error("Admin request failed");
    const data = await response.json();
    renderSummary(data.summary);
    renderBookings(data.bookings);
    setStatus(`Loaded ${data.bookings.length} booking(s).`, "success");
  } catch (error) {
    setStatus(translate("networkError"), "error");
  }
}

async function cancelBooking(id) {
  try {
    const response = await fetch(apiUrl(`/api/tours/${encodeURIComponent(id)}`), {
      method: "DELETE"
    });

    if (!response.ok) throw new Error("Cancel request failed");
    await loadAdminData();
  } catch (error) {
    setStatus("Could not cancel this booking.", "error");
  }
}

refreshButton.addEventListener("click", loadAdminData);
bookingsTable.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-booking-id]");
  if (!button) return;
  cancelBooking(button.dataset.bookingId);
});

window.addEventListener("languageChanged", loadAdminData);
loadAdminData();
