/* app.js (FULL FILE, UPDATED) */

import { LESSONS, STICKER_SCENES, STICKERS } from "./lessons.js";

/* ---------------- Storage keys ---------------- */
/* Rename if you want a clean break from older saves */
const STORAGE_KEY = "english-kiddo-v1";
const PARENT_KEY = "english-kiddo-parent-session";
const PARENT_UNLOCK_MS = 10 * 60 * 1000;

/* ---------------- Image + asset caching ---------------- */
const IMG_CACHE = new Map();

function preloadImage(src) {
    if (!src) return Promise.resolve(null);
    if (IMG_CACHE.has(src)) return IMG_CACHE.get(src);

    const img = new Image();
    img.decoding = "async";

    const p = new Promise((resolve) => {
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
    });

    img.src = src;
    IMG_CACHE.set(src, p);
    return p;
}

function preloadLessonAssets(lesson) {
    if (!lesson) return;
    if (lesson.type === "vocab") {
        for (const it of lesson.items || []) preloadImage(it.image);
    }
}

function preloadStickerAssets() {
    for (const s of STICKERS) preloadImage(s.image);
    for (const sc of STICKER_SCENES) preloadImage(sc.image);
}

/* ---------------- Service worker registration ---------------- */
async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    try {
        await navigator.serviceWorker.register("./sw.js", { scope: "./" });
    } catch {
        /* ignore */
    }
}

/* ---------------- Time helpers ---------------- */
function nowTs() {
    return Date.now();
}

function todayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

/* ---------------- State ---------------- */
function defaultState() {
    return {
        settings: {
            theme: "day",
            accent: "sunset",
            voiceMode: "us",
            fontSize: "normal",
        },
        coins: 0,
        streak: { lastDay: null, count: 0 },
        progress: { words: {} },
        stickerBook: { placements: {} },
        lastSession: null,
    };
}

function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    try {
        const parsed = JSON.parse(raw);
        const base = defaultState();
        return {
            ...base,
            ...parsed,
            settings: { ...base.settings, ...(parsed.settings || {}) },
        };
    } catch {
        return defaultState();
    }
}

let state = loadState();

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function applyTheme() {
    const el = document.documentElement;
    el.dataset.theme = state.settings.theme;
    el.dataset.accent = state.settings.accent;
    el.dataset.font = state.settings.fontSize;
}

applyTheme();

const app = document.querySelector("#app");

/* ---------------- Parent gate ---------------- */
function parentUnlockUntil() {
    const raw = sessionStorage.getItem(PARENT_KEY);
    if (!raw) return 0;
    const t = Number(raw);
    return Number.isFinite(t) ? t : 0;
}

function canAccessParent() {
    return parentUnlockUntil() > nowTs();
}

function requireParent(onSuccess) {
    if (canAccessParent()) {
        onSuccess();
        return;
    }
    openParentGate(onSuccess);
}

