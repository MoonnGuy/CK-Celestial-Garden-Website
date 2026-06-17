const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

loadEnvFile();

const PORT = Number(process.env.PORT || 3000);
// Files are in the repo root (no public/ subfolder)
const PUBLIC_DIR = __dirname;
const DATA_DIR = path.join(__dirname, 'data');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');

const CONFIG = {
  timeZone: 'America/Los_Angeles',
  timeZoneLabel: 'GMT-07:00 America/Los_Angeles (PDT)',
  minDaysFromToday: 7,
  durationMinutes: 60,
  slotStepMinutes: 30,
  firstStartTime: '09:00',
  lastStartTime: '16:00',
  maxFamiliesAtSameTime: 2,
  siteName: process.env.SITE_NAME || 'Westmont of Morgan Hill',
  staffEmail: process.env.STAFF_EMAIL || 'ck.celestialarden@gmail.com',
  adminToken: process.env.ADMIN_TOKEN || 'change-me'
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

let bookingQueue = Promise.resolve();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
      return;
    }

    await serveStatic(req, res, url);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) console.error(error);
    sendJson(res, statusCode, { error: error.message || 'Server error. Please try again.' });
  }
});

server.listen(PORT, async () => {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  try {
    await fsp.access(BOOKINGS_FILE);
  } catch {
    await fsp.writeFile(BOOKINGS_FILE, '[]\n', 'utf8');
  }
  console.log(`Tour scheduler running on http://localhost:${PORT}`);
});

