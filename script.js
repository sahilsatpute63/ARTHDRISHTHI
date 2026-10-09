/* ==========================================================
   Financial Flight Simulator — application logic (vanilla JS)
   ========================================================== */
"use strict";

(() => {
  const STORAGE_KEY = "ffs-state-v1";

  /* ---------- Helpers ---------- */
  const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  const fmt = (n) => inr.format(Number.isFinite(Number(n)) ? Math.round(Number(n)) : 0);
  const fmtSigned = (n) => `${n < 0 ? "- " : "+ "}${fmt(Math.abs(n))}`;
  const pct = (n) => `${Math.round(Number.isFinite(n) ? n : 0)}%`;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const toNum = (v, fallback = NaN) => {
    if (v === "" || v === null || v === undefined) return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const parseISO = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(d.getTime()) || d.getMonth() !== Number(m[2]) - 1 ? null : d;
  };
  const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const dateLong = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const dateShort = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
  const weekdayShort = new Intl.DateTimeFormat("en-GB", { weekday: "short" });
  const monthShort = new Intl.DateTimeFormat("en-GB", { month: "short" });
  const fmtDate = (iso) => {
    const d = parseISO(iso);
    return d ? dateLong.format(d) : "—";
  };
  const debounce = (fn, ms) => {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
  };

  /* ---------- Icons (Lucide-style inline SVG) ---------- */
  const ICON_PATHS = {
    pie: '<path d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z" fill="currentColor"/><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>',
    card: '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/><path d="M6 15h4"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    bars: '<path d="M4 20V14"/><path d="M9 20V8"/><path d="M14 20V4"/><path d="M19 20v-9"/>',
    network: '<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
    sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
    gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    logout: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" fill="currentColor" fill-opacity=".9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" /><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    coins: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v4c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 10v4c0 1.7 3.1 3 7 3s7-1.3 7-3v-4"/><path d="M5 14v4c0 1.7 3.1 3 7 3s7-1.3 7-3v-4"/>',
    brain: '<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M12 5v13"/>',
    arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    more: '<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
    arrowUp: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
    cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
    cap: '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" fill="currentColor" fill-opacity=".85"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
    car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
    home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    film: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 12h18"/><path d="M17 3v18"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" fill="currentColor" fill-opacity=".18"/><path d="M12 8v5"/><path d="M9.5 10.5h5"/>',
    laptop: '<path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    menu: '<line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/>',
    reserve: '<path d="M3 20h18"/><rect x="5" y="13" width="3" height="5" rx="1" fill="currentColor"/><rect x="10.5" y="9" width="3" height="9" rx="1" fill="currentColor"/><rect x="16" y="5" width="3" height="13" rx="1" fill="currentColor"/>',
    trendDown: '<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>',
    trendUp: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
    wallet2: '<rect x="2" y="6" width="20" height="14" rx="3" fill="currentColor" fill-opacity=".2"/><path d="M2 10h20"/><path d="M6 6V4h12v2"/><circle cx="17" cy="14" r="1.4" fill="currentColor"/>',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  };
  const svgIcon = (name) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ICON_PATHS.target}</svg>`;
  const icon = (name, cls = "") => `<span class="icon ${cls}">${svgIcon(name)}</span>`;
  const hydrateIcons = (root = document) =>
    $$("[data-icon]", root).forEach((el) => {
      if (!el.dataset.hydrated) {
        el.innerHTML = svgIcon(el.dataset.icon);
        el.dataset.hydrated = "1";
      }
    });

  const CATEGORY_ICON = {
    Food: "utensils", Income: "arrowUp", Shopping: "cart", Education: "cap", Transport: "car",
    Housing: "home", Utilities: "zap", Health: "heart", Entertainment: "film",
  };
  const GOAL_ICONS = { shield: "Shield", cap: "Graduation cap", laptop: "Laptop", home: "Home", plane: "Travel", heart: "Health", car: "Vehicle", target: "Target" };
  const GOAL_TONE = { shield: "g-gold", cap: "g-blue", laptop: "g-sky", home: "g-green", plane: "g-lav", heart: "g-gold", car: "g-sky", target: "g-green" };
  const BAR_TONES = ["bar-green", "bar-gold", "bar-sage"];

  /* ---------- State ---------- */
  const emptyState = () => ({
    user: { name: "User", email: "" },
    account: {
      availableBalance: 0,
      lastMonthBalance: 0,
      reserveBuffer: 0,
      monthlyGoalContribution: 0,
      monthlyExpenses: 0,
      rent: 0,
    },
    settings: {
      minimumReserve: 5000,
      forecastDays: 7,
      notifications: {
        lowBalance: true,
        goalMilestones: true,
        weeklyDigest: false,
        dominoAlerts: true,
      },
    },
    categories: ["Food", "Income", "Shopping", "Education", "Transport", "Housing", "Utilities", "Health", "Entertainment"],
    transactions: [],
    goals: [],
    health: {
      score: 0,
      label: "No Data",
      split: [
        {"key": "Needs", "value": 0, "color": "#064E49"},
        {"key": "Wants", "value": 0, "color": "#D9B45B"},
        {"key": "Savings", "value": 0, "color": "#8DBA8A"},
      ],
      factors: []
    },
    forecast: {
      startDate: new Date().toISOString().slice(0, 10),
      sevenDay: [0, 0, 0, 0, 0, 0, 0]
    },
    sparklines: {
      balance: [0, 0, 0, 0, 0, 0],
      income: [0, 0, 0, 0, 0, 0]
    },
    insights: [],
    notifications: [],
    upcomingBills: [],
    goalContribution: 0,
  });

  const freshState = () => emptyState();

  const isValidTx = (t) =>
    t && typeof t.id === "string" && typeof t.merchant === "string" && Number.isFinite(Number(t.amount)) && parseISO(t.date);
  const isValidGoal = (g) =>
    g && typeof g.id === "string" && typeof g.name === "string" && Number.isFinite(Number(g.current)) && Number(g.target) > 0;

  function loadState() {
    const base = emptyState();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return base;
      const saved = JSON.parse(raw);
      return {
        user: { ...base.user, ...(saved.user || {}) },
        account: { ...base.account, ...(saved.account || {}) },
        settings: {
          ...base.settings,
          ...(saved.settings || {}),
          notifications: { ...base.settings.notifications, ...((saved.settings && saved.settings.notifications) || {}) },
        },
        categories: Array.isArray(saved.categories) && saved.categories.length ? saved.categories : base.categories,
        transactions: Array.isArray(saved.transactions) ? saved.transactions.filter(isValidTx) : base.transactions,
        goals: Array.isArray(saved.goals) ? saved.goals.filter(isValidGoal) : base.goals,
        health: saved.health || base.health,
        forecast: saved.forecast || base.forecast,
        sparklines: saved.sparklines || base.sparklines,
        insights: Array.isArray(saved.insights) ? saved.insights : base.insights,
        notifications: Array.isArray(saved.notifications) ? saved.notifications : base.notifications,
        upcomingBills: Array.isArray(saved.upcomingBills) ? saved.upcomingBills : base.upcomingBills,
        goalContribution: toNum(saved.goalContribution, base.goalContribution),
      };
    } catch {
      return base;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable (private mode) — app keeps working in memory */
    }
  }

  let state = loadState();

  const API_BASE = "http://localhost:8000/api/v1";
  if (!localStorage.getItem("ffs_token")) {
    window.location.replace("/login%20page/public/index.html");
  }

  
  async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem("ffs_token");
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    if (res.status === 401) {
      localStorage.removeItem("ffs_token");
      localStorage.removeItem("ffs-state-v1");
      sessionStorage.clear();
      sessionStorage.setItem("logout_message", "Your session has expired. Please sign in again.");
      window.location.replace("/login%20page/public/index.html?logged_out=1");
      return;
    }
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function loadStateFromAPI() {
    try {
      const dashboard = await apiFetch('/dashboard/overview');
      if (dashboard) {
        Object.assign(state, dashboard);
        if (dashboard.user && dashboard.user.name) {
          const userEl = document.getElementById("userName");
          if (userEl) userEl.textContent = dashboard.user.name;
        }
        saveState();
        renderAll();
      }
    } catch(e) {
      console.error('API Error:', e);
    }
  }

  loadStateFromAPI();


  // Hypothetical scenarios live outside `state` so they never touch real records.
  const scenario = { income: 0, expense: 0, rent: 0, savings: 0, horizon: 6 };
  const domino = { event: "Unexpected expense", amount: 5000, goalId: null };
  const ui = {
    overviewPeriod: state.settings.forecastDays,
    cfPeriod: state.settings.forecastDays,
    txSearch: "",
    txCategory: "All",
    txType: "all",
    currentPage: "overview",
  };

  /* ---------- Derived finance ---------- */
  const sortedTx = () => [...state.transactions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const monthKey = (iso) => String(iso).slice(0, 7);
  const latestMonth = () => {
    if (!state.transactions || state.transactions.length === 0) {
      return new Date().toISOString().slice(0, 7);
    }
    const keys = state.transactions.map((t) => monthKey(t.date)).filter(Boolean).sort();
    return keys[keys.length - 1] || new Date().toISOString().slice(0, 7);
  };
  const prevMonthKey = (key) => {
    const [y, m] = key.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const incomeIn = (key) => state.transactions.filter((t) => monthKey(t.date) === key && t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const spendIn = (key, cat) =>
    state.transactions.filter((t) => monthKey(t.date) === key && t.amount < 0 && (!cat || t.category === cat)).reduce((s, t) => s + Math.abs(t.amount), 0);
  const monthlyIncome = () => incomeIn(latestMonth());
  const incomeChangePct = () => {
    const cur = monthlyIncome();
    const prev = incomeIn(prevMonthKey(latestMonth()));
    return prev > 0 ? ((cur - prev) / prev) * 100 : 0;
  };
  const balanceChangePct = () => {
    const prev = state.account.lastMonthBalance;
    return prev > 0 ? ((state.account.availableBalance - prev) / prev) * 100 : 0;
  };
  const goalPct = (g) => (g.target > 0 ? clamp((g.current / g.target) * 100, 0, 100) : 0);

  function goalAllocation() {
    const contribution = Math.max(0, toNum(state.goalContribution, 0));
    const remaining = state.goals.map((g) => Math.max(0, g.target - g.current));
    const total = remaining.reduce((s, r) => s + r, 0);
    return state.goals.map((g, i) => {
      const alloc = total > 0 ? (remaining[i] / total) * contribution : 0;
      const months = remaining[i] === 0 ? 0 : alloc > 0 ? Math.ceil(remaining[i] / alloc) : Infinity;
      return { goal: g, remaining: remaining[i], alloc, months, onTrack: months <= 24 };
    });
  }

  /* ---------- Forecast ---------- */
  function forecastDaily(days) {
    if (!state.transactions || state.transactions.length === 0) {
      const start = new Date();
      return Array.from({ length: days }, (_, i) => ({ date: addDays(start, i), value: 0 }));
    }
    const start = parseISO(state.forecast?.startDate) || new Date();
    const seed = state.forecast?.sevenDay || [];
    const base = toNum(state.account.availableBalance, 0);
    const out = [];
    for (let i = 0; i < days; i++) {
      let v;
      if (i < seed.length) {
        v = seed[i];
      } else {
        v = seed.length ? seed[seed.length - 1] : base;
      }
      out.push({ date: addDays(start, i), value: Math.max(0, Math.round(v)) });
    }
    return out;
  }

  function forecastPoints(days) {
    const daily = forecastDaily(days);
    if (days <= 7) {
      return daily.map((p) => ({ label: weekdayShort.format(p.date), value: p.value, title: `${weekdayShort.format(p.date)}, ${dateShort.format(p.date)}` }));
    }
    if (days <= 30) {
      return daily.map((p, i) => ({
        label: i % 5 === 0 ? dateShort.format(p.date) : "",
        value: p.value,
        title: `${weekdayShort.format(p.date)}, ${dateShort.format(p.date)}`,
      }));
    }
    const weeks = [];
    for (let i = 0; i < daily.length; i += 7) {
      const chunk = daily.slice(i, i + 7);
      const avg = chunk.reduce((s, p) => s + p.value, 0) / chunk.length;
      const low = Math.min(...chunk.map((p) => p.value));
      weeks.push({
        label: dateShort.format(chunk[0].date),
        value: Math.round(avg),
        low,
        title: `Week of ${dateShort.format(chunk[0].date)} · low ${fmt(low)}`,
      });
    }
    return weeks;
  }

  /* ---------- SVG: sparkline ---------- */
  function smoothPath(pts) {
    if (!pts.length) return "";
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
    }
    return d;
  }

  function sparkline(values, color) {
    const w = 220, h = 44;
    const min = Math.min(...values), max = Math.max(...values);
    const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 4 - ((v - min) / (max - min || 1)) * (h - 8)]);
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path d="${smoothPath(pts)}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
  }

  /* ---------- SVG: bar chart ---------- */
  const chartRenderers = new Map();
  const resizeObserver = typeof ResizeObserver !== "undefined"
    ? new ResizeObserver(debounce((entries) => entries.forEach((e) => chartRenderers.get(e.target)?.()), 80))
    : null;

  function registerChart(el, render) {
    if (!chartRenderers.has(el) && resizeObserver) resizeObserver.observe(el);
    chartRenderers.set(el, render);
    render();
  }

  const niceStep = (raw) => {
    const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
    const n = raw / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  };
  const shortK = (n) => (n >= 1000 ? `${Math.round(n / 1000)} K` : `${n}`);
  const roundedTop = (x, y, w, h, r) => {
    const rr = Math.min(r, w / 2, h);
    return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
  };

  function renderBarChart(el, points, reserve) {
    const w = Math.max(el.clientWidth, 260);
    const h = Math.max(el.clientHeight, 180);
    const pad = { l: 42, r: 10, t: 12, b: 30 };
    const innerW = w - pad.l - pad.r;
    const innerH = h - pad.t - pad.b;
    const values = points.map((p) => p.value);
    const rawMax = Math.max(...values, reserve, 1);
    const step = niceStep(rawMax / 4);
    const yMax = Math.ceil(rawMax / step) * step;
    const y = (v) => pad.t + innerH - (clamp(v, 0, yMax) / yMax) * innerH;
    const n = points.length;
    const slot = innerW / n;
    const barW = Math.max(3, Math.min(60, slot * (n > 20 ? 0.62 : 0.58)));
    const radius = n > 20 ? 2 : 6;
    let maxIdx = values.indexOf(Math.max(...values));

    let grid = "";
    for (let v = 0; v <= yMax + 0.5; v += step) {
      grid += `<line class="grid-line" x1="${pad.l}" x2="${w - pad.r}" y1="${y(v)}" y2="${y(v)}"/>`;
      grid += `<text class="axis-label" x="${pad.l - 10}" y="${y(v) + 4}" text-anchor="end">${shortK(v)}</text>`;
    }

    let bars = "";
    points.forEach((p, i) => {
      const x = pad.l + slot * i + (slot - barW) / 2;
      const top = y(p.value);
      const below = p.value < reserve;
      bars += `<g class="bar-group" data-i="${i}" tabindex="0" role="img" aria-label="${esc(p.title)}: ${esc(fmt(p.value))}${below ? ", below minimum reserve" : ""}">
        <path class="bar-track" d="${roundedTop(x, pad.t, barW, innerH, radius)}"/>
        <path class="bar-fill ${below ? "below" : ""}" d="${roundedTop(x, top, barW, pad.t + innerH - top, radius)}"/>
        ${p.label ? `<text class="x-label" x="${x + barW / 2}" y="${h - 8}" text-anchor="middle">${esc(p.label)}</text>` : ""}
      </g>`;
    });

    const ry = y(reserve);
    el.innerHTML = `
      <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-label="Cash flow forecast chart">
        ${grid}
        ${bars}
        <line class="reserve-line" x1="${pad.l}" x2="${w - pad.r}" y1="${ry}" y2="${ry}"/>
        <g class="marker" pointer-events="none">
          <line class="marker-line" y1="${pad.t}" y2="${pad.t + innerH}"/>
          <circle class="marker-dot" r="6" fill="#fff" stroke="#102C2B" stroke-width="2"/>
        </g>
      </svg>
      <div class="chart-tooltip" aria-hidden="true"></div>
      <span class="reserve-badge" style="top:${ry}px">${esc(fmt(reserve))}</span>`;

    const tooltip = $(".chart-tooltip", el);
    const markerLine = $(".marker-line", el);
    const markerDot = $(".marker-dot", el);
    const show = (i) => {
      const p = points[i];
      const cx = pad.l + slot * i + slot / 2;
      const top = y(p.value);
      markerLine.setAttribute("x1", cx);
      markerLine.setAttribute("x2", cx);
      markerDot.setAttribute("cx", cx);
      markerDot.setAttribute("cy", top);
      tooltip.innerHTML = `${esc(fmt(p.value))}<small>${esc(p.title)}</small>`;
      const tipX = clamp(cx, 60, w - 60);
      tooltip.style.left = `${tipX}px`;
      tooltip.style.top = `${top}px`;
    };
    $$(".bar-group", el).forEach((g) => {
      const i = Number(g.dataset.i);
      g.addEventListener("mouseenter", () => show(i));
      g.addEventListener("focus", () => show(i));
      g.addEventListener("click", () => show(i));
    });
    el.onmouseleave = () => show(maxIdx);
    show(maxIdx);
  }

  /* ---------- SVG: donut ---------- */
  function donut(split, score, label) {
    const r = 84, c = 2 * Math.PI * r, gap = 3;
    let offset = 0;
    const total = split.reduce((s, p) => s + p.value, 0) || 1;
    const segs = split
      .map((p) => {
        const len = (p.value / total) * c;
        const seg = `<circle class="seg" cx="100" cy="100" r="${r}" fill="none" stroke="${p.color}" stroke-width="26" stroke-dasharray="${Math.max(0, len - gap)} ${c}" stroke-dashoffset="${-offset}"/>`;
        offset += len;
        return seg;
      })
      .join("");
    const ir = 66, ic = 2 * Math.PI * ir;
    const safeScore = clamp(toNum(score, 0), 0, 100);
    return `<div class="donut" role="img" aria-label="Financial health score ${safeScore} out of 100, ${esc(label)}">
      <svg viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="${r}" fill="none" stroke="#EFE6D2" stroke-width="26"/>
        ${segs}
        <circle cx="100" cy="100" r="${ir}" fill="none" stroke="#E8E2FA" stroke-width="4"/>
        <circle class="seg" cx="100" cy="100" r="${ir}" fill="none" stroke="#7662DF" stroke-width="4" stroke-linecap="round" stroke-dasharray="${(safeScore / 100) * ic} ${ic}"/>
      </svg>
      <div class="donut-center"><span class="d-label">Score</span><span class="d-score">${safeScore}<small>/100</small></span><span class="d-status">${esc(label)}</span></div>
    </div>`;
  }

  /* ---------- Rendering: overview ---------- */
  function renderSummary() {
    $("#balanceValue").textContent = fmt(state.account.availableBalance);
    const bc = balanceChangePct();
    const bEl = $("#balanceChange");
    bEl.textContent = `${bc >= 0 ? "+" : ""}${Math.round(bc)}%`;
    bEl.className = `badge ${bc >= 0 ? "badge-green" : "badge-red"}`;
    $("#incomeValue").textContent = fmt(monthlyIncome());
    const ic = incomeChangePct();
    const iEl = $("#incomeChange");
    iEl.textContent = `${ic >= 0 ? "+" : ""}${Math.round(ic)}%`;
    iEl.className = `badge ${ic >= 0 ? "badge-green" : "badge-red"}`;
    const balSpark = state.sparklines?.balance || [0, 0, 0, 0, 0, 0];
    const incSpark = state.sparklines?.income || [0, 0, 0, 0, 0, 0];
    $("#balanceSpark").innerHTML = sparkline(balSpark, "#2E7655");
    $("#incomeSpark").innerHTML = sparkline(incSpark, "#C99A33");
  }

  function txRow(t, { compact = false } = {}) {
    const cat = esc(t.category);
    return `<tr class="clickable" tabindex="0" data-tx="${esc(t.id)}" aria-label="${esc(t.merchant)}, ${esc(fmtSigned(t.amount))}, ${cat}, ${esc(fmtDate(t.date))}">
      <td><div class="merchant"><span class="m-icon mi-${cat}">${icon(CATEGORY_ICON[t.category] || "wallet2")}</span><span><span class="m-name">${esc(t.merchant)}</span><span class="m-desc">${esc(t.description || "—")}</span></span></div></td>
      <td class="num"><span class="amount ${t.amount < 0 ? "neg" : "pos"}">${esc(fmtSigned(t.amount))}</span></td>
      <td><span class="cat cat-${cat}">${cat}</span></td>
      <td class="date-cell">${esc(fmtDate(t.date))}</td>
      ${compact ? "" : `<td class="hide-sm">${esc(t.method || "—")}</td>`}
    </tr>`;
  }

  function renderRecent() {
    const rows = sortedTx().slice(0, 5);
    $("#recentTxBody").innerHTML = rows.length
      ? rows.map((t) => txRow(t, { compact: true })).join("")
      : `<tr><td colspan="4" class="empty">No transactions yet.</td></tr>`;
  }

  function periodTitle(days) {
    return { title: `${days}-Day Cash Flow Forecast`, sub: `Projected balance over the next ${days} days${days > 30 ? " (weekly averages)" : ""}` };
  }

  function renderOverviewChart() {
    const days = ui.overviewPeriod;
    const t = periodTitle(days);
    $("#overviewChartTitle").textContent = t.title;
    $("#overviewChartSub").textContent = t.sub;
    $("#overviewPeriod").value = String(days);
    registerChart($("#overviewChart"), () => renderBarChart($("#overviewChart"), forecastPoints(days), state.settings.minimumReserve));
  }

  function renderReserveLabels() {
    $$(".reserve-label").forEach((el) => (el.textContent = `Minimum Reserve (${fmt(state.settings.minimumReserve)})`));
  }

  function renderHealthMini() {
    const h = state.health || { score: 0, label: "No Data", split: [] };
    if (!state.transactions || state.transactions.length === 0) {
      $("#healthMini").innerHTML = `<div class="empty" style="padding:16px;text-align:center;">
        <p style="font-size:13px;color:var(--text-secondary);margin:0;">No financial data yet.<br/>Import transactions to calculate health score.</p>
      </div>`;
      return;
    }
    $("#healthMini").innerHTML = `${donut(h.split || [], h.score, h.label)}
      <ul class="health-legend">${(h.split || [])
        .map(
          (s) => `<li class="hl-item"><span class="hl-dot" style="background:${s.color}"></span><span class="hl-name">${esc(s.key)}</span>
          <span class="hl-val">${s.value}%</span><span class="hl-bar"><span style="width:${s.value}%;background:${s.color}"></span></span></li>`
        )
        .join("")}</ul>`;
  }

  function dominoGoal() {
    return state.goals.find((g) => g.id === domino.goalId) || state.goals.find((g) => /laptop/i.test(g.name)) || state.goals[0] || null;
  }

  function dominoCalc(amount) {
    const buffer = toNum(state.account.reserveBuffer, 0);
    const contribution = Math.max(0, toNum(state.goalContribution, 0));
    const remaining = buffer - amount;
    const delay = amount <= 0 ? 0 : contribution > 0 ? Math.ceil(amount / contribution) : Infinity;
    return { buffer, remaining, safeRemaining: Math.max(0, remaining), breach: Math.max(0, -remaining), delay, contribution };
  }

  const monthsText = (m) => (!Number.isFinite(m) ? "indefinitely" : m === 0 ? "0 months" : `${m} month${m === 1 ? "" : "s"}`);

  function dominoChainHtml(event, amount) {
    const r = dominoCalc(amount);
    const goal = dominoGoal();
    return `
      <div class="d-step"><span class="d-circle">${icon("wallet2")}</span><span class="d-text">${esc(event)}</span><span class="d-value">${esc(fmt(amount))}</span></div>
      <span class="d-arrow">${icon("arrowRight")}</span>
      <div class="d-step"><span class="d-circle gold">${icon("reserve")}</span><span class="d-text">Lower reserve buffer</span><span class="d-value ${r.breach > 0 ? "bad" : ""}">${esc(fmt(r.safeRemaining))}</span></div>
      <span class="d-arrow">${icon("arrowRight")}</span>
      <div class="d-step"><span class="d-circle">${icon("target")}</span><span class="d-text">${goal ? `${esc(goal.name)} goal delayed by` : "Savings goal delayed by"}</span><span class="d-value">${esc(monthsText(r.delay))}</span></div>`;
  }

  function renderDominoMini() {
    $("#dominoChainMini").innerHTML = dominoChainHtml("Unexpected expense", 5000).replace(/>\s*([^<]*) goal delayed by</, ">Savings goal delayed by<");
    const r = dominoCalc(5000);
    const goal = dominoGoal();
    $("#dominoMiniText").textContent = `A ${fmt(5000)} unexpected expense could reduce your safety buffer and delay your ${goal ? goal.name : "savings"} goal by ${monthsText(r.delay)}.`;
  }

  function goalMiniHtml(g, i) {
    const p = goalPct(g);
    return `<li><button class="goal-mini" data-edit-goal="${esc(g.id)}" aria-label="Edit ${esc(g.name)} goal, ${Math.round(p)}% complete">
      <span class="g-icon ${GOAL_TONE[g.icon] || "g-green"}">${icon(g.icon in GOAL_ICONS ? g.icon : "target")}</span>
      <span class="g-info">
        <span class="g-top"><span class="g-name">${esc(g.name)}</span><span class="g-pct">${Math.round(p)}%</span></span>
        <span class="g-amt">${esc(fmt(g.current))} / ${esc(fmt(g.target))}</span>
        <span class="progress"><span class="${BAR_TONES[i % 3]}" style="width:${p}%"></span></span>
      </span>
    </button></li>`;
  }

  function renderGoalsMini() {
    const alloc = goalAllocation();
    $("#goalsOnTrack").textContent = `${alloc.filter((a) => a.onTrack).length}/${alloc.length}`;
    $("#goalMiniList").innerHTML = state.goals.length
      ? state.goals.slice(0, 3).map(goalMiniHtml).join("")
      : `<li class="empty">No goals yet.</li>`;
  }

  function renderOverview() {
    renderSummary();
    renderRecent();
    renderOverviewChart();
    renderHealthMini();
    renderDominoMini();
    renderGoalsMini();
  }

  /* ---------- Transactions page ---------- */
  function filteredTx() {
    const q = ui.txSearch.trim().toLowerCase();
    return sortedTx().filter((t) => {
      if (ui.txCategory !== "All" && t.category !== ui.txCategory) return false;
      if (ui.txType === "income" && t.amount <= 0) return false;
      if (ui.txType === "expense" && t.amount >= 0) return false;
      if (q && !`${t.merchant} ${t.description} ${t.category}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  const statCard = (label, value, note, tone = "") =>
    `<div class="card stat ${tone}"><p class="stat-label">${esc(label)}</p><p class="stat-value">${esc(value)}</p>${note ? `<p class="stat-note">${esc(note)}</p>` : ""}</div>`;

  function renderTransactionsPage() {
    const availableCats = state.categories && state.categories.length ? state.categories : ["Food", "Income", "Shopping", "Education", "Transport", "Housing", "Utilities", "Health", "Entertainment"];
    const cats = ["All", ...availableCats];
    $("#txChips").innerHTML = cats
      .map((c) => `<button type="button" class="chip" data-cat="${esc(c)}" aria-pressed="${ui.txCategory === c}">${esc(c)}</button>`)
      .join("");
    const rows = filteredTx();
    $("#txBody").innerHTML = rows.map((t) => txRow(t)).join("");
    $("#txEmpty").hidden = rows.length > 0;
    const inc = rows.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const exp = rows.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    $("#txStats").innerHTML =
      statCard("Income", fmt(inc), "In current filter", "tone-green") +
      statCard("Expenses", fmt(exp), "In current filter", "tone-red") +
      statCard("Net flow", fmt(inc - exp), inc - exp >= 0 ? "Positive" : "Negative", "tone-gold") +
      statCard("Transactions", String(rows.length), `of ${state.transactions.length} total`, "tone-lav");
  }

  /* ---------- Health page ---------- */
  function renderHealthPage() {
    const h = state.health || { score: 0, label: "No Data", split: [], factors: [] };
    if (!state.transactions || state.transactions.length === 0) {
      $("#healthLarge").innerHTML = `<div class="empty" style="padding:24px;text-align:center;"><h3>No Transactions</h3><p class="card-sub" style="margin-top:6px;">Import a bank statement to calculate your financial health score.</p></div>`;
      $("#factorList").innerHTML = `<li class="empty" style="padding:12px 0;">No score factor data available.</li>`;
      $("#splitCompare").innerHTML = `<div class="empty" style="padding:12px;text-align:center;">No spending records to compare against guidelines.</div>`;
      return;
    }
    $("#healthLarge").innerHTML = `${donut(h.split || [], h.score, h.label)}
      <ul class="health-legend">${(h.split || [])
        .map(
          (s) => `<li class="hl-item"><span class="hl-dot" style="background:${s.color}"></span><span class="hl-name">${esc(s.key)} · ${esc(fmt((monthlyIncome() * s.value) / 100))}/mo</span>
          <span class="hl-val">${s.value}%</span><span class="hl-bar"><span style="width:${s.value}%;background:${s.color}"></span></span></li>`
        )
        .join("")}</ul>`;
    $("#factorList").innerHTML = (h.factors || [])
      .map(
        (f, i) => `<li><div class="factor-top"><span>${esc(f.name)}</span><span>${f.score}/100</span></div>
        <div class="progress"><span class="${BAR_TONES[i % 3]}" style="width:${f.score}%"></span></div>
        <p class="factor-note">${esc(f.note)}</p></li>`
      )
      .join("");
    const bench = { Needs: 50, Wants: 30, Savings: 20 };
    $("#splitCompare").innerHTML = (h.split || [])
      .map(
        (s) => `<div class="cmp-row"><span class="cmp-name">${esc(s.key)}</span>
        <span class="cmp-track" role="img" aria-label="${esc(s.key)} ${s.value}% versus guideline ${bench[s.key]}%"><span style="width:${s.value}%;background:${s.color}"></span><i style="left:${bench[s.key]}%"></i></span>
        <span class="cmp-val">${s.value}% vs ${bench[s.key]}% guide</span></div>`
      )
      .join("");
  }

  /* ---------- Cash flow page ---------- */
  function renderCashflowPage() {
    const days = ui.cfPeriod;
    $("#cfPeriod").value = String(days);
    $("#cfChartTitle").textContent = periodTitle(days).title;
    const daily = forecastDaily(days);
    const vals = daily.map((d) => d.value);
    const low = Math.min(...vals);
    const lowDay = daily[vals.indexOf(low)] || { date: new Date() };
    const reserve = state.settings.minimumReserve;
    const belowDays = vals.filter((v) => v < reserve).length;
    $("#cfStats").innerHTML =
      statCard("Lowest projected", fmt(low), dateShort.format(lowDay.date), low < reserve ? "tone-red" : "tone-green") +
      statCard("Highest projected", fmt(Math.max(...vals)), "Peak balance", "tone-gold") +
      statCard("Average balance", fmt(vals.reduce((s, v) => s + v, 0) / (vals.length || 1)), `Over ${days} days`, "tone-lav") +
      statCard("Days below reserve", String(belowDays), `Reserve ${fmt(reserve)}`, belowDays ? "tone-red" : "tone-green");
    registerChart($("#cfChart"), () => renderBarChart($("#cfChart"), forecastPoints(days), state.settings.minimumReserve));
    const bills = state.upcomingBills || [];
    $("#billList").innerHTML = bills.length
      ? [...bills]
          .sort((a, b) => (a.due < b.due ? -1 : 1))
          .map((b) => `<li class="bill"><div><strong>${esc(b.name)}</strong><span>Due ${esc(fmtDate(b.due))}</span></div><span class="amount neg">- ${esc(fmt(b.amount))}</span></li>`)
          .join("")
      : `<li class="empty" style="padding:16px;text-align:center;color:var(--text-secondary);">No recurring bills recorded.</li>`;
  }

  /* ---------- Domino page ---------- */
  function renderDominoPage() {
    const sel = $("#dominoGoal");
    const goal = dominoGoal();
    sel.innerHTML = state.goals.map((g) => `<option value="${esc(g.id)}" ${goal && g.id === goal.id ? "selected" : ""}>${esc(g.name)}</option>`).join("");
    $("#dominoEvent").value = domino.event;
    $("#dominoAmount").value = String(domino.amount);
    updateDominoResults();
  }

  function updateDominoResults() {
    const amount = domino.amount;
    const r = dominoCalc(amount);
    const goal = dominoGoal();
    $("#dominoChainLarge").innerHTML = dominoChainHtml(domino.event || "Unexpected expense", amount);
    const goalName = goal ? goal.name : "savings";
    let text = `A ${fmt(amount)} ${esc(domino.event.toLowerCase() || "expense")} drops your safety buffer from ${fmt(r.buffer)} to ${fmt(r.safeRemaining)}. `;
    text += r.breach > 0
      ? `That is ${fmt(r.breach)} below your minimum reserve of ${fmt(state.settings.minimumReserve)}, so you would dip into the reserve itself. `
      : `You stay above your minimum reserve of ${fmt(state.settings.minimumReserve)}. `;
    text += `Rebuilding at ${fmt(r.contribution)}/month delays your ${esc(goalName)} goal by ${monthsText(r.delay)}.`;
    $("#dominoExplain").innerHTML = text;

    const ef = state.goals.find((g) => /emergency/i.test(g.name));
    const wantsCut = Math.round(monthlyIncome() * 0.24 * 0.2);
    const alts = [];
    if (ef) {
      const after = Math.max(0, ef.current - amount);
      const ok = ef.current >= amount;
      alts.push({
        title: "Pay from Emergency Fund",
        desc: `Use the fund built for exactly this. ${ef.name} would drop from ${fmt(ef.current)} to ${fmt(after)}.`,
        result: ok ? `${goalName} stays on schedule` : `Fund short by ${fmt(amount - ef.current)}`,
        bad: !ok,
      });
    }
    const emi = amount / 3;
    alts.push({
      title: "Spread over 3 months",
      desc: `Pay ${fmt(emi)} per month instead of all at once, keeping the buffer at ${fmt(Math.max(0, r.buffer - emi))}.`,
      result: r.buffer - emi >= 0 ? "Reserve stays intact" : "Reserve still breached",
      bad: r.buffer - emi < 0,
    });
    const boosted = r.contribution + wantsCut;
    const weeks = amount <= 0 ? 0 : boosted > 0 ? Math.ceil(amount / (boosted / 4.33)) : Infinity;
    alts.push({
      title: "Trim Wants by 20%",
      desc: `Redirect ${fmt(wantsCut)}/month from Wants into savings until the hit is recovered.`,
      result: Number.isFinite(weeks) ? `Recovered in ~${weeks} week${weeks === 1 ? "" : "s"}` : "Not recoverable",
      bad: !Number.isFinite(weeks),
    });
    const side = 3000;
    const net = Math.max(0, amount - side);
    const sideDelay = net === 0 ? 0 : r.contribution > 0 ? Math.ceil(net / r.contribution) : Infinity;
    alts.push({
      title: "One-off side income",
      desc: `A ${fmt(side)} freelance gig offsets part of the cost, leaving ${fmt(net)} to absorb.`,
      result: `Delay becomes ${monthsText(sideDelay)}`,
      bad: sideDelay > r.delay,
    });
    $("#dominoAlts").innerHTML = alts
      .map((a) => `<div class="alt"><h3>${esc(a.title)}</h3><p>${esc(a.desc)}</p><span class="alt-result ${a.bad ? "bad" : ""}">${esc(a.result)}</span></div>`)
      .join("");
  }

  /* ---------- Goals page ---------- */
  function renderGoalsPage() {
    $("#goalContribution").value = String(state.goalContribution);
    $("#goalGrid").innerHTML = state.goals.length
      ? state.goals
          .map((g, i) => {
            const p = goalPct(g);
            return `<article class="card goal-card">
            <div class="goal-card-top"><span class="g-icon ${GOAL_TONE[g.icon] || "g-green"}">${icon(g.icon in GOAL_ICONS ? g.icon : "target")}</span><h3>${esc(g.name)}</h3><span class="goal-pct">${Math.round(p)}%</span></div>
            <p class="g-amt">${esc(fmt(g.current))} of ${esc(fmt(g.target))} · ${esc(fmt(Math.max(0, g.target - g.current)))} to go</p>
            <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p)}" aria-label="${esc(g.name)} progress"><span class="${BAR_TONES[i % 3]}" style="width:${p}%"></span></div>
            <div class="goal-card-actions">
              <button class="btn btn-ghost" data-edit-goal="${esc(g.id)}">${icon("pencil")} Edit</button>
              <button class="btn btn-ghost" data-contribute-goal="${esc(g.id)}">${icon("plus")} Add ${esc(fmt(1000))}</button>
            </div>
          </article>`;
          })
          .join("")
      : `<article class="card empty">No goals yet. Add your first goal to get started.</article>`;
    $("#allocBody").innerHTML = goalAllocation()
      .map(
        (a) => `<tr><td><div class="merchant"><span class="m-icon ${GOAL_TONE[a.goal.icon] || "g-green"}">${icon(a.goal.icon in GOAL_ICONS ? a.goal.icon : "target")}</span><span class="m-name">${esc(a.goal.name)}</span></div></td>
        <td class="num">${esc(fmt(a.remaining))}</td><td class="num">${esc(fmt(a.alloc))}</td>
        <td class="num">${a.remaining === 0 ? "Completed" : Number.isFinite(a.months) ? esc(monthsText(a.months)) : "No allocation"}</td></tr>`
      )
      .join("");
  }

  /* ---------- Future simulator ---------- */
  function simulate() {
    const income = monthlyIncome();
    const expenses = toNum(state.account.monthlyExpenses, 0);
    const horizon = scenario.horizon;
    const start = state.account.availableBalance;
    const goalsRemaining = state.goals.reduce((s, g) => s + Math.max(0, g.target - g.current), 0);

    const baseNet = income - expenses;
    const hIncome = income * (1 + scenario.income / 100);
    const hExpenses = Math.max(0, expenses + scenario.rent - (income * scenario.savings) / 100);
    const hNet = hIncome - hExpenses;

    const series = (net, oneOff) => {
      const out = [start];
      for (let m = 1; m <= horizon; m++) out.push(start + net * m - (oneOff || 0));
      return out;
    };
    const base = series(baseNet, 0);
    const hypo = series(hNet, scenario.expense);
    const eta = (net) => (goalsRemaining === 0 ? 0 : net > 0 ? Math.ceil(goalsRemaining / net) : Infinity);
    return {
      base: { series: base, end: base[horizon], net: baseNet, rate: income > 0 ? (baseNet / income) * 100 : 0, eta: eta(baseNet), low: Math.min(...base) },
      hypo: { series: hypo, end: hypo[horizon], net: hNet, rate: hIncome > 0 ? (hNet / hIncome) * 100 : 0, eta: eta(hNet), low: Math.min(...hypo) },
      horizon,
    };
  }

  function renderSimulator() {
    const r = simulate();
    const d = r.hypo.end - r.base.end;
    const box = (cls, title, s) => `<div class="sim-box ${cls}"><p class="sb-label">${title}</p><p class="sb-value">${esc(fmt(s.end))}</p>
      <dl><dt>Monthly net</dt><dd>${esc(fmtSigned(s.net))}</dd><dt>Savings rate</dt><dd>${esc(pct(s.rate))}</dd>
      <dt>Lowest balance</dt><dd>${esc(fmt(s.low))}</dd><dt>All goals funded in</dt><dd>${esc(monthsText(s.eta))}</dd></dl></div>`;
    $("#simCompare").innerHTML = box("", "Baseline", r.base) + box("hypo", "Hypothetical", r.hypo);
    $("#simSummary").innerHTML = `After ${r.horizon} months your hypothetical balance is <span class="delta ${d >= 0 ? "pos" : "neg"}">${esc(fmtSigned(d))}</span> versus baseline.`;
    renderSimChart(r);
    $("#simIncomeOut").textContent = `${scenario.income > 0 ? "+" : ""}${scenario.income}%`;
    $("#simSavingsOut").textContent = `${scenario.savings >= 0 ? "+" : ""}${scenario.savings} pts`;
    $$("#simForm input[type=range]").forEach(setRangeFill);
  }

  function renderSimChart(r) {
    const el = $("#simChart");
    registerChart(el, () => {
      const w = Math.max(el.clientWidth, 260), h = Math.max(el.clientHeight - 26, 160);
      const pad = { l: 52, r: 12, t: 10, b: 26 };
      const all = [...r.base.series, ...r.hypo.series, state.settings.minimumReserve];
      let min = Math.min(...all), max = Math.max(...all);
      if (max === min) max = min + 1000;
      const step = niceStep((max - min) / 4);
      min = Math.floor(min / step) * step;
      max = Math.ceil(max / step) * step;
      const x = (i) => pad.l + (i / r.horizon) * (w - pad.l - pad.r);
      const y = (v) => pad.t + (1 - (v - min) / (max - min)) * (h - pad.t - pad.b);
      const start = parseISO(state.forecast?.startDate) || new Date();
      let grid = "";
      for (let v = min; v <= max + 0.5; v += step) {
        grid += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="#E9DFC8"/><text class="axis-label" x="${pad.l - 8}" y="${y(v) + 4}" text-anchor="end">${v < 0 ? "-" : ""}${shortK(Math.abs(v))}</text>`;
      }
      let labels = "";
      const every = r.horizon > 6 ? 2 : 1;
      for (let i = 0; i <= r.horizon; i += every) {
        const lbl = i === 0 ? "Now" : monthShort.format(new Date(start.getFullYear(), start.getMonth() + i, 1));
        labels += `<text class="axis-label" x="${x(i)}" y="${h - 6}" text-anchor="middle">${lbl}</text>`;
      }
      const line = (s) => s.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
      const ry = y(state.settings.minimumReserve);
      el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Baseline versus hypothetical balance over ${r.horizon} months">
        ${grid}${labels}
        <line x1="${pad.l}" x2="${w - pad.r}" y1="${ry}" y2="${ry}" stroke="#D94343" stroke-dasharray="6 5" stroke-width="1.5"/>
        <path d="${line(r.base.series)}" fill="none" stroke="#064E49" stroke-width="3" stroke-linejoin="round"/>
        <path d="${line(r.hypo.series)}" fill="none" stroke="#7662DF" stroke-width="3" stroke-dasharray="8 5" stroke-linejoin="round"/>
        ${r.hypo.series.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3.5" fill="#7662DF"><title>${fmt(v)}</title></circle>`).join("")}
      </svg>
      <div class="line-legend"><span><i style="background:#064E49"></i>Baseline</span><span><i style="background:#7662DF"></i>Hypothetical</span><span><i style="background:#D94343"></i>Minimum reserve</span></div>`;
    });
  }

  function setRangeFill(input) {
    const min = Number(input.min), max = Number(input.max), v = Number(input.value);
    input.style.setProperty("--fill", `${((v - min) / (max - min)) * 100}%`);
  }

  /* ---------- Insights ---------- */
  function insightTokens() {
    const key = latestMonth();
    const foodTx = state.transactions.filter((t) => monthKey(t.date) === key && t.category === "Food" && t.amount < 0);
    const laptop = state.goals.find((g) => /laptop/i.test(g.name));
    const avg = state.goals.length ? state.goals.reduce((s, g) => s + goalPct(g), 0) / state.goals.length : 0;
    return {
      foodOct: fmt(spendIn(key, "Food")),
      foodCount: String(foodTx.length),
      laptopPct: String(Math.round(laptop ? goalPct(laptop) : 0)),
      avgPct: String(Math.round(avg)),
      buffer: fmt(state.account.reserveBuffer),
      reserve: fmt(state.settings.minimumReserve),
      incomeOct: fmt(monthlyIncome()),
      incomeChange: String(Math.round(incomeChangePct())),
    };
  }
  const fillEvidence = (tpl, tokens) => esc(tpl).replace(/\{(\w+)\}/g, (_, k) => `<strong>${esc(tokens[k] ?? "—")}</strong>`);
  const INSIGHT_ICON = { warning: "utensils", info: "laptop", danger: "alert", success: "trendUp" };

  function renderInsights() {
    const insightsList = state.insights && state.insights.length ? state.insights : [];
    if (!insightsList.length) {
      $("#insightGrid").innerHTML = `<article class="card empty" style="grid-column: 1 / -1; padding: 24px; text-align: center;">
        <h2>No Insights Yet</h2>
        <p class="card-sub" style="margin-top: 8px;">Import or add financial transactions to generate automated AI insights and risk detections.</p>
        <button class="btn btn-teal" style="margin-top: 16px;" data-goto="transactions">Go to Transactions <span class="icon" data-icon="arrowRight"></span></button>
      </article>`;
      return;
    }
    const tokens = insightTokens();
    $("#insightGrid").innerHTML = insightsList
      .map(
        (ins) => `<article class="card insight tone-${esc(ins.tone || 'info')}" id="insight-${esc(ins.id)}">
        <div class="insight-top"><span class="ins-icon">${icon(INSIGHT_ICON[ins.tone] || "sparkles")}</span><h2>${esc(ins.title)}</h2></div>
        <p class="evidence">${fillEvidence(ins.evidence, tokens)}</p>
        <p class="explain">${esc(ins.explanation)}</p>
        <button class="btn btn-teal" data-goto="${esc(ins.page || 'transactions')}">${esc(ins.linkLabel || 'Review')} ${icon("arrowRight")}</button>
      </article>`
      )
      .join("");
  }

  /* ---------- Reports ---------- */
  function reportRows() {
    const from = $("#repFrom").value;
    const to = $("#repTo").value;
    const cat = $("#repCategory").value || "All";
    const err = $("#repError");
    if (!parseISO(from) || !parseISO(to)) {
      err.textContent = "Please choose valid From and To dates.";
      err.hidden = false;
      return null;
    }
    if (from > to) {
      err.textContent = "The From date must be on or before the To date.";
      err.hidden = false;
      return null;
    }
    err.hidden = true;
    return sortedTx().filter((t) => t.date >= from && t.date <= to && (cat === "All" || t.category === cat));
  }

  function renderReports() {
    const catSel = $("#repCategory");
    const availableCats = state.categories && state.categories.length ? state.categories : ["Food", "Income", "Shopping", "Education", "Transport", "Housing", "Utilities", "Health", "Entertainment"];
    if (!catSel.options.length) catSel.innerHTML = ["All", ...availableCats].map((c) => `<option value="${esc(c)}">${c === "All" ? "All categories" : esc(c)}</option>`).join("");
    const rows = reportRows();
    if (!rows) {
      $("#repStats").innerHTML = "";
      $("#repCats").innerHTML = "";
      $("#repBody").innerHTML = "";
      return;
    }
    const inc = rows.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const exp = rows.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    const rate = inc > 0 ? ((inc - exp) / inc) * 100 : 0;
    $("#repStats").innerHTML =
      statCard("Total income", fmt(inc), "", "tone-green") +
      statCard("Total expenses", fmt(exp), "", "tone-red") +
      statCard("Net savings", fmt(inc - exp), "", "tone-gold") +
      statCard("Savings rate", inc > 0 ? pct(rate) : "—", `${rows.length} transactions`, "tone-lav");
    const byCat = {};
    rows.filter((t) => t.amount < 0).forEach((t) => (byCat[t.category] = (byCat[t.category] || 0) + Math.abs(t.amount)));
    const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const top = entries[0] ? entries[0][1] : 1;
    $("#repCats").innerHTML = entries.length
      ? entries
          .map(
            ([c, v]) => `<div><div class="cat-bar-top"><span>${esc(c)}</span><span>${esc(fmt(v))} · ${esc(pct(exp ? (v / exp) * 100 : 0))}</span></div>
            <div class="cat-bar-track"><span style="width:${(v / top) * 100}%"></span></div></div>`
          )
          .join("")
      : `<p class="empty">No expenses in this period.</p>`;
    $("#repBody").innerHTML = rows.length
      ? rows
          .map(
            (t) => `<tr class="clickable" tabindex="0" data-tx="${esc(t.id)}"><td><span class="m-name">${esc(t.merchant)}</span><span class="m-desc">${esc(t.category)}</span></td>
            <td class="num"><span class="amount ${t.amount < 0 ? "neg" : "pos"}">${esc(fmtSigned(t.amount))}</span></td><td class="date-cell">${esc(fmtDate(t.date))}</td></tr>`
          )
          .join("")
      : `<tr><td colspan="3" class="empty">No transactions in this period.</td></tr>`;
  }

  function exportCsv() {
    const rows = reportRows();
    if (!rows) return toast("Fix the date range before exporting.");
    if (!rows.length) return toast("Nothing to export for this period.");
    const cell = (v) => {
      const s = String(v ?? "");
      const safe = /^[=+\-@]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const lines = [["Date", "Merchant", "Description", "Category", "Type", "Amount (INR)", "Method"].map(cell).join(",")];
    rows.forEach((t) => lines.push([t.date, t.merchant, t.description, t.category, t.amount < 0 ? "Expense" : "Income", t.amount, t.method].map(cell).join(",")));
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial-report_${$("#repFrom").value}_to_${$("#repTo").value}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Exported ${rows.length} transactions to CSV.`);
  }

  /* ---------- Settings ---------- */
  const PREF_LABELS = {
    lowBalance: ["Balance & transaction alerts", "Salary credits and low-balance warnings"],
    goalMilestones: ["Goal milestones", "When a goal crosses 25%, 50%, 75% and 100%"],
    weeklyDigest: ["Weekly forecast digest", "A summary of the next 7 days every Monday"],
    dominoAlerts: ["Domino risk alerts", "When an expense could delay a goal"],
  };
  const PAGE_PREF = { transactions: "lowBalance", goals: "goalMilestones", cashflow: "weeklyDigest", domino: "dominoAlerts" };

  function renderSettings() {
    $("#setReserve").value = String(state.settings.minimumReserve);
    $("#setPeriod").value = String(state.settings.forecastDays);
    $("#notifPrefs").innerHTML = Object.entries(PREF_LABELS)
      .map(
        ([k, [title, desc]]) => `<label class="toggle"><span><strong>${esc(title)}</strong><span class="t-desc">${esc(desc)}</span></span>
        <span class="switch"><input type="checkbox" data-pref="${k}" ${state.settings.notifications[k] ? "checked" : ""} /><span class="track"></span></span></label>`
      )
      .join("");
  }

  /* ---------- Notifications ---------- */
  const visibleNotifications = () => state.notifications.filter((n) => state.settings.notifications[PAGE_PREF[n.page]] !== false);

  function renderNotifications() {
    const list = visibleNotifications();
    $("#notifList").innerHTML = list.length
      ? list
          .map(
            (n) => `<li><button class="notif-item ${n.unread ? "is-unread" : ""}" data-notif="${esc(n.id)}"><span class="n-dot"></span>
          <span><strong>${esc(n.title)}</strong><span class="n-body">${esc(n.body)}</span><span class="n-time">${esc(n.time)}</span></span></button></li>`
          )
          .join("")
      : `<li class="result-empty">You're all caught up.</li>`;
    const unread = list.filter((n) => n.unread).length;
    $("#notifDot").hidden = unread === 0;
    $("#notifBtn").setAttribute("aria-label", unread ? `Notifications, ${unread} unread` : "Notifications");
  }

  function pushNotification(page, title, body) {
    state.notifications.unshift({ id: `n${Date.now()}`, title, body, time: "Just now", page, unread: true });
    state.notifications = state.notifications.slice(0, 20);
  }

  /* ---------- Navigation ---------- */
  const PAGES = {
    overview: ["Financial Overview", "Predict the risk. Balance your life. Secure your future."],
    transactions: ["Transactions", "Every rupee in and out — searchable and filterable."],
    health: ["Financial Health", "An illustrative score of how balanced your money is."],
    cashflow: ["Cash Flow", "See where your balance is heading."],
    domino: ["Financial Domino", "One expense, many consequences — simulate the chain."],
    goals: ["Goal Optimizer", "Fund what matters, in the right order."],
    simulator: ["Future Simulator", "Test what-ifs without touching real money."],
    insights: ["Insights", "Patterns spotted in your demo data."],
    reports: ["Reports", "Summaries, category breakdowns and CSV export."],
    settings: ["Settings", "Tune your reserve, forecast and alerts."],
  };
  const PAGE_RENDER = {
    overview: renderOverview,
    transactions: renderTransactionsPage,
    health: renderHealthPage,
    cashflow: renderCashflowPage,
    domino: renderDominoPage,
    goals: renderGoalsPage,
    simulator: renderSimulator,
    insights: renderInsights,
    reports: renderReports,
    settings: renderSettings,
  };

  function goTo(page, { updateHash = true } = {}) {
    if (!PAGES[page]) page = "overview";
    ui.currentPage = page;
    $$(".nav-item").forEach((b) => {
      const active = b.dataset.page === page;
      b.classList.toggle("is-active", active);
      if (active) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    $$(".page").forEach((s) => {
      const active = s.dataset.page === page;
      s.hidden = !active;
      s.classList.toggle("is-active", active);
      if (active) {
        s.classList.remove("is-entering");
        void s.offsetWidth;
        s.classList.add("is-entering");
      }
    });
    $("#main").classList.toggle("is-overview", page === "overview");
    $("#pageTitle").textContent = PAGES[page][0];
    $("#pageSubtitle").textContent = PAGES[page][1];
    document.title = `${PAGES[page][0]} · Financial Flight Simulator`;
    closeDrawer();
    closeAllDropdowns();
    PAGE_RENDER[page]();
    if (updateHash && location.hash !== `#${page}`) history.replaceState(null, "", `#${page}`);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function renderAll() {
    renderNotifications();
    renderReserveLabels();
    if (ui.currentPage !== "overview") renderOverviewSilently();
    PAGE_RENDER[ui.currentPage]();
  }
  function renderOverviewSilently() {
    renderSummary();
    renderRecent();
    renderHealthMini();
    renderDominoMini();
    renderGoalsMini();
  }

  /* ---------- Drawer ---------- */
  function openDrawer() {
    $("#sidebar").classList.add("is-open");
    $("#drawerOverlay").hidden = false;
    $("#menuBtn").setAttribute("aria-expanded", "true");
    $(".nav-item.is-active")?.focus();
  }
  function closeDrawer() {
    if (!$("#sidebar").classList.contains("is-open")) return;
    $("#sidebar").classList.remove("is-open");
    $("#drawerOverlay").hidden = true;
    $("#menuBtn").setAttribute("aria-expanded", "false");
  }

  /* ---------- Dropdowns ---------- */
  function closeAllDropdowns(except) {
    if (except !== "search") {
      $("#searchResults").hidden = true;
      $("#globalSearch").setAttribute("aria-expanded", "false");
    }
    if (except !== "notif") {
      $("#notifPanel").hidden = true;
      $("#notifBtn").setAttribute("aria-expanded", "false");
    }
    if (except !== "menu") {
      $("#healthMenu").hidden = true;
      $("#healthMoreBtn").setAttribute("aria-expanded", "false");
    }
    if (except !== "tip") {
      $("#healthTip").hidden = true;
      $("#healthInfoBtn").setAttribute("aria-expanded", "false");
    }
  }

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 2600);
  }

  /* ---------- Modal ---------- */
  const modal = $("#modal");
  let lastFocus = null;
  function openModal(title, html, onMount) {
    lastFocus = document.activeElement;
    $("#modalTitle").textContent = title;
    $("#modalBody").innerHTML = html;
    if (typeof modal.showModal === "function") modal.showModal();
    else modal.setAttribute("open", "");
    onMount?.($("#modalBody"));
    const first = $("#modalBody input, #modalBody select, #modalBody button");
    first?.focus();
  }
  function closeModal() {
    if (typeof modal.close === "function") modal.close();
    else modal.removeAttribute("open");
  }
  modal.addEventListener("close", () => lastFocus?.focus?.());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  $("#modalClose").addEventListener("click", closeModal);

  const fieldError = (form, name, msg) => {
    const input = form.elements[name];
    const err = form.querySelector(`[data-error-for="${name}"]`);
    if (input) input.setAttribute("aria-invalid", msg ? "true" : "false");
    if (err) {
      err.textContent = msg || "";
      err.hidden = !msg;
    }
    return !msg;
  };

  /* Transaction modal */
  function openAddTransaction() {
    const today = DEMO_DATA.forecast.startDate;
    const expenseCats = DEMO_DATA.categories.filter((c) => c !== "Income");
    openModal(
      "Add Transaction",
      `<form class="form" id="txForm" novalidate>
        <div class="form-row">
          <div class="field"><label for="fType">Type</label><div class="select-wrap"><select class="select" id="fType" name="type"><option value="expense">Expense</option><option value="income">Income</option></select>${icon("chevronDown")}</div></div>
          <div class="field"><label for="fAmount">Amount (₹)</label><input id="fAmount" name="amount" type="number" min="1" step="1" inputmode="numeric" placeholder="e.g. 450" required aria-describedby="eAmount" /><p class="field-error" id="eAmount" data-error-for="amount" hidden></p></div>
        </div>
        <div class="field"><label for="fMerchant">Merchant</label><input id="fMerchant" name="merchant" type="text" maxlength="40" placeholder="e.g. Zomato" required aria-describedby="eMerchant" /><p class="field-error" id="eMerchant" data-error-for="merchant" hidden></p></div>
        <div class="field"><label for="fDesc">Description</label><input id="fDesc" name="description" type="text" maxlength="60" placeholder="Optional" /></div>
        <div class="form-row">
          <div class="field"><label for="fCat">Category</label><div class="select-wrap"><select class="select" id="fCat" name="category">${expenseCats.map((c) => `<option>${esc(c)}</option>`).join("")}</select>${icon("chevronDown")}</div></div>
          <div class="field"><label for="fDate">Date</label><input id="fDate" name="date" type="date" value="${today}" required aria-describedby="eDate" /><p class="field-error" id="eDate" data-error-for="date" hidden></p></div>
        </div>
        <div class="field"><label for="fMethod">Payment method</label><div class="select-wrap"><select class="select" id="fMethod" name="method"><option>UPI</option><option>Debit card</option><option>Credit card</option><option>Net banking</option><option>Bank transfer</option><option>Cash</option></select>${icon("chevronDown")}</div></div>
        <div class="form-actions"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button type="submit" class="btn btn-teal">Save transaction</button></div>
      </form>`,
      (root) => {
        const form = $("#txForm", root);
        const typeSel = form.elements.type;
        const catSel = form.elements.category;
        typeSel.addEventListener("change", () => {
          catSel.innerHTML = (typeSel.value === "income" ? ["Income"] : expenseCats).map((c) => `<option>${esc(c)}</option>`).join("");
        });
        $("[data-close]", form).addEventListener("click", closeModal);
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const merchant = form.elements.merchant.value.trim();
          const amount = toNum(form.elements.amount.value);
          const date = form.elements.date.value;
          const d = parseISO(date);
          let ok = true;
          ok = fieldError(form, "merchant", merchant.length < 2 ? "Enter a merchant name (at least 2 characters)." : "") && ok;
          ok = fieldError(form, "amount", !Number.isFinite(amount) || amount <= 0 ? "Enter an amount greater than ₹0." : amount > 10000000 ? "Amount must be under ₹1,00,00,000." : !Number.isInteger(amount) ? "Use whole rupees only." : "") && ok;
          ok = fieldError(form, "date", !d ? "Choose a valid date." : d.getFullYear() < 2000 || d.getFullYear() > 2100 ? "Date must be between 2000 and 2100." : "") && ok;
          if (!ok) {
            form.querySelector('[aria-invalid="true"]')?.focus();
            return;
          }
          const isIncome = typeSel.value === "income";
          const signed = isIncome ? amount : -amount;
          const tx = {
            id: `t${Date.now()}`,
            merchant,
            description: form.elements.description.value.trim(),
            amount: signed,
            category: isIncome ? "Income" : catSel.value,
            date,
            method: form.elements.method.value,
          };
          state.transactions.push(tx);
          state.account.availableBalance += signed;
          if (state.account.availableBalance < state.settings.minimumReserve) {
            pushNotification("transactions", "Low balance warning", `Your balance (${fmt(state.account.availableBalance)}) is below your minimum reserve.`);
          }
          saveState();
          closeModal();
          renderAll();
          toast(`${isIncome ? "Income" : "Expense"} of ${fmt(amount)} added.`);
        });
      }
    );
  }

  function openTxDetail(id) {
    const t = state.transactions.find((x) => x.id === id);
    if (!t) return toast("That transaction no longer exists.");
    openModal(
      "Transaction Details",
      `<div class="merchant"><span class="m-icon mi-${esc(t.category)}">${icon(CATEGORY_ICON[t.category] || "wallet2")}</span><span><span class="m-name">${esc(t.merchant)}</span><span class="m-desc">${esc(t.description || "—")}</span></span></div>
      <p class="detail-amount amount ${t.amount < 0 ? "neg" : "pos"}">${esc(fmtSigned(t.amount))}</p>
      <dl class="detail-list"><dt>Category</dt><dd><span class="cat cat-${esc(t.category)}">${esc(t.category)}</span></dd><dt>Date</dt><dd>${esc(fmtDate(t.date))}</dd>
      <dt>Type</dt><dd>${t.amount < 0 ? "Expense" : "Income"}</dd><dt>Payment method</dt><dd>${esc(t.method || "—")}</dd><dt>Reference</dt><dd>${esc(t.id.toUpperCase())}</dd></dl>
      <div class="form-actions"><button class="btn btn-danger-ghost spacer" id="delTx">${icon("trash")} Delete</button><button class="btn btn-teal" data-close>Close</button></div>`,
      (root) => {
        $("[data-close]", root).addEventListener("click", closeModal);
        const del = $("#delTx", root);
        del.addEventListener("click", () => {
          if (del.dataset.confirm !== "1") {
            del.dataset.confirm = "1";
            del.innerHTML = `${icon("trash")} Confirm delete`;
            return;
          }
          state.transactions = state.transactions.filter((x) => x.id !== id);
          state.account.availableBalance -= t.amount;
          saveState();
          closeModal();
          renderAll();
          toast("Transaction deleted.");
        });
      }
    );
  }

  /* Goal modal */
  function openGoalModal(id) {
    const g = id ? state.goals.find((x) => x.id === id) : null;
    if (id && !g) return toast("That goal no longer exists.");
    openModal(
      g ? "Edit Goal" : "Add Goal",
      `<form class="form" id="goalForm" novalidate>
        <div class="field"><label for="gName">Goal name</label><input id="gName" name="name" type="text" maxlength="40" value="${esc(g ? g.name : "")}" placeholder="e.g. Goa trip" required aria-describedby="egName" /><p class="field-error" id="egName" data-error-for="name" hidden></p></div>
        <div class="form-row">
          <div class="field"><label for="gCurrent">Saved so far (₹)</label><input id="gCurrent" name="current" type="number" min="0" step="1" inputmode="numeric" value="${g ? g.current : 0}" aria-describedby="egCurrent" /><p class="field-error" id="egCurrent" data-error-for="current" hidden></p></div>
          <div class="field"><label for="gTarget">Target (₹)</label><input id="gTarget" name="target" type="number" min="1" step="1" inputmode="numeric" value="${g ? g.target : ""}" placeholder="e.g. 25000" aria-describedby="egTarget" /><p class="field-error" id="egTarget" data-error-for="target" hidden></p></div>
        </div>
        <div class="field"><label for="gIcon">Icon</label><div class="select-wrap"><select class="select" id="gIcon" name="icon">${Object.entries(GOAL_ICONS)
          .map(([k, v]) => `<option value="${k}" ${g && g.icon === k ? "selected" : ""}>${esc(v)}</option>`)
          .join("")}</select>${icon("chevronDown")}</div></div>
        <div class="field"><span class="label">Progress preview <output id="gPreviewPct">0%</output></span><div class="progress"><span class="bar-green" id="gPreview" style="width:0%"></span></div></div>
        <div class="form-actions">${g ? `<button type="button" class="btn btn-danger-ghost spacer" id="delGoal">${icon("trash")} Delete</button>` : ""}<button type="button" class="btn btn-ghost" data-close>Cancel</button><button type="submit" class="btn btn-teal">${g ? "Save changes" : "Add goal"}</button></div>
      </form>`,
      (root) => {
        const form = $("#goalForm", root);
        const preview = () => {
          const c = toNum(form.elements.current.value, 0);
          const t = toNum(form.elements.target.value, 0);
          const p = t > 0 ? clamp((c / t) * 100, 0, 100) : 0;
          $("#gPreview", form).style.width = `${p}%`;
          $("#gPreviewPct", form).textContent = `${Math.round(p)}%`;
        };
        form.addEventListener("input", preview);
        preview();
        $("[data-close]", form).addEventListener("click", closeModal);
        const del = $("#delGoal", form);
        del?.addEventListener("click", () => {
          if (del.dataset.confirm !== "1") {
            del.dataset.confirm = "1";
            del.innerHTML = `${icon("trash")} Confirm delete`;
            return;
          }
          state.goals = state.goals.filter((x) => x.id !== id);
          saveState();
          closeModal();
          renderAll();
          toast("Goal deleted.");
        });
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const name = form.elements.name.value.trim();
          const current = toNum(form.elements.current.value, NaN);
          const target = toNum(form.elements.target.value, NaN);
          let ok = true;
          ok = fieldError(form, "name", name.length < 2 ? "Give the goal a name (at least 2 characters)." : state.goals.some((x) => x.name.toLowerCase() === name.toLowerCase() && x.id !== id) ? "A goal with this name already exists." : "") && ok;
          ok = fieldError(form, "target", !Number.isFinite(target) || target <= 0 ? "Target must be greater than ₹0." : target > 100000000 ? "Target is too large." : "") && ok;
          ok = fieldError(form, "current", !Number.isFinite(current) || current < 0 ? "Saved amount can't be negative." : Number.isFinite(target) && current > target ? "Saved amount can't exceed the target." : "") && ok;
          if (!ok) {
            form.querySelector('[aria-invalid="true"]')?.focus();
            return;
          }
          const prevPct = g ? goalPct(g) : 0;
          if (g) Object.assign(g, { name, current: Math.round(current), target: Math.round(target), icon: form.elements.icon.value });
          else state.goals.push({ id: `g${Date.now()}`, name, current: Math.round(current), target: Math.round(target), icon: form.elements.icon.value, tone: "" });
          const newPct = clamp((current / target) * 100, 0, 100);
          const milestone = [100, 75, 50, 25].find((m) => prevPct < m && newPct >= m);
          if (milestone) pushNotification("goals", `${name} at ${milestone}%`, `You've reached ${milestone}% of your ${fmt(target)} target.`);
          saveState();
          closeModal();
          renderAll();
          toast(g ? "Goal updated." : "Goal added.");
        });
      }
    );
  }

  function contributeGoal(id, amount) {
    const g = state.goals.find((x) => x.id === id);
    if (!g) return;
    const prev = goalPct(g);
    g.current = Math.min(g.target, g.current + amount);
    const now = goalPct(g);
    const milestone = [100, 75, 50, 25].find((m) => prev < m && now >= m);
    if (milestone) pushNotification("goals", `${g.name} at ${milestone}%`, `You've reached ${milestone}% of your ${fmt(g.target)} target.`);
    saveState();
    renderAll();
    toast(`${fmt(amount)} added to ${g.name}.`);
  }

  /* ---------- Global search ---------- */
  let searchItems = [];
  let searchFocus = -1;
  const highlight = (text, q) => {
    const safe = esc(text);
    if (!q) return safe;
    const i = text.toLowerCase().indexOf(q);
    if (i < 0) return safe;
    return `${esc(text.slice(0, i))}<mark>${esc(text.slice(i, i + q.length))}</mark>${esc(text.slice(i + q.length))}`;
  };

  function runSearch() {
    const input = $("#globalSearch");
    const box = $("#searchResults");
    const q = input.value.trim().toLowerCase();
    if (!q) {
      box.hidden = true;
      input.setAttribute("aria-expanded", "false");
      return;
    }
    const tx = sortedTx()
      .filter((t) => `${t.merchant} ${t.description} ${t.category}`.toLowerCase().includes(q))
      .slice(0, 5)
      .map((t) => ({ type: "tx", id: t.id, title: t.merchant, sub: `${fmtSigned(t.amount)} · ${t.category} · ${fmtDate(t.date)}`, icon: CATEGORY_ICON[t.category] || "wallet2" }));
    const goals = state.goals
      .filter((g) => g.name.toLowerCase().includes(q))
      .slice(0, 4)
      .map((g) => ({ type: "goal", id: g.id, title: g.name, sub: `${fmt(g.current)} / ${fmt(g.target)} · ${Math.round(goalPct(g))}%`, icon: g.icon }));
    const insights = DEMO_DATA.insights
      .filter((i) => `${i.title} ${i.explanation}`.toLowerCase().includes(q))
      .slice(0, 4)
      .map((i) => ({ type: "insight", id: i.id, title: i.title, sub: i.explanation, icon: "sparkles" }));
    const pages = Object.entries(PAGES)
      .filter(([, [t]]) => t.toLowerCase().includes(q))
      .map(([k, [t, s]]) => ({ type: "page", id: k, title: t, sub: s, icon: "arrowRight" }));
    searchItems = [...tx, ...goals, ...insights, ...pages];
    searchFocus = -1;
    const group = (label, items) =>
      items.length
        ? `<div class="result-group">${label}</div>${items
            .map(
              (it) => `<button type="button" role="option" class="result-item" data-idx="${searchItems.indexOf(it)}">${icon(it.icon)}<span class="r-main"><span class="r-title">${highlight(it.title, q)}</span><span class="r-sub">${esc(it.sub)}</span></span></button>`
            )
            .join("")}`
        : "";
    box.innerHTML = searchItems.length
      ? group("Transactions", tx) + group("Goals", goals) + group("Insights", insights) + group("Pages", pages)
      : `<p class="result-empty">No results for “${esc(input.value.trim())}”.</p>`;
    closeAllDropdowns("search");
    box.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }

  function selectSearchItem(idx) {
    const it = searchItems[idx];
    if (!it) return;
    $("#globalSearch").value = "";
    $("#searchResults").hidden = true;
    if (it.type === "tx") {
      goTo("transactions");
      openTxDetail(it.id);
    } else if (it.type === "goal") {
      goTo("goals");
      openGoalModal(it.id);
    } else if (it.type === "insight") {
      goTo("insights");
      const card = document.getElementById(`insight-${it.id}`);
      card?.scrollIntoView({ behavior: "smooth", block: "center" });
      card?.animate?.([{ boxShadow: "0 0 0 4px rgba(217,180,91,.8)" }, { boxShadow: "0 0 0 0 rgba(217,180,91,0)" }], { duration: 1400 });
    } else goTo(it.id);
  }

  /* ---------- Events ---------- */
  function bindEvents() {
    $("#navList").addEventListener("click", (e) => {
      const b = e.target.closest(".nav-item");
      if (b) goTo(b.dataset.page);
    });

    document.addEventListener("click", (e) => {
      const go = e.target.closest("[data-goto]");
      if (go) {
        goTo(go.dataset.goto);
        return;
      }
      const editGoal = e.target.closest("[data-edit-goal]");
      if (editGoal) return openGoalModal(editGoal.dataset.editGoal);
      const contrib = e.target.closest("[data-contribute-goal]");
      if (contrib) return contributeGoal(contrib.dataset.contributeGoal, 1000);
      const row = e.target.closest("tr[data-tx]");
      if (row) return openTxDetail(row.dataset.tx);

      if (!e.target.closest("#searchWrap")) {
        $("#searchResults").hidden = true;
        $("#globalSearch").setAttribute("aria-expanded", "false");
      }
      if (!e.target.closest("#notifWrap")) {
        $("#notifPanel").hidden = true;
        $("#notifBtn").setAttribute("aria-expanded", "false");
      }
      if (!e.target.closest(".more")) {
        $("#healthMenu").hidden = true;
        $("#healthMoreBtn").setAttribute("aria-expanded", "false");
      }
      if (!e.target.closest(".tip")) {
        $("#healthTip").hidden = true;
        $("#healthInfoBtn").setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeAllDropdowns();
        closeDrawer();
      }
      if ((e.key === "Enter" || e.key === " ") && e.target.matches("tr[data-tx]")) {
        e.preventDefault();
        openTxDetail(e.target.dataset.tx);
      }
    });

    $("#menuBtn").addEventListener("click", openDrawer);
    $("#drawerOverlay").addEventListener("click", closeDrawer);

    // Search
    const search = $("#globalSearch");
    search.addEventListener("input", debounce(runSearch, 120));
    search.addEventListener("focus", () => search.value.trim() && runSearch());
    search.addEventListener("keydown", (e) => {
      const items = $$(".result-item", $("#searchResults"));
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (!items.length) return;
        e.preventDefault();
        searchFocus = (searchFocus + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        items.forEach((el, i) => el.classList.toggle("is-focused", i === searchFocus));
        items[searchFocus].scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        if (e.isComposing || e.keyCode === 229) return;
        e.preventDefault();
        const idx = searchFocus >= 0 ? Number(items[searchFocus]?.dataset.idx) : items.length ? Number(items[0].dataset.idx) : -1;
        if (idx >= 0) selectSearchItem(idx);
      }
    });
    $("#searchResults").addEventListener("click", (e) => {
      const it = e.target.closest(".result-item");
      if (it) selectSearchItem(Number(it.dataset.idx));
    });

    // Notifications
    $("#notifBtn").addEventListener("click", () => {
      const panel = $("#notifPanel");
      const open = panel.hidden;
      closeAllDropdowns("notif");
      panel.hidden = !open;
      $("#notifBtn").setAttribute("aria-expanded", String(open));
    });
    $("#notifList").addEventListener("click", (e) => {
      const b = e.target.closest("[data-notif]");
      if (!b) return;
      const n = state.notifications.find((x) => x.id === b.dataset.notif);
      if (!n) return;
      n.unread = false;
      saveState();
      renderNotifications();
      goTo(n.page);
    });
    $("#markAllRead").addEventListener("click", () => {
      state.notifications.forEach((n) => (n.unread = false));
      saveState();
      renderNotifications();
    });

    // Health card tooltip & menu
    const tipBtn = $("#healthInfoBtn");
    const tip = $("#healthTip");
    const setTip = (open) => {
      tip.hidden = !open;
      tipBtn.setAttribute("aria-expanded", String(open));
    };
    tipBtn.addEventListener("click", () => setTip(tip.hidden));
    tipBtn.addEventListener("mouseenter", () => setTip(true));
    tipBtn.addEventListener("mouseleave", () => setTip(false));
    tipBtn.addEventListener("focus", () => setTip(true));
    tipBtn.addEventListener("blur", () => setTip(false));
    $("#healthMoreBtn").addEventListener("click", () => {
      const m = $("#healthMenu");
      const open = m.hidden;
      closeAllDropdowns("menu");
      m.hidden = !open;
      $("#healthMoreBtn").setAttribute("aria-expanded", String(open));
    });

    // Domino card
    const dCard = $("#dominoCard");
    dCard.addEventListener("click", () => goTo("domino"));
    dCard.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        goTo("domino");
      }
    });

    // Forecast periods
    $("#overviewPeriod").addEventListener("change", (e) => {
      ui.overviewPeriod = toNum(e.target.value, 7);
      renderOverviewChart();
    });
    $("#cfPeriod").addEventListener("change", (e) => {
      ui.cfPeriod = toNum(e.target.value, 7);
      renderCashflowPage();
    });

    // Transactions page
    $("#txSearch").addEventListener("input", debounce((e) => {
      ui.txSearch = e.target.value;
      renderTransactionsPage();
    }, 120));
    $("#txType").addEventListener("change", (e) => {
      ui.txType = e.target.value;
      renderTransactionsPage();
    });
    $("#txChips").addEventListener("click", (e) => {
      const c = e.target.closest("[data-cat]");
      if (!c) return;
      ui.txCategory = c.dataset.cat;
      renderTransactionsPage();
    });
    $("#addTxBtn").addEventListener("click", openAddTransaction);

    // Domino page
    const dAmount = $("#dominoAmount");
    const applyDominoAmount = () => {
      const v = toNum(dAmount.value);
      const err = $("#dominoError");
      if (!Number.isFinite(v) || v < 0 || v > 500000) {
        err.textContent = "Enter an amount between ₹0 and ₹5,00,000.";
        err.hidden = false;
        dAmount.setAttribute("aria-invalid", "true");
        return;
      }
      err.hidden = true;
      dAmount.setAttribute("aria-invalid", "false");
      domino.amount = Math.round(v);
      updateDominoResults();
    };
    dAmount.addEventListener("input", applyDominoAmount);
    $("#dominoEvent").addEventListener("input", (e) => {
      domino.event = e.target.value.trim() || "Unexpected expense";
      updateDominoResults();
    });
    $("#dominoGoal").addEventListener("change", (e) => {
      domino.goalId = e.target.value;
      updateDominoResults();
    });
    $("#dominoPresets").addEventListener("click", (e) => {
      const b = e.target.closest("[data-amount]");
      if (!b) return;
      domino.event = b.dataset.event;
      domino.amount = toNum(b.dataset.amount, 5000);
      $("#dominoEvent").value = domino.event;
      dAmount.value = String(domino.amount);
      applyDominoAmount();
    });
    $("#dominoForm").addEventListener("submit", (e) => e.preventDefault());

    // Goals page
    $("#addGoalBtn").addEventListener("click", () => openGoalModal(null));
    $("#goalContribution").addEventListener("input", debounce((e) => {
      const v = toNum(e.target.value);
      if (!Number.isFinite(v) || v < 0) {
        e.target.setAttribute("aria-invalid", "true");
        return;
      }
      e.target.setAttribute("aria-invalid", "false");
      state.goalContribution = Math.round(v);
      saveState();
      renderGoalsPage();
      renderGoalsMini();
      renderDominoMini();
    }, 150));

    // Simulator
    const simForm = $("#simForm");
    simForm.addEventListener("input", () => {
      scenario.income = clamp(toNum($("#simIncome").value, 0), -50, 50);
      scenario.expense = Math.max(0, toNum($("#simExpense").value, 0));
      scenario.rent = Math.max(0, toNum($("#simRent").value, 0));
      scenario.savings = clamp(toNum($("#simSavings").value, 0), -16, 30);
      scenario.horizon = toNum($("#simHorizon").value, 6);
      renderSimulator();
    });
    simForm.addEventListener("change", () => simForm.dispatchEvent(new Event("input")));
    simForm.addEventListener("submit", (e) => e.preventDefault());
    $("#simReset").addEventListener("click", () => {
      Object.assign(scenario, { income: 0, expense: 0, rent: 0, savings: 0, horizon: 6 });
      $("#simIncome").value = "0";
      $("#simExpense").value = "0";
      $("#simRent").value = "0";
      $("#simSavings").value = "0";
      $("#simHorizon").value = "6";
      renderSimulator();
    });

    // Reports
    $("#reportFilters").addEventListener("input", renderReports);
    $("#reportFilters").addEventListener("change", renderReports);
    $("#reportFilters").addEventListener("submit", (e) => e.preventDefault());
    $("#exportCsv").addEventListener("click", exportCsv);

    // Settings
    $("#settingsForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const input = $("#setReserve");
      const v = toNum(input.value);
      const err = $("#setReserveError");
      if (!Number.isFinite(v) || v < 0 || v > 1000000) {
        err.textContent = "Enter a reserve between ₹0 and ₹10,00,000.";
        err.hidden = false;
        input.setAttribute("aria-invalid", "true");
        input.focus();
        return;
      }
      err.hidden = true;
      input.setAttribute("aria-invalid", "false");
      state.settings.minimumReserve = Math.round(v);
      state.settings.forecastDays = toNum($("#setPeriod").value, 7);
      ui.overviewPeriod = state.settings.forecastDays;
      ui.cfPeriod = state.settings.forecastDays;
      saveState();
      renderReserveLabels();
      toast("Settings saved.");
    });
    $("#notifPrefs").addEventListener("change", (e) => {
      const k = e.target.dataset.pref;
      if (!k) return;
      state.settings.notifications[k] = e.target.checked;
      saveState();
      renderNotifications();
      toast(`${PREF_LABELS[k][0]} ${e.target.checked ? "on" : "off"}.`);
    });
    $("#resetData").addEventListener("click", () => {
      openModal(
        "Clear local cache?",
        `<p class="card-sub">This will clear local cache and re-sync your latest transactions from the database.</p>
        <div class="form-actions" style="margin-top:18px"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-danger" id="confirmReset">Clear cache</button></div>`,
        (root) => {
          $("[data-close]", root).addEventListener("click", closeModal);
          $("#confirmReset", root).addEventListener("click", () => {
            try {
              localStorage.removeItem(STORAGE_KEY);
            } catch {
              /* ignore */
            }
            state = emptyState();
            ui.overviewPeriod = state.settings.forecastDays;
            ui.cfPeriod = state.settings.forecastDays;
            domino.goalId = null;
            closeModal();
            loadStateFromAPI();
            toast("Cache cleared. Re-syncing with database.");
          });
        }
      );
    });

    // Logout
    document.getElementById("logoutBtn").addEventListener("click", async () => {
      try {
        await apiFetch("/auth/logout", { method: "POST" });
      } catch (e) {
        /* ignore */
      }
      localStorage.removeItem("ffs_token");
      localStorage.removeItem("ffs-state-v1");
      sessionStorage.clear();
      sessionStorage.setItem("logout_message", "You have been successfully and securely logged out.");
      window.location.replace("/login%20page/public/index.html?logged_out=1");
    });

    window.addEventListener("hashchange", () => {
      const p = location.hash.slice(1);
      if (PAGES[p] && p !== ui.currentPage) goTo(p, { updateHash: false });
    });
    window.matchMedia("(min-width: 961px)").addEventListener?.("change", (m) => m.matches && closeDrawer());
  }

  /* ---------- Init ---------- */
  function init() {
    hydrateIcons();
    $("#userName").textContent = state.user?.name || "User";
    bindEvents();
    renderNotifications();
    renderReserveLabels();
    renderOverviewSilently();
    const start = location.hash.slice(1);
    goTo(PAGES[start] ? start : "overview", { updateHash: false });
  }

  init();

  // CSV Import Logic (Enhanced)
  const uploadCsvBtn = document.getElementById("uploadCsvBtn");
  const importModal = document.getElementById("importModal");
  const importFileInput = document.getElementById("importFileInput");
  const dropZone = document.getElementById("dropZone");
  const importFileDetails = document.getElementById("importFileDetails");
  const importFileName = document.getElementById("importFileName");
  const importFileSize = document.getElementById("importFileSize");
  const importClearBtn = document.getElementById("importClearBtn");
  const importCancelBtn = document.getElementById("importCancelBtn");
  const importProcessBtn = document.getElementById("importProcessBtn");
  
  const csvPreviewModal = document.getElementById("csvPreviewModal");
  const csvCancelBtn = document.getElementById("csvCancelBtn");
  const csvConfirmBtn = document.getElementById("csvConfirmBtn");
  const csvPreviewStats = document.getElementById("csvPreviewStats");
  const csvPreviewTableBody = document.querySelector("#csvPreviewTable tbody");
  
  const previewValidCount = document.getElementById("previewValidCount");
  const previewDupCount = document.getElementById("previewDupCount");
  const previewIncome = document.getElementById("previewIncome");
  const previewExpense = document.getElementById("previewExpense");
  const selectAllTx = document.getElementById("selectAllTx");
  const previewPagination = document.getElementById("previewPagination");
  
  let currentImportId = null;
  let selectedFile = null;
  
  let previewData = [];
  let excludedIndices = new Set();
  
  if (uploadCsvBtn) {
    uploadCsvBtn.addEventListener("click", () => {
      resetImportModal();
      importModal.showModal();
    });
    
    function resetImportModal() {
      selectedFile = null;
      importFileInput.value = "";
      dropZone.style.display = "block";
      importFileDetails.style.display = "none";
      importProcessBtn.disabled = true;
      importProcessBtn.textContent = "Process File";
    }

    dropZone.addEventListener("click", () => importFileInput.click());
    dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.style.background = "var(--b-200)"; });
    dropZone.addEventListener("dragleave", (e) => { e.preventDefault(); dropZone.style.background = "transparent"; });
    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.style.background = "transparent";
      if (e.dataTransfer.files.length) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });
    importFileInput.addEventListener("change", (e) => {
      if (e.target.files.length) handleFileSelect(e.target.files[0]);
    });
    importClearBtn.addEventListener("click", resetImportModal);
    importCancelBtn.addEventListener("click", () => importModal.close());
    
    function handleFileSelect(file) {
      if (!file) return;
      selectedFile = file;
      dropZone.style.display = "none";
      importFileDetails.style.display = "block";
      importFileName.textContent = file.name;
      importFileSize.textContent = (file.size / 1024).toFixed(1) + " KB";
      importProcessBtn.disabled = false;
    }

    importProcessBtn.addEventListener("click", async () => {
      if (!selectedFile) return;
      const formData = new FormData();
      formData.append("file", selectedFile);
      
      importProcessBtn.disabled = true;
      importProcessBtn.innerHTML = `<span class="icon" data-icon="activity"></span> Processing...`;
      hydrateIcons(importProcessBtn);
      
      try {
        const token = localStorage.getItem("ffs_token");
        const headers = { "Authorization": `Bearer ${token}` };
        const res = await fetch(API_BASE + "/transactions/import/preview", {
          method: "POST",
          headers: headers,
          body: formData
        });
        
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Preview failed: ${res.status}`);
        }
        
        const data = await res.json();
        currentImportId = data.import_id;
        previewData = data.preview || [];
        excludedIndices.clear();
        
        importModal.close();
        
        previewDupCount.textContent = data.duplicate_rows;
        
        renderPreview();
        csvPreviewModal.showModal();
        
      } catch(err) {
        toast("Failed to process file: " + err.message);
      } finally {
        importProcessBtn.disabled = false;
        importProcessBtn.textContent = "Process File";
      }
    });

    csvCancelBtn.addEventListener("click", () => {
      csvPreviewModal.close();
      currentImportId = null;
      previewData = [];
    });
    
    selectAllTx.addEventListener("change", (e) => {
      if (e.target.checked) {
        excludedIndices.clear();
      } else {
        previewData.forEach((_, i) => excludedIndices.add(i));
      }
      renderPreviewRows();
      updatePreviewStats();
    });

    function renderPreview() {
      renderPreviewRows();
      updatePreviewStats();
    }
    
    function updatePreviewStats() {
      let income = 0;
      let expense = 0;
      let valid = 0;
      
      previewData.forEach((tx, i) => {
        if (!excludedIndices.has(i)) {
          valid++;
          if (tx.transaction_type === "income") income += tx.amount;
          else expense += tx.amount;
        }
      });
      
      previewValidCount.textContent = valid;
      previewIncome.textContent = fmt(income);
      previewExpense.textContent = fmt(expense);
      csvPreviewStats.textContent = `Found ${previewData.length} valid transactions in file.`;
    }
    
    function renderPreviewRows() {
      csvPreviewTableBody.innerHTML = previewData.map((tx, i) => {
        const checked = !excludedIndices.has(i) ? "checked" : "";
        const tone = tx.transaction_type === 'income' ? 'tone-green' : '';
        return `
          <tr class="${!checked ? 'opacity-50' : ''}">
            <td><input type="checkbox" class="tx-row-check" data-idx="${i}" ${checked}></td>
            <td><input type="text" class="edit-input tx-date" value="${tx.transaction_date}" data-idx="${i}" style="width:100px;"></td>
            <td><input type="text" class="edit-input tx-merchant" value="${esc(tx.merchant)}" data-idx="${i}" style="width:100%;"></td>
            <td class="num ${tone}"><input type="number" class="edit-input tx-amount" value="${tx.amount}" step="0.01" data-idx="${i}" style="width:80px;"></td>
            <td>
              <select class="edit-input tx-type" data-idx="${i}">
                <option value="expense" ${tx.transaction_type==='expense'?'selected':''}>Expense</option>
                <option value="income" ${tx.transaction_type==='income'?'selected':''}>Income</option>
              </select>
            </td>
            <td><input type="text" class="edit-input tx-cat" value="${esc(tx.category_id)}" data-idx="${i}" style="width:100px;"></td>
            <td>${esc(tx.source || 'CSV')}</td>
            <td>Ready</td>
          </tr>
        `;
      }).join("");
      
      document.querySelectorAll(".tx-row-check").forEach(cb => {
        cb.addEventListener("change", (e) => {
          const idx = parseInt(e.target.dataset.idx);
          if (e.target.checked) excludedIndices.delete(idx);
          else excludedIndices.add(idx);
          e.target.closest("tr").classList.toggle("opacity-50", !e.target.checked);
          updatePreviewStats();
        });
      });
      
      document.querySelectorAll(".edit-input").forEach(inp => {
        inp.addEventListener("change", (e) => {
          const idx = parseInt(e.target.dataset.idx);
          const val = e.target.value;
          if (e.target.classList.contains("tx-date")) previewData[idx].transaction_date = val;
          if (e.target.classList.contains("tx-merchant")) previewData[idx].merchant = val;
          if (e.target.classList.contains("tx-amount")) previewData[idx].amount = parseFloat(val) || 0;
          if (e.target.classList.contains("tx-type")) previewData[idx].transaction_type = val;
          if (e.target.classList.contains("tx-cat")) previewData[idx].category_id = val;
          updatePreviewStats();
        });
      });
    }

    csvConfirmBtn.addEventListener("click", async () => {
      if (!currentImportId) return;
      csvConfirmBtn.disabled = true;
      csvConfirmBtn.innerHTML = `<span class="icon" data-icon="activity"></span> Importing...`;
      hydrateIcons(csvConfirmBtn);
      
      try {
        const token = localStorage.getItem("ffs_token");
        const headers = { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        };
        
        const res = await fetch(API_BASE + "/transactions/import/confirm", {
          method: "POST",
          headers: headers,
          body: JSON.stringify({
            import_id: currentImportId,
            excluded_indices: Array.from(excludedIndices)
          })
        });
        
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Confirm failed: ${res.status}`);
        }
        
        const data = await res.json();
        toast(`Import successful! Added ${data.imported_count} records (Skipped ${data.skipped_count}).`);
        csvPreviewModal.close();
        
        // Wait to fetch dashboard overview to refresh calculations.
        await loadStateFromAPI();
        goTo("transactions"); // Ensure we navigate back to transactions tab to see them
        
      } catch(err) {
        toast("Failed to confirm import: " + err.message);
      } finally {
        csvConfirmBtn.disabled = false;
        csvConfirmBtn.textContent = "Confirm Import";
      }
    });
  }
})();