function openParentGate(onSuccess) {
    const modal = document.createElement("div");
    modal.className = "modal-backdrop";

    const a = 11 + Math.floor(Math.random() * 19);
    const b = 7 + Math.floor(Math.random() * 19);
    const answer = a + b;

    const phrases = ["PARENT ONLY", "SETTINGS UNLOCK", "I AM THE ADULT"];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];

    modal.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="Parent access">
      <div class="game-head">
        <h2 class="section-title" style="margin:0;">Parent access</h2>
        <button class="btn" id="close" type="button">Close</button>
      </div>

      <p style="margin: 10px 0 12px 0; color: var(--muted);">
        Solve both checks to unlock settings and reset.
      </p>

      <div class="pill" style="width: 100%; justify-content: space-between; align-items: center;">
        <span>Math: ${a} + ${b}</span>
        <input
          id="ans1"
          type="text"
          inputmode="numeric"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          placeholder="Answer"
          style="width: 120px;"
        />
      </div>

      <div style="height: 10px;"></div>

      <div class="pill" style="width: 100%; justify-content: space-between; align-items: center;">
        <span>Type exactly</span>
        <div style="display:flex; gap:10px; align-items:center;">
          <span class="tag" style="user-select:text;">${phrase}</span>
          <input
            id="ans2"
            type="text"
            autocomplete="off"
            autocapitalize="characters"
            spellcheck="false"
            placeholder="Type it"
            style="width: 200px;"
          />
        </div>
      </div>

      <div class="row" style="margin-top: 12px;">
        <button class="btn primary" id="ok" type="button">Unlock</button>
      </div>

      <div class="tag" id="msg" style="margin-top: 10px;"></div>
    </div>
  `;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector("#close").onclick = close;

    const ans1El = modal.querySelector("#ans1");
    const ans2El = modal.querySelector("#ans2");
    const msg = modal.querySelector("#msg");

    ans1El.addEventListener("input", () => {
        ans1El.value = ans1El.value.replace(/[^\d]/g, "");
    });

    function tryUnlock() {
        const v1 = Number(ans1El.value);
        const v2 = (ans2El.value || "").trim();

        if (v1 !== answer) {
            msg.textContent = "Math is not correct.";
            ans1El.focus();
            return;
        }
        if (v2 !== phrase) {
            msg.textContent = "Phrase does not match exactly.";
            ans2El.focus();
            return;
        }

        sessionStorage.setItem(PARENT_KEY, String(nowTs() + PARENT_UNLOCK_MS));
        close();
        onSuccess();
    }

    modal.querySelector("#ok").onclick = tryUnlock;

    modal.addEventListener("keydown", (e) => {
        if (e.key === "Enter") tryUnlock();
        if (e.key === "Escape") close();
    });

    setTimeout(() => ans1El.focus(), 30);
}

/* ---------------- Streak + spaced repetition ---------------- */
function setStreak() {
    const tk = todayKey();
    if (state.streak.lastDay === tk) return;

    if (!state.streak.lastDay) {
        state.streak.lastDay = tk;
        state.streak.count = 1;
        return;
    }

    const prev = new Date(state.streak.lastDay + "T00:00:00");
    const now = new Date(tk + "T00:00:00");
    const diffDays = Math.round((now - prev) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) state.streak.count += 1;
    else state.streak.count = 1;

    state.streak.lastDay = tk;
}

function wordMeta(wordId) {
    if (!state.progress.words[wordId]) {
        state.progress.words[wordId] = {
            seen: 0,
            correct: 0,
            wrong: 0,
            nextDueTs: 0,
            lastSeenTs: 0,
            ease: 2.0,
        };
    }
    return state.progress.words[wordId];
}

function scheduleNext(wordId, wasCorrect) {
    const meta = wordMeta(wordId);
    meta.seen += 1;
    meta.lastSeenTs = nowTs();

    if (wasCorrect) meta.correct += 1;
    else meta.wrong += 1;

    const now = nowTs();
    const ease = meta.ease;

    if (!wasCorrect) {
        meta.ease = Math.max(1.3, ease - 0.18);
        meta.nextDueTs = now + 10 * 60 * 1000;
        return;
    }

    meta.ease = Math.min(2.8, ease + 0.08);

    const total = meta.correct + meta.wrong;
    let baseMinutes = 20;

    if (total <= 2) baseMinutes = 30;
    else if (total <= 5) baseMinutes = 60 * 6;
    else if (total <= 10) baseMinutes = 60 * 24;
    else baseMinutes = 60 * 48;

    const interval = baseMinutes * meta.ease;
    meta.nextDueTs = now + interval * 60 * 1000;
}

function pickDueItems(lesson, count = 6) {
    const now = nowTs();
    const items = [...lesson.items];

    items.sort((a, b) => {
        const ma = wordMeta(a.id);
        const mb = wordMeta(b.id);
        const da = ma.nextDueTs || 0;
        const db = mb.nextDueTs || 0;
        const aDue = da <= now ? 0 : 1;
        const bDue = db <= now ? 0 : 1;
        if (aDue !== bDue) return aDue - bDue;
        return da - db;
    });

    return items.slice(0, Math.min(count, items.length));
}

/* ---------------- Utilities ---------------- */
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function safeText(v) {
    if (v === null || v === undefined) return "";
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    if (typeof v === "object") {
        if ("transcript" in v && typeof v.transcript === "string") return v.transcript;
        if ("value" in v && typeof v.value === "string") return v.value;
    }
    try {
        return JSON.stringify(v);
    } catch {
        return String(v);
    }
}

function escapeHtml(s) {
    return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function addCoins(n) {
    state.coins += n;
    saveState();
    render();
}

function normalize(s) {
    return (s || "").toLowerCase().replaceAll(/[^a-z]/g, "").trim();
}

/* ---------------- Mascot mood ---------------- */
function setMascotMood(mood) {
    const blob = document.querySelector(".blob");
    if (!blob) return;
    blob.classList.remove("mood-happy", "mood-oops");
    if (mood === "happy") blob.classList.add("mood-happy");
    if (mood === "oops") blob.classList.add("mood-oops");
    window.setTimeout(() => {
        blob.classList.remove("mood-happy", "mood-oops");
    }, 1400);
}

/* ---------------- Speech synthesis (TTS) ---------------- */
let cachedVoices = [];

function refreshVoices() {
    if (!("speechSynthesis" in window)) return;
    const v = window.speechSynthesis.getVoices?.() || [];
    cachedVoices = Array.isArray(v) ? v : [];
}

function ensureVoicesReady() {
    if (!("speechSynthesis" in window)) return;
    refreshVoices();
    if (cachedVoices.length === 0) {
        window.setTimeout(refreshVoices, 250);
        window.setTimeout(refreshVoices, 800);
    }
}

function pickVoice(langTag) {
    const want = (langTag || "").toLowerCase();
    if (!want) return null;
    const v = cachedVoices;

    let match = v.find((x) => (x.lang || "").toLowerCase() === want);
    if (match) return match;

    match = v.find((x) => (x.lang || "").toLowerCase().startsWith(want));
    if (match) return match;

    return null;
}

function speakWord(word) {
    if (!("speechSynthesis" in window)) return;

    ensureVoicesReady();

    const utter = new SpeechSynthesisUtterance(word);
    const lang = state.settings.voiceMode === "uk" ? "en-GB" : "en-US";
    utter.lang = lang;

    const voice = pickVoice(lang);
    if (voice) utter.voice = voice;

    utter.rate = 0.92;
    utter.pitch = 1.05;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
}

if ("speechSynthesis" in window) {
    window.speechSynthesis.onvoiceschanged = () => {
        refreshVoices();
    };
    refreshVoices();
}

/* ---------------- Speech recognition (ASR) ---------------- */
function isSecureContextForMic() {
    return window.isSecureContext === true;
}

function canSpeechRecognize() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function createRecognizer() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;

    const rec = new SR();
    rec.lang = state.settings.voiceMode === "uk" ? "en-GB" : "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = 3;
    return rec;
}

/* ---------------- UI helpers ---------------- */
function lessonUnlocked(lesson) {
    return (state.coins || 0) >= (lesson.unlockCoins || 0);
}

function choice(kind, value, label, current) {
    const pressed = current === value ? "true" : "false";
    return `<button class="choice" aria-pressed="${pressed}" data-kind="${kind}" data-value="${value}">${label}</button>`;
}

function renderPager(session) {
    const dots = session.queue
        .map((_, i) => {
            const a = session.answers[i];
            const cls =
                i === session.index
                    ? "pager-dot active"
                    : a?.ok === true
                        ? "pager-dot ok"
                        : a?.ok === false
                            ? "pager-dot bad"
                            : "pager-dot";
            return `<button class="${cls}" data-jump="${i}" aria-label="Question ${i + 1}"></button>`;
        })
        .join("");

    return `<div class="pager">${dots}</div>`;
}

/* This ensures pager jump always re-renders ALL content (image + prompt text + answers) */
function goToQuestion(session, i, renderGame) {
    session.index = i;
    state.lastSession = session;
    saveState();
    renderGame();
}

function showFeedback(modal, item, payload, onNext, onRetry) {
    const ok = payload.ok;

    setMascotMood(ok ? "happy" : "oops");

    const feedback = document.createElement("div");
    feedback.className = "card feedback-card";
    feedback.innerHTML = `
        <h3 class="section-title" style="margin: 0 0 8px 0;">
            ${ok ? "Nice" : "Try again"}
        </h3>

        <div class="pill" style="width: 100%; justify-content: space-between;">
            <strong>Correct</strong>
            <div style="display:flex; gap:10px; align-items:baseline; justify-content:flex-end;">
                <strong style="font-weight: 1000;">${escapeHtml(item.word)}</strong>
                <span style="color: var(--muted); font-weight: 900;">${escapeHtml(item.ipa || "")}</span>
            </div>
        </div>

        ${payload.chosen ? `
            <div class="pill" style="width: 100%; justify-content: space-between;">
            <strong>You chose</strong>
            <strong style="font-weight: 1000;">${escapeHtml(payload.chosen)}</strong>
            </div>
        ` : ""}

        ${payload.heard ? `
            <div class="pill" style="width: 100%; justify-content: space-between;">
            <span>I heard</span>
            <strong>${escapeHtml(safeText(payload.heard))}</strong>
            </div>
        ` : ""}

        <div class="feedback-actions">
            <button class="btn primary" id="fb-sound" type="button">Hear again</button>
            ${!ok ? `<button class="btn" id="fb-retry" type="button">Try again</button>` : ""}
            <button class="btn ${ok ? "" : "primary"}" id="fb-next" type="button">${ok ? "Next" : "Skip"}</button>
        </div>

        ${payload.asrNote ? `<div class="tag" style="margin-top: 10px;">${escapeHtml(payload.asrNote)}</div>` : ""}
    `;

    const game = modal.querySelector(".game");
    game.appendChild(feedback);

    feedback.querySelector("#fb-sound").onclick = () => speakWord(item.word);

    if (!ok) {
        const retryBtn = feedback.querySelector("#fb-retry");
        if (retryBtn) {
            retryBtn.onclick = () => {
                feedback.remove();
                if (typeof onRetry === "function") onRetry();
            };
        }
        feedback.querySelector("#fb-next").onclick = onNext;
        feedback.scrollIntoView({ block: "end", behavior: "smooth" });
        return;
    }

    const t = setTimeout(onNext, 1200);
    feedback.querySelector("#fb-next").onclick = () => {
        clearTimeout(t);
        onNext();
    };
}


/* ---------------- Rendering ---------------- */
function unlockedStickers() {
    return STICKERS.filter((s) => (state.coins || 0) >= (s.unlockCoins || 0));
}

function unlockedScenes() {
    return STICKER_SCENES.filter((s) => (state.coins || 0) >= (s.unlockCoins || 0));
}

function render() {
    const stickerCount = unlockedStickers().length;

    app.innerHTML = `
    <div class="topbar">
        <div class="brand">
            <div class="logo" aria-hidden="true"></div>
            <div class="title">
            <h1>English Kiddo</h1>
            <p>Short games, big brain. Practice every day.</p>
            </div>
        </div>

        <div class="pills">
            <div class="pill pill-icon" title="Streak">
                <img src="./assets/ui/icons/streak.webp" alt="Streak icon" />
                <span class="pill-value">${state.streak.count}</span>
            </div>

            <div class="pill pill-icon" title="Coins">
                <img src="./assets/ui/icons/coins.webp" alt="Coins icon" />
                <span class="pill-value">${state.coins}</span>
            </div>

            <div class="pill pill-icon" title="Stickers">
                <img src="./assets/ui/icons/sticker.webp" alt="Sticker icon" />
                <span class="pill-value">${stickerCount}</span>
            </div>

            <div id="open-settings" class="pill pill-icon pill-settings" title="Settings">
                <img src="./assets/ui/icons/settings.webp" alt="Settings icon" />
            </div>

        </div>
    </div>

    <div class="main">
      <div class="card">
        <h2 class="section-title">World map</h2>

        <div class="grid">
          ${LESSONS.map((l) => {
        const locked = !lessonUnlocked(l);
        const cls = locked ? "lesson locked" : "lesson";
        const lockText = locked ? `Locked, needs ${l.unlockCoins} coins` : "Tap to play";
        return `
              <div class="${cls}" data-lesson="${l.id}">
                <h3>${escapeHtml(l.title)}</h3>
                <p>${escapeHtml(lockText)}</p>
              </div>
            `;
    }).join("")}
        </div>

        <div style="height: 14px"></div>

        <div class="big-actions">
          <button class="btn primary" id="play-today">Play today</button>
          <button class="btn" id="sticker-book">Sticker book</button>
        </div>
      </div>

      <div class="card">
        <h2 class="section-title">Mascot</h2>
        <div class="mascot">
          <div class="blob">
            <div class="eyes">
              <div class="eye"></div>
              <div class="eye"></div>
            </div>
            <div class="mouth"></div>
          </div>
        </div>

        <div style="height: 12px"></div>

        <div class="pill" style="justify-content: space-between; width: 100%;">
          <span>Voice mode</span>
          <strong>${escapeHtml(state.settings.voiceMode.toUpperCase())}</strong>
        </div>

        <p style="margin: 10px 0 0 0; color: var(--muted);">
          Speech check: Chrome only, HTTPS required, allow microphone.
        </p>
      </div>
    </div>
  `;

    document.querySelector("#open-settings").onclick = () => requireParent(openSettings);
    document.querySelector("#play-today").onclick = () => playToday();
    document.querySelector("#sticker-book").onclick = () => openStickerBook();

    document.querySelectorAll(".lesson").forEach((el) => {
        el.onclick = () => {
            const id = el.dataset.lesson;
            const lesson = LESSONS.find((x) => x.id === id);
            if (!lessonUnlocked(lesson)) {
                speakWord("Locked");
                return;
            }
            preloadLessonAssets(lesson);
            startLesson(lesson);
        };
    });
}

function openResetConfirm(onConfirm) {
    const wrap = document.createElement("div");
    wrap.className = "modal-backdrop";

    let step = 1;

    const renderStep = () => {
        wrap.innerHTML = `
            <div class="modal" role="dialog" aria-modal="true" aria-label="Reset progress">
            <div class="game-head">
                <h2 class="section-title" style="margin:0;">Reset progress</h2>
                <button class="btn" id="close" type="button">Close</button>
            </div>
    
            <p style="margin: 10px 0 12px 0; color: var(--muted);">
                ${step === 1
                ? "This will erase coins, streak, lesson progress, and sticker placements."
                : "Type RESET to confirm. This cannot be undone."}
            </p>
    
            ${step === 1 ? `
                <div class="row" style="margin-top: 12px;">
                <button class="btn" id="cancel" type="button">Cancel</button>
                <button class="btn primary" id="next" type="button">Continue</button>
                </div>
            ` : `
                <div class="pill" style="width:100%; justify-content: space-between; align-items:center;">
                <span>Type</span>
                <span class="tag" style="user-select:text;">RESET</span>
                <input
                    id="txt"
                    type="text"
                    autocomplete="off"
                    autocapitalize="characters"
                    spellcheck="false"
                    placeholder="RESET"
                    style="width: 140px; padding: 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.35); background: rgba(255,255,255,0.55); font-weight: 1000; letter-spacing: 0.6px;"
                />
                </div>
    
                <div class="row" style="margin-top: 12px;">
                <button class="btn" id="back" type="button">Back</button>
                <button class="btn primary" id="ok" type="button">Reset now</button>
                </div>
    
                <div class="tag" id="msg" style="margin-top: 10px;"></div>
            `}
            </div>
        `;

        wrap.querySelector("#close").onclick = () => wrap.remove();

        if (step === 1) {
            wrap.querySelector("#cancel").onclick = () => wrap.remove();
            wrap.querySelector("#next").onclick = () => {
                step = 2;
                renderStep();
                setTimeout(() => wrap.querySelector("#txt")?.focus(), 30);
            };
            return;
        }

        const msg = wrap.querySelector("#msg");
        const input = wrap.querySelector("#txt");

        wrap.querySelector("#back").onclick = () => {
            step = 1;
            renderStep();
        };

        wrap.querySelector("#ok").onclick = () => {
            const v = (input.value || "").trim().toUpperCase();
            if (v !== "RESET") {
                msg.textContent = "Please type RESET exactly.";
                input.focus();
                return;
            }
            wrap.remove();
            onConfirm();
        };

        wrap.addEventListener("keydown", (e) => {
            if (e.key === "Escape") wrap.remove();
            if (e.key === "Enter") wrap.querySelector("#ok")?.click();
        });
    };

    document.body.appendChild(wrap);
    renderStep();
}

/* ---------------- Settings ---------------- */
function openSettings() {
    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true" aria-label="Settings">
        <div class="settings-hero">
            <div class="left">
            <div class="settings-badge" aria-hidden="true"></div>
            <div>
                <h2 class="settings-title" style="margin:0;">Settings</h2>
                <p class="settings-sub">Make it comfy for kiddo</p>
            </div>
            </div>
            <button class="btn" id="close" type="button">Close</button>
        </div>
    
        <div class="settings-body">
            <div class="settings-grid">
    
            <div class="settings-block">
                <h3>Day or Night</h3>
                <div class="row">
                ${choice("theme", "day", "Day", state.settings.theme)}
                ${choice("theme", "night", "Night", state.settings.theme)}
                </div>
            </div>
    
            <div class="settings-block">
                <h3>Style</h3>
                <div class="row">
                ${choice("accent", "girl", "Girl", state.settings.accent)}
                ${choice("accent", "boy", "Boy", state.settings.accent)}
                ${choice("accent", "sunset", "Sunset", state.settings.accent)}
                ${choice("accent", "space", "Space", state.settings.accent)}
                </div>
            </div>
    
            <div class="settings-block">
                <h3>Voice</h3>
                <div class="row">
                ${choice("voice", "us", "US", state.settings.voiceMode)}
                ${choice("voice", "uk", "UK", state.settings.voiceMode)}
                </div>
            </div>
    
            <div class="settings-block">
                <h3>Font size</h3>
                <div class="row">
                ${choice("font", "small", "Small", state.settings.fontSize)}
                ${choice("font", "normal", "Normal", state.settings.fontSize)}
                ${choice("font", "big", "Big", state.settings.fontSize)}
                </div>
            </div>
    
            </div>
    
            <div style="height: 12px"></div>
            
            <h3 class="section-title">Danger zone</h3>
            <div class="row">
                <button class="btn" id="reset-progress" type="button">Reset progress</button>
            </div>
            <div class="tag" style="margin-top: 8px;">This clears coins, streak, progress, and sticker placements.</div>
            <div style="height: 12px"></div>

            <div class="tag">Parent access expires in 10 minutes.</div>
        </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#close").onclick = () => modal.remove();
    modal.querySelector("#reset-progress").onclick = () => {
        requireParent(() => openResetConfirm(() => {
            state = defaultState();
            applyTheme();
            saveState();
            modal.remove();
            render();
        }));
    };

    modal.querySelectorAll("[data-kind]").forEach((btn) => {
        btn.onclick = () => {
            const kind = btn.dataset.kind;
            const val = btn.dataset.value;

            if (kind === "theme") state.settings.theme = val;
            if (kind === "accent") state.settings.accent = val;
            if (kind === "voice") state.settings.voiceMode = val;
            if (kind === "font") state.settings.fontSize = val;

            applyTheme();
            saveState();
            modal.remove();
            openSettings();
            render();
        };
    });
}

/* ---------------- Play today ---------------- */
function playToday() {
    const unlocked = LESSONS.filter((l) => lessonUnlocked(l));
    const lesson = unlocked[Math.floor(Math.random() * unlocked.length)];
    preloadLessonAssets(lesson);
    startLesson(lesson);
}

/* ---------------- Lessons ---------------- */
function startLesson(lesson) {
    setStreak();
    saveState();

    if (lesson.type === "minimalPairs") {
        startMinimalPairs(lesson);
        return;
    }

    const sessionItems = pickDueItems(lesson, 6);
    const queue = shuffle(sessionItems);
    const modes = queue.map(() => ["match", "build", "say"][Math.floor(Math.random() * 3)]);

    /* Preload current queue images and the first scene/sticker UI bits */
    for (const it of queue) preloadImage(it.image);

    startSession({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        queue,
        modes,
        index: 0,
        earned: 0,
        combo: 0,
        answers: []
    });

}

function startSession(session) {
    state.lastSession = session;
    saveState();

    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    document.body.appendChild(modal);

    function close() {
        modal.remove();
        render();
    }

    function next() {
        session.index += 1;

        if (session.index >= session.queue.length) {
            addCoins(session.earned);
            state.lastSession = null;
            saveState();

            modal.innerHTML = `
        <div class="modal modal-fun">
          <div class="game-head">
            <h2 class="section-title" style="margin:0;">Done</h2>
            <button class="btn" id="close">Close</button>
          </div>
          <p style="margin: 8px 0 14px 0; color: var(--muted);">
            Coins earned: <strong>${session.earned}</strong>
          </p>
          <button class="btn primary" id="again">Play again</button>
        </div>
      `;
            modal.querySelector("#close").onclick = close;
            modal.querySelector("#again").onclick = () => {
                modal.remove();
                playToday();
            };
            return;
        }

        state.lastSession = session;
        saveState();
        renderGame();
    }

    function renderGame() {
        const total = session.queue.length;
        const done = session.index;
        const pct = Math.round((done / total) * 100);
        const mode = session.modes?.[session.index] || "match";


        const item = session.queue[session.index];
        const canBack = session.index > 0;

        /* Preload current + next item image */
        preloadImage(item.image);
        const nextItem = session.queue[session.index + 1];
        if (nextItem) preloadImage(nextItem.image);

        modal.innerHTML = `
      <div class="modal">
        <div class="game">
          <div class="game-head">
            <div>
              <div class="tag">${escapeHtml(session.lessonTitle)}</div>
              <div style="height: 6px"></div>
              <div class="tag">Level ${done + 1} of ${total}</div>
            </div>
            <div class="row">
              <button class="btn" id="back" ${canBack ? "" : "disabled"}>Back</button>
              <button class="btn" id="sound">Sound</button>
              <button class="btn" id="close">Close</button>
            </div>
          </div>

          ${renderPager(session)}
          <div class="progress"><div style="width:${pct}%;"></div></div>

          ${mode === "match" ? renderMatch(item) : ""}
          ${mode === "build" ? renderBuild(item) : ""}
          ${mode === "say" ? renderSay(item) : ""}
        </div>
      </div>
    `;

        modal.querySelector("#close").onclick = close;
        modal.querySelector("#sound").onclick = () => speakWord(item.word);

        modal.querySelector("#back").onclick = () => {
            session.index -= 1;
            state.lastSession = session;
            saveState();
            renderGame();
        };

        modal.querySelectorAll("[data-jump]").forEach((btn) => {
            btn.onclick = () => {
                goToQuestion(session, Number(btn.dataset.jump), renderGame);
            };
        });

        const rerenderCurrent = () => {
            state.lastSession = session;
            saveState();
            renderGame();
        };

        if (mode === "match") wireMatch(modal, item, session, next, rerenderCurrent);
        if (mode === "build") wireBuild(modal, item, session, next, rerenderCurrent);
        if (mode === "say") wireSay(modal, item, session, next, rerenderCurrent);
    }

    renderGame();
}

/* ---------------- Vocab modes ---------------- */
function renderMatch(item) {
    const allWords = LESSONS.filter((l) => l.type === "vocab")
        .flatMap((l) => l.items)
        .map((x) => x.word);

    const choices = shuffle([item.word, ...shuffle(allWords.filter((w) => w !== item.word)).slice(0, 3)]);

    return `
    <img class="big-image" src="${item.image}" alt="image clue" decoding="async" loading="eager" />
    <div class="prompt-pill"><span class="spark"></span>Pick the word</div>
    <div class="answers">
      ${choices.map((w) => `<button class="answer" data-answer="${escapeHtml(w)}">${escapeHtml(w)}</button>`).join("")}
    </div>
    <div class="tag">Use Sound if needed</div>
  `;
}

function wireMatch(modal, item, session, next, rerenderCurrent) {
    const buttons = modal.querySelectorAll(".answer");
    buttons.forEach(b => {
        b.onclick = () => {
            const chosen = b.dataset.answer;
            const ok = chosen === item.word;

            buttons.forEach(x => (x.disabled = true));
            buttons.forEach(x => {
                if (x.dataset.answer === item.word) x.classList.add("good");
            });
            if (!ok) b.classList.add("bad");

            scheduleNext(item.id, ok);

            if (ok) {
                session.earned += 3;
                session.combo = (session.combo || 0) + 1;
                fireConfetti(session.combo);
            } else {
                session.earned += 1;
                session.combo = 0;
            }

            session.answers[session.index] = { itemId: item.id, mode: "match", ok, chosen, heard: null };
            state.lastSession = session;
            saveState();

            showFeedback(
                modal,
                item,
                { ok, chosen },
                next,
                () => rerenderCurrent()
            );
        };
    });
}


function renderBuild(item) {
    const letters = shuffle(item.word.split(""));
    return `
      <img class="big-image" src="${item.image}" alt="image clue" />
      <div class="tag">Build the word</div>
  
      <div class="row" style="gap:10px;">
        <button class="btn" id="undo">Back</button>
        <button class="btn" id="clear">Clear</button>
      </div>
  
      <div class="target" id="target" aria-label="Your answer"></div>
  
      <div class="letters" id="letters">
        ${letters
            .map((ch, i) => `<button class="letter" data-ch="${escapeHtml(ch)}" data-i="${i}">${escapeHtml(ch)}</button>`)
            .join("")}
      </div>
  
      <div class="tag" id="msg">Tap letters in order. Use Back to undo.</div>
    `;
}

function wireBuild(modal, item, session, next) {
    const target = modal.querySelector("#target");
    const msg = modal.querySelector("#msg");
    const lettersWrap = modal.querySelector("#letters");

    let picked = []; // { ch, btnIndex }
    let built = "";

    const buttons = Array.from(modal.querySelectorAll(".letter"));

    const renderTarget = () => {
        target.innerHTML = "";
        for (const p of picked) {
            const chip = document.createElement("div");
            chip.className = "letter";
            chip.style.cursor = "default";
            chip.textContent = p.ch;
            target.appendChild(chip);
        }
    };

    const applyHighlights = () => {
        const used = new Set(picked.map(p => p.btnIndex));
        buttons.forEach((btn, idx) => {
            const isUsed = used.has(idx);
            btn.disabled = isUsed;
            btn.classList.toggle("used", isUsed);
        });
    };

    const pushPick = (btnIndex, ch) => {
        picked.push({ ch, btnIndex });
        built = picked.map(p => p.ch).join("");
        renderTarget();
        applyHighlights();
    };

    const popPick = () => {
        picked.pop();
        built = picked.map(p => p.ch).join("");
        renderTarget();
        applyHighlights();
    };

    const clearAll = () => {
        picked = [];
        built = "";
        renderTarget();
        applyHighlights();
    };

    // Initial paint
    renderTarget();
    applyHighlights();

    // Buttons
    const undoBtn = modal.querySelector("#undo");
    const clearBtn = modal.querySelector("#clear");

    undoBtn.onclick = () => {
        if (picked.length === 0) return;
        popPick();
        msg.textContent = "Undo.";
    };

    clearBtn.onclick = () => {
        clearAll();
        msg.textContent = "Cleared.";
    };

    // Tile click
    buttons.forEach((btn, idx) => {
        btn.onclick = () => {
            const ch = btn.dataset.ch || "";
            pushPick(idx, ch);

            // If done, score it
            if (picked.length === item.word.length) {
                const ok = built.toLowerCase() === item.word.toLowerCase();
                scheduleNext(item.id, ok);

                if (ok) {
                    session.earned += 4;
                    session.combo = (session.combo || 0) + 1;
                    fireConfetti(session.combo);
                } else {
                    session.earned += 1;
                    session.combo = 0;
                }

                // Save a clean string, plus debug info separately
                session.answers[session.index] = {
                    itemId: item.id,
                    mode: "build",
                    ok,
                    chosen: built,
                    heard: null,
                    debug: { picked } // optional, for troubleshooting
                };

                state.lastSession = session;
                saveState();

                showFeedback(modal, item, { ok, chosen: built, buildPicked: picked }, next);
            }
        };
    });
}


function renderSay(item) {
    const supported = canSpeechRecognize();
    const secure = isSecureContextForMic();
    const disabled = !supported || !secure;

    let note = "";
    if (!secure) note = "Mic requires HTTPS. Use GitHub Pages.";
    else if (!supported) note = "Speech check works in Chrome.";

    return `
    <img class="big-image" src="${item.image}" alt="image clue" decoding="async" loading="eager" />