async function handleApi(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/config') {
    sendJson(res, 200, getPublicConfig());
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/availability') {
    const date = url.searchParams.get('date');
    if (!isValidSelectableDate(date)) {
      sendJson(res, 400, { error: `Please choose a date on or after ${getMinSelectableDate()}.` });
      return;
    }

    const bookings = await readBookings();
    const slots = getSlots().map((time) => {
      const count = overlappingBookingCount(bookings, date, time);
      return {
        time,
        label: formatTime(time),
        remaining: Math.max(CONFIG.maxFamiliesAtSameTime - count, 0),
        available: count < CONFIG.maxFamiliesAtSameTime
      };
    });

    sendJson(res, 200, { date, slots, capacity: CONFIG.maxFamiliesAtSameTime });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/bookings') {
    const body = await readJsonBody(req);

    const savedBooking = await runExclusive(async () => {
      const bookings = await readBookings();
      const clean = validateBookingRequest(body);
      const count = overlappingBookingCount(bookings, clean.date, clean.time);

      if (count >= CONFIG.maxFamiliesAtSameTime) {
        const error = new Error('This time is already full. Please choose another time.');
        error.statusCode = 409;
        throw error;
      }

      const booking = {
        id: crypto.randomUUID(),
        name: clean.name,
        phone: clean.phone,
        email: clean.email,
        date: clean.date,
        time: clean.time,
        endTime: minutesToTime(timeToMinutes(clean.time) + CONFIG.durationMinutes),
        durationMinutes: CONFIG.durationMinutes,
        timeZone: CONFIG.timeZone,
        timeZoneLabel: CONFIG.timeZoneLabel,
        status: 'pending_staff_confirmation',
        createdAt: new Date().toISOString()
      };

      bookings.push(booking);
      await writeBookings(bookings);
      return booking;
    });

    const staffNotification = await sendStaffNotification(savedBooking);
    sendJson(res, 201, {
      message: 'Tour request received.',
      booking: publicBooking(savedBooking),
      staffNotification
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/bookings') {
    if (!isAdminAuthorized(req, url)) {
      sendJson(res, 401, { error: 'Unauthorized.' });
      return;
    }

    const bookings = (await readBookings()).sort(sortBookings);
    sendJson(res, 200, { bookings, capacity: CONFIG.maxFamiliesAtSameTime });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/export.csv') {
    if (!isAdminAuthorized(req, url)) {
      sendText(res, 401, 'Unauthorized.');
      return;
    }

    const bookings = (await readBookings()).sort(sortBookings);
    sendText(res, 200, bookingsToCsv(bookings), 'text/csv; charset=utf-8', {
      'Content-Disposition': 'attachment; filename="tour-bookings.csv"'
    });
    return;
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/api/admin/bookings/')) {
    if (!isAdminAuthorized(req, url)) {
      sendJson(res, 401, { error: 'Unauthorized.' });
      return;
    }

    const id = decodeURIComponent(url.pathname.split('/').pop());
    const updated = await runExclusive(async () => {
      const bookings = await readBookings();
      const booking = bookings.find((item) => item.id === id);
      if (!booking) {
        const error = new Error('Booking not found.');
        error.statusCode = 404;
        throw error;
      }
      booking.status = 'cancelled';
      booking.cancelledAt = new Date().toISOString();
      await writeBookings(bookings);
      return booking;
    });

    sendJson(res, 200, { message: 'Booking cancelled.', booking: updated });
    return;
  }

  sendJson(res, 404, { error: 'API route not found.' });
}

async function serveStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendText(res, 405, 'Method not allowed');
    return;
  }

  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';

  const filePath = safeJoin(PUBLIC_DIR, pathname);
  if (!filePath) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  // Block server internals from being downloaded
  const basename = path.basename(filePath);
  const BLOCKED = new Set(['server.js', 'package.json', 'package-lock.json', '.env']);
  if (BLOCKED.has(basename) || basename.startsWith('.')) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  try {
    const stat = await fsp.stat(filePath);
    if (!stat.isFile()) {
      sendText(res, 404, 'Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(filePath).pipe(res);
  } catch {
    sendText(res, 404, 'Not found');
  }
}

function getPublicConfig() {
  return {
    timeZone: CONFIG.timeZone,
    timeZoneLabel: CONFIG.timeZoneLabel,
    minSelectableDate: getMinSelectableDate(),
    minDaysFromToday: CONFIG.minDaysFromToday,
    durationMinutes: CONFIG.durationMinutes,
    slotStepMinutes: CONFIG.slotStepMinutes,
    firstStartTime: CONFIG.firstStartTime,
    lastStartTime: CONFIG.lastStartTime,
    maxFamiliesAtSameTime: CONFIG.maxFamiliesAtSameTime,
    slots: getSlots().map((time) => ({ time, label: formatTime(time) })),
    siteName: CONFIG.siteName
  };
}

function validateBookingRequest(body) {
  const date = String(body.date || '').trim();
  const time = String(body.time || '').trim();
  const name = String(body.name || '').trim().replace(/\s+/g, ' ');
  const phone = String(body.phone || '').trim();
  const email = String(body.email || '').trim().toLowerCase();

  if (!isValidSelectableDate(date)) {
    const error = new Error(`Please choose a date on or after ${getMinSelectableDate()}.`);
    error.statusCode = 400;
    throw error;
  }

  if (!getSlots().includes(time)) {
    const error = new Error('Please choose an available tour time.');
    error.statusCode = 400;
    throw error;
  }

  if (name.length < 2) {
    const error = new Error('Please enter the client name.');
    error.statusCode = 400;
    throw error;
  }

  if (phone.replace(/\D/g, '').length < 7) {
    const error = new Error('Please enter a valid phone number.');
    error.statusCode = 400;
    throw error;
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const error = new Error('Please enter a valid email address or leave email blank.');
    error.statusCode = 400;
    throw error;
  }

  return { date, time, name, phone, email };
}

function isValidSelectableDate(date) {
  return isIsoDate(date) && date >= getMinSelectableDate();
}

function isIsoDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function getTodayInTourTimeZone() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CONFIG.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getMinSelectableDate() {
  return addDays(getTodayInTourTimeZone(), CONFIG.minDaysFromToday);
}

function addDays(date, days) {
  const [year, month, day] = date.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  return utcDate.toISOString().slice(0, 10);
}

function getSlots() {
  const slots = [];
  const start = timeToMinutes(CONFIG.firstStartTime);
  const end = timeToMinutes(CONFIG.lastStartTime);
  for (let minutes = start; minutes <= end; minutes += CONFIG.slotStepMinutes) {
    slots.push(minutesToTime(minutes));
  }
  return slots;
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function formatTime(time) {
  const [hourString, minuteString] = time.split(':');
  let hour = Number(hourString);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${String(hour).padStart(2, '0')}:${minuteString} ${suffix}`;
}

function formatDate(date) {
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function overlappingBookingCount(bookings, date, time) {
  const start = timeToMinutes(time);
  const end = start + CONFIG.durationMinutes;

  return bookings.filter((booking) => {
    if (booking.status === 'cancelled') return false;
    if (booking.date !== date) return false;
    const bookingStart = timeToMinutes(booking.time);
    const bookingEnd = booking.endTime ? timeToMinutes(booking.endTime) : bookingStart + CONFIG.durationMinutes;
    return bookingStart < end && bookingEnd > start;
  }).length;
}

function sortBookings(a, b) {
  return `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`) || a.createdAt.localeCompare(b.createdAt);
}

function publicBooking(booking) {
  return {
    id: booking.id,
    date: booking.date,
    dateLabel: formatDate(booking.date),
    time: booking.time,
    timeLabel: formatTime(booking.time),
    endTime: booking.endTime,
    endTimeLabel: formatTime(booking.endTime),
    durationMinutes: booking.durationMinutes,
    timeZoneLabel: booking.timeZoneLabel,
    name: booking.name,
    phone: booking.phone,
    email: booking.email,
    status: booking.status
  };
}

async function readBookings() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  try {
    const text = await fsp.readFile(BOOKINGS_FILE, 'utf8');
    const bookings = JSON.parse(text || '[]');
    return Array.isArray(bookings) ? bookings : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeBookings(bookings) {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.writeFile(BOOKINGS_FILE, `${JSON.stringify(bookings, null, 2)}\n`, 'utf8');
}

function runExclusive(task) {
  const run = bookingQueue.then(task, task);
  bookingQueue = run.catch(() => {});
  return run;
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(Object.assign(new Error('Request body too large.'), { statusCode: 413 }));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(Object.assign(new Error('Invalid JSON.'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  }).catch((error) => {
    error.statusCode = error.statusCode || 400;
    throw error;
  });
}

function isAdminAuthorized(req, url) {
  const provided = url.searchParams.get('token') || req.headers['x-admin-token'];
  return Boolean(provided) && provided === CONFIG.adminToken;
}

function bookingsToCsv(bookings) {
  const headers = ['id', 'status', 'date', 'time', 'endTime', 'durationMinutes', 'timeZoneLabel', 'name', 'phone', 'email', 'createdAt'];
  const rows = bookings.map((booking) => headers.map((header) => csvEscape(booking[header] ?? '')).join(','));
  return `${headers.join(',')}\n${rows.join('\n')}\n`;
}

function csvEscape(value) {
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

async function sendStaffNotification(booking) {
  const message = buildStaffNotificationMessage(booking);

  try {
    return await sendStaffEmailNotification(booking, message);
  } catch (error) {
    console.error('Staff email notification failed:', error.message);
    return { sent: false, reason: error.message, to: CONFIG.staffEmail };
  }
}

function buildStaffNotificationMessage(booking) {
  const clientEmail = booking.email || 'Not provided';
  return [
    'A new tour request was submitted on the website.',
    '',
    'Tour details:',
    `Date: ${formatDate(booking.date)}`,
    `Time: ${formatTime(booking.time)} - ${formatTime(booking.endTime)}`,
    `Duration: ${CONFIG.durationMinutes} minutes`,
    `Time zone: ${CONFIG.timeZoneLabel}`,
    `Status: Pending staff confirmation`,
    '',
    'Client information:',
    `Name: ${booking.name}`,
    `Phone: ${booking.phone}`,
    `WhatsApp: ${whatsappLink(booking.phone)}`,
    `Email: ${clientEmail}`,
    '',
    'Please contact the client to confirm the tour.'
  ].join('\n');
}

function whatsappLink(phone) {
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 10) digits = `1${digits}`; // assume a US number if no country code was given
  return `https://wa.me/${digits}`;
}

async function sendStaffEmailNotification(booking, message) {
  if (!process.env.WEB3FORMS_ACCESS_KEY) {
    console.log(`[staff email not configured] Would send to ${CONFIG.staffEmail}:\n${message}`);
    return { sent: false, reason: 'Email provider not configured.', to: CONFIG.staffEmail };
  }

  const payload = {
    access_key: process.env.WEB3FORMS_ACCESS_KEY,
    subject: `New tour request - ${CONFIG.siteName}`,
    from_name: CONFIG.siteName,
    message
  };

  if (booking.email) {
    payload.replyto = booking.email;
  }

  const response = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.success) {
    throw new Error(`Web3Forms error ${response.status}: ${result.message || 'Unknown error'}`);
  }

  return { sent: true, provider: 'web3forms', to: CONFIG.staffEmail };
}

function safeJoin(base, target) {
  const targetPath = path.normalize(path.join(base, target));
  return targetPath.startsWith(base) ? targetPath : null;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text, contentType = 'text/plain; charset=utf-8', extraHeaders = {}) {
  res.writeHead(statusCode, { 'Content-Type': contentType, ...extraHeaders });
  res.end(text);
}

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});