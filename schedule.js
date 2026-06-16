document.addEventListener("DOMContentLoaded", () => {
  const tourDate       = document.getElementById("tourDate");
  const tourTime       = document.getElementById("tourTime");
  const visitorFields  = document.getElementById("visitorFields");
  const statusMessage  = document.getElementById("scheduleStatus");
  const earliestDateInfo = document.getElementById("earliestDateInfo");
  const tourForm       = document.getElementById("tourForm");
  const clientName     = document.getElementById("clientName");
  const clientPhone    = document.getElementById("clientPhone");
  const clientEmail    = document.getElementById("clientEmail");
  const successToast   = document.getElementById("successToast");
  const closeToast     = document.getElementById("closeToast");
  const submitBtn      = tourForm.querySelector('button[type="submit"]');

  // "16:30" removed — server's lastStartTime is 16:00 and rejects it (bug fix)
  const timeSlots = [
    "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00",
    "14:30", "15:00", "15:30", "16:00"
  ];

  function getPdtDatePlus7Days() {
    const now    = new Date();
    const pdtNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
    pdtNow.setDate(pdtNow.getDate() + 7);
    const year  = pdtNow.getFullYear();
    const month = String(pdtNow.getMonth() + 1).padStart(2, "0");
    const day   = String(pdtNow.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatTime(time) {
    const [hour, minute] = time.split(":").map(Number);
    const date = new Date();
    date.setHours(hour, minute);
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  function fillTimeOptions() {
    tourTime.innerHTML = `<option value="">Select a tour time</option>`;
    timeSlots.forEach((time) => {
      const option       = document.createElement("option");
      option.value       = time;
      option.textContent = formatTime(time);
      tourTime.appendChild(option);
    });
    tourTime.disabled = false;
  }

  const earliestDate = getPdtDatePlus7Days();
  tourDate.min = earliestDate;
  earliestDateInfo.textContent = earliestDate;

  tourDate.addEventListener("change", () => {
    if (!tourDate.value) return;

    if (tourDate.value < earliestDate) {
      tourTime.innerHTML    = `<option value="">Select a date first</option>`;
      tourTime.disabled     = true;
      visitorFields.hidden  = true;
      statusMessage.textContent = `Please choose a date on or after ${earliestDate}.`;
      statusMessage.className   = "status-message warning";
      return;
    }

    fillTimeOptions();
    statusMessage.textContent = "Please select a tour time.";
    statusMessage.className   = "status-message";
  });

  tourTime.addEventListener("change", () => {
    visitorFields.hidden = !tourTime.value;
  });

  // ── Toast logic ──────────────────────────────────────────────────────────
  let toastTimer = null;

  function showSuccessToast() {
    // Force the slide-in animation to replay even if shown before
    successToast.hidden = true;
    void successToast.offsetWidth; // browser reflow
    successToast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { successToast.hidden = true; }, 8000);
  }

  closeToast.addEventListener("click", () => {
    clearTimeout(toastTimer);
    successToast.hidden = true;
  });

  // ── Form submission ───────────────────────────────────────────────────────
  tourForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const bookingData = {
      date:  tourDate.value,
      time:  tourTime.value,
      name:  clientName.value.trim(),
      phone: clientPhone.value.trim(),
      email: clientEmail.value.trim()
    };

    if (!bookingData.date || !bookingData.time || !bookingData.name || !bookingData.phone) {
      statusMessage.textContent = "Please enter the tour date, tour time, name, and phone number.";
      statusMessage.className   = "status-message warning";
      return;
    }

    // Loading state — prevents double-submit and shows progress
    const originalText    = submitBtn.textContent;
    submitBtn.disabled    = true;
    submitBtn.textContent = "Sending…";

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData)
      });

      const result = await response.json();

      if (!response.ok) {
        statusMessage.textContent = result.error || "Something went wrong. Please try again.";
        statusMessage.className   = "status-message error";
        return;
      }

      // ✓ Success
      showSuccessToast();

      tourForm.reset();
      visitorFields.hidden  = true;
      tourTime.innerHTML    = `<option value="">Select a date first</option>`;
      tourTime.disabled     = true;
      statusMessage.textContent = "";
      statusMessage.className   = "status-message";

    } catch (err) {
      // Network error (server not running, no internet, etc.)
      statusMessage.textContent = "Unable to reach the server. Please check your connection and try again.";
      statusMessage.className   = "status-message error";
    } finally {
      // Always restore button — even if an error occurred
      submitBtn.disabled    = false;
      submitBtn.textContent = originalText;
    }
  });
});