<div class="prompt-pill"><span class="spark"></span>Say it</div>
    <div class="row">
      <button class="btn primary" id="model">Hear it</button>
      <button class="btn" id="mic" ${disabled ? "disabled" : ""}>Mic</button>
    </div>

    <div class="pill" style="width: 100%; justify-content: space-between;">
      <span>Target</span>
      <strong>${escapeHtml(item.word)} <span style="color: var(--muted); font-weight: 900;">${escapeHtml(item.ipa || "")}</span></strong>
    </div>

    <div class="pill" style="width: 100%; justify-content: space-between;">
      <span>I heard</span>
      <strong id="heard">...</strong>
    </div>

    <div class="tag" id="tip">${escapeHtml(note || "Tap Mic, say the word clearly.")}</div>
  `;
}

function wireSay(modal, item, session, next, rerenderCurrent) {
    const heardEl = modal.querySelector("#heard");
    const tipEl = modal.querySelector("#tip");

    modal.querySelector("#model").onclick = () => speakWord(item.word);

    const micBtn = modal.querySelector("#mic");
    if (!micBtn || micBtn.disabled) return;

    micBtn.onclick = () => {
        const rec = createRecognizer();
        if (!rec) {
            tipEl.textContent = "Speech check not supported.";
            return;
        }

        let ended = false;
        heardEl.textContent = "...";
        tipEl.textContent = "Listening...";

        rec.onresult = (e) => {
            const text = e.results?.[0]?.[0]?.transcript?.trim() || "";
            heardEl.textContent = text || "(nothing)";

            const ok = normalize(text) === normalize(item.word);
            scheduleNext(item.id, ok);

            if (ok) {
                session.earned += 5;
                session.combo = (session.combo || 0) + 1;
                fireConfetti(session.combo);
            } else {
                session.earned += 1;
                session.combo = 0;
            }

            session.answers[session.index] = { itemId: item.id, mode: "say", ok, chosen: null, heard: text };
            state.lastSession = session;
            saveState();

            ended = true;
            rec.stop();

            showFeedback(modal, item, { ok, heard: text }, next, () => rerenderCurrent());
        };

        rec.onerror = (err) => {
            if (ended) return;
            const name = err?.error || "mic error";
            tipEl.textContent = `Speech error: ${name}. Check permission and try again.`;
        };

        rec.onend = () => {
            if (!ended && tipEl.textContent === "Listening...") {
                tipEl.textContent = "No result. Try again, speak closer to the mic.";
            }
        };

        try {
            rec.start();
        } catch {
            tipEl.textContent = "Could not start mic. Try reloading and allowing permission.";
        }
    };
}

/* ---------------- Minimal pairs (unchanged) ---------------- */
function startMinimalPairs(lesson) {
    setStreak();
    saveState();

    const groups = lesson.groups || [];
    const group = groups[Math.floor(Math.random() * groups.length)];
    const pair = group.pairs[Math.floor(Math.random() * group.pairs.length)];

    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    document.body.appendChild(modal);

    let step = 0;
    let earned = 0;
    let combo = 0;

    function close() {
        modal.remove();
        render();
    }

    function renderLab() {
        const a = pair.a;
        const b = pair.b;

        modal.innerHTML = `
      <div class="modal">
        <div class="game">
          <div class="game-head">
            <div>
              <div class="tag">${escapeHtml(group.title)}</div>
              <div style="height: 6px"></div>
              <div class="tag">Step ${step + 1} of 3</div>
            </div>
            <div class="row">
              <button class="btn" id="close">Close</button>
            </div>
          </div>

          <div class="tag">${escapeHtml(group.tip)}</div>

          ${step === 0
                ? `
            <div class="row">
              <button class="btn primary" id="a">Hear A</button>
              <button class="btn primary" id="b">Hear B</button>
            </div>
            <div class="tag">Listen a few times, then Next.</div>
            <button class="btn" id="next">Next</button>
          `
                : ""
            }

          ${step === 1
                ? `
            <div class="tag">Which one did you hear?</div>
            <div class="row">
              <button class="btn" id="pick-a">${escapeHtml(a)}</button>
              <button class="btn" id="pick-b">${escapeHtml(b)}</button>
            </div>
            <div class="tag" id="msg">Tap one.</div>
          `
                : ""
            }

          ${step === 2
                ? `
            <div class="tag">Say A, then say B.</div>
            <div class="row">
              <button class="btn primary" id="say-a">${escapeHtml(a)}</button>
              <button class="btn primary" id="say-b">${escapeHtml(b)}</button>
            </div>
            <div class="pill" style="width: 100%; justify-content: space-between;">
              <span>I heard</span>
              <strong id="heard">...</strong>
            </div>
            <button class="btn" id="done">Done</button>
          `
                : ""
            }
        </div>
      </div>
    `;

        modal.querySelector("#close").onclick = close;

        if (step === 0) {
            modal.querySelector("#a").onclick = () => speakWord(a);
            modal.querySelector("#b").onclick = () => speakWord(b);
            modal.querySelector("#next").onclick = () => {
                step = 1;
                renderLab();
            };
        }

        if (step === 1) {
            const heard = shuffle([a, b])[0];
            speakWord(heard);
            modal.querySelector("#pick-a").onclick = () => pick(a, heard);
            modal.querySelector("#pick-b").onclick = () => pick(b, heard);
        }

        if (step === 2) {
            modal.querySelector("#say-a").onclick = () => startRec(a);
            modal.querySelector("#say-b").onclick = () => startRec(b);
            modal.querySelector("#done").onclick = () => {
                addCoins(earned);
                close();
            };
        }
    }

    function pick(chosen, heard) {
        const ok = normalize(chosen) === normalize(heard);
        const msg = modal.querySelector("#msg");

        if (ok) {
            earned += 4;
            combo += 1;
            fireConfetti(combo);
            msg.textContent = "Correct";
            setMascotMood("happy");
        } else {
            earned += 1;
            combo = 0;
            msg.textContent = `It was: ${heard}`;
            setMascotMood("oops");
        }

        setTimeout(() => {
            step = 2;
            renderLab();
        }, 900);
    }

    function startRec(targetWord) {
        const heardEl = modal.querySelector("#heard");
        if (!isSecureContextForMic() || !canSpeechRecognize()) {
            heardEl.textContent = "Speech check needs Chrome and HTTPS.";
            return;
        }

        const rec = createRecognizer();
        if (!rec) {
            heardEl.textContent = "Speech check not supported.";
            return;
        }

        heardEl.textContent = "Listening...";

        rec.onresult = (e) => {
            const text = e.results?.[0]?.[0]?.transcript?.trim() || "";
            heardEl.textContent = text || "(nothing)";
            const ok = normalize(text) === normalize(targetWord);

            if (ok) {
                earned += 5;
                combo += 1;
                fireConfetti(combo);
                setMascotMood("happy");
            } else {
                earned += 1;
                combo = 0;
                setMascotMood("oops");
            }
            rec.stop();
        };

        rec.onerror = () => {
            heardEl.textContent = "Mic error.";
        };

        try {
            rec.start();
        } catch {
            heardEl.textContent = "Could not start mic.";
        }
    }

    renderLab();
}

/* ---------------- Sticker book (adds preloading) ---------------- */
function openStickerBook() {
    preloadStickerAssets();

    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    document.body.appendChild(modal);

    const scenes = unlockedScenes();
    let sceneId = scenes[0]?.id || STICKER_SCENES[0].id;

    function ensurePlacements() {
        if (!state.stickerBook.placements[sceneId]) state.stickerBook.placements[sceneId] = [];
    }

    function renderBook() {
        ensurePlacements();
        const scene = STICKER_SCENES.find((s) => s.id === sceneId);

        const stickers = unlockedStickers();
        const placements = state.stickerBook.placements[sceneId];

        preloadImage(scene.image);
        for (const s of stickers) preloadImage(s.image);

        modal.innerHTML = `
      <div class="modal">
        <div class="game">
          <div class="game-head">
            <div class="tag">Sticker book</div>
            <div class="row">
              <button class="btn" id="close">Close</button>
            </div>
          </div>

          <div class="row">
            ${scenes
                .map((s) => {
                    const pressed = s.id === sceneId ? "true" : "false";
                    return `<button class="choice" aria-pressed="${pressed}" data-scene="${s.id}">${escapeHtml(s.title)}</button>`;
                })
                .join("")}
          </div>

          <div class="scene" id="scene">
            <img src="${scene.image}" alt="scene" decoding="async" loading="eager" />
            ${placements
                .map((p, idx) => {
                    const st = STICKERS.find((x) => x.id === p.stickerId);
                    if (!st) return "";
                    return `
                  <img
                    class="sticker"
                    data-idx="${idx}"
                    src="${st.image}"
                    style="left:${p.x}px; top:${p.y}px; transform: rotate(${p.rot}deg) scale(${0.5});"
                    alt="${escapeHtml(st.label)}"
                    decoding="async"
                    loading="eager"
                  />
                `;
                })
                .join("")}
          </div>

          <div class="tag">Tap to add, then drag.</div>

          <div class="sticker-tray">
            ${stickers
                .map(
                    (s) => `
              <div class="tray-item" data-add="${s.id}" title="${escapeHtml(s.label)}">
                <img src="${s.image}" alt="${escapeHtml(s.label)}" decoding="async" loading="eager" />
              </div>
            `
                )
                .join("")}
          </div>
        </div>
      </div>
    `;

        modal.querySelector("#close").onclick = () => {
            modal.remove();
            render();
        };

        modal.querySelectorAll("[data-scene]").forEach((btn) => {
            btn.onclick = () => {
                sceneId = btn.dataset.scene;
                renderBook();
            };
        });

        modal.querySelectorAll("[data-add]").forEach((btn) => {
            btn.onclick = () => {
                ensurePlacements();
                state.stickerBook.placements[sceneId].push({
                    stickerId: btn.dataset.add,
                    x: 40,
                    y: 40,
                    scale: 1,
                    rot: 0,
                });
                saveState();
                renderBook();
            };
        });

        modal.querySelectorAll(".sticker").forEach((el) => {
            enableDrag(el, sceneId);
        });
    }

    renderBook();
}

function enableDrag(stickerEl, sceneId) {
    let startX = 0,
        startY = 0,
        origX = 0,
        origY = 0;
    const idx = Number(stickerEl.dataset.idx);

    const onDown = (e) => {
        e.preventDefault();
        const p = e.touches ? e.touches[0] : e;
        startX = p.clientX;
        startY = p.clientY;

        const placement = state.stickerBook.placements[sceneId][idx];
        origX = placement.x;
        origY = placement.y;

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        window.addEventListener("touchmove", onMove, { passive: false });
        window.addEventListener("touchend", onUp);
    };

    const onMove = (e) => {
        e.preventDefault();
        const p = e.touches ? e.touches[0] : e;
        const dx = p.clientX - startX;
        const dy = p.clientY - startY;

        const placement = state.stickerBook.placements[sceneId][idx];
        placement.x = origX + dx;
        placement.y = origY + dy;

        stickerEl.style.left = placement.x + "px";
        stickerEl.style.top = placement.y + "px";
    };

    const onUp = () => {
        saveState();
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onUp);
    };

    stickerEl.addEventListener("mousedown", onDown);
    stickerEl.addEventListener("touchstart", onDown, { passive: false });
}

/* ---------------- Confetti V2 (unchanged logic) ---------------- */
const confettiCanvas = document.querySelector("#confetti");
const ctx = confettiCanvas.getContext("2d");
let confettiPieces = [];

function resizeConfetti() {
    confettiCanvas.width = window.innerWidth * devicePixelRatio;
    confettiCanvas.height = window.innerHeight * devicePixelRatio;
    confettiCanvas.style.width = window.innerWidth + "px";
    confettiCanvas.style.height = window.innerHeight + "px";
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}

window.addEventListener("resize", resizeConfetti);
resizeConfetti();

const CONFETTI_COLORS = [
    "#ff4d6d", "#ff9f1c", "#f1c40f", "#2ecc71", "#22c55e",
    "#38bdf8", "#3b82f6", "#a78bfa", "#ff4dc4"
];

function fireConfetti(combo = 1) {
    const w = window.innerWidth;
    const strength = Math.min(5, combo);

    const count = 60 + strength * 40;
    const swirl = strength >= 3;
    const vortex = strength >= 4;

    for (let i = 0; i < count; i++) {
        const x0 = w * 0.25 + Math.random() * w * 0.5;
        confettiPieces.push({
            x: x0,
            y: -20,
            vx: (Math.random() - 0.5) * (2 + strength),
            vy: 1.6 + Math.random() * (1.4 + strength * 0.6),
            r: 2 + Math.random() * 4,
            a: Math.random() * Math.PI * 2,
            va: (Math.random() - 0.5) * 0.18,
            life: 130 + strength * 35,
            t: 0,
            swirl,
            vortex,
            color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        });
    }
}

function tickConfetti() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.35;

    confettiPieces = confettiPieces.filter((p) => p.life > 0);

    for (const p of confettiPieces) {
        p.t += 1;

        const bask = p.t < 30 ? 0.03 : 0.1;
        p.vy += bask;

        if (p.swirl) {
            const dx = p.x - cx;
            const dy = p.y - cy;
            const dist = Math.max(40, Math.hypot(dx, dy));
            const tang = 12 / dist;
            p.vx += (-dy / dist) * tang;
            p.vy += (dx / dist) * tang * 0.6;
        }

        if (p.vortex) {
            const dx = p.x - cx;
            const dy = p.y - cy;
            const dist = Math.max(60, Math.hypot(dx, dy));
            const pull = 18 / dist;

            p.vx += (-dx / dist) * pull;
            p.vy += (-dy / dist) * pull * 0.7;
            p.vx += (-dy / dist) * pull * 0.8;
        }

        p.x += p.vx;
        p.y += p.vy;
        p.a += p.va;
        p.life -= 1;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        ctx.fillStyle = p.color || "rgba(255,255,255,0.92)";
        ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2);
        ctx.restore();
    }

    requestAnimationFrame(tickConfetti);
}
tickConfetti();

/* ---------------- Startup ---------------- */
registerServiceWorker();
render();
ensureVoicesReady();

/* warm caches for first use */
preloadStickerAssets();
for (const l of LESSONS) preloadLessonAssets(l);
