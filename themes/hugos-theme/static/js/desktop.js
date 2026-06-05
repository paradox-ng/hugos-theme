/*! hugOS - a "web desktop" theme for Hugo - by Paradox (https://github.com/paradox-ng) - Unlicense */
(() => {
  "use strict";
  const desktop = document.getElementById("desktop");
  const tasklist = document.getElementById("tasklist");
  const kickoff = document.getElementById("kickoff");
  const launcher = document.getElementById("launcher");

  const openWins = new Map();   // id -> { el, task, minimized, maximized, prevRect }
  let z = 10;
  let cascade = 0;

  // Desktop config (profile, apps, bookmarks), injected by Hugo as JSON
  let SITE = { profile: {}, apps: [], bookmarks: [] };
  try {
    SITE = JSON.parse(document.getElementById("site-data").textContent);
    if (typeof SITE === "string") SITE = JSON.parse(SITE); // Hugo jsonify can double-encode
  } catch (_) {}

  /* ---------- Clock ---------- */
  const timeEl = document.getElementById("clock-time");
  const dateEl = document.getElementById("clock-date");
  function tick() {
    const d = new Date();
    timeEl.textContent = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    dateEl.textContent = d.toLocaleDateString([], { day: "2-digit", month: "short" });
  }
  tick(); setInterval(tick, 1000);

  /* ---------- Window creation ---------- */
  function openWindow(id, payload) {
    if (openWins.has(id)) {
      restore(id); focusWindow(id);
      if (id === "browser" && payload && openWins.get(id).el.__nav) openWins.get(id).el.__nav(payload);
      return;
    }
    const tpl = document.getElementById("tpl-" + id);
    if (!tpl) return;
    if (tpl.dataset.type === "bsod") { bsodWait(); return; }   // "working…" then crashes 😈
    try { history.pushState(null, "", "#" + encodeURIComponent(id)); } catch (_) {}
    const title = tpl.dataset.title || id;
    let icon = tpl.dataset.icon || "🗔";
    try { if (/%[0-9a-f]{2}/i.test(icon)) icon = decodeURIComponent(icon); } catch (_) {}

    const win = document.createElement("div");
    win.className = "window";
    win.dataset.type = tpl.dataset.type || "";   // lets CSS size specific app windows (e.g. the wiki)
    win.dataset.app = id;                          // ...or a specific app by id (e.g. about)
    win.style.zIndex = ++z;
    const startX = 90 + (cascade % 6) * 32;
    const startY = 40 + (cascade % 6) * 30;
    cascade++;
    win.style.left = startX + "px";
    win.style.top = startY + "px";

    win.innerHTML =
      '<div class="titlebar">' +
        '<span class="tb-icon">' + icon + '</span>' +
        '<span class="tb-title"></span>' +
        '<span class="tb-controls">' +
          '<button class="tb-btn min" title="Minimize"><svg viewBox="0 0 10 10"><line x1="2" y1="5" x2="8" y2="5"/></svg></button>' +
          '<button class="tb-btn max" title="Maximize"><svg viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" rx="1"/></svg></button>' +
          '<button class="tb-btn close" title="Close"><svg viewBox="0 0 10 10"><line x1="2.6" y1="2.6" x2="7.4" y2="7.4"/><line x1="7.4" y1="2.6" x2="2.6" y2="7.4"/></svg></button>' +
        '</span>' +
      '</div>' +
      '<div class="win-content"></div>' +
      '<span class="rz rz-n"></span><span class="rz rz-s"></span><span class="rz rz-e"></span><span class="rz rz-w"></span>' +
      '<span class="rz rz-ne"></span><span class="rz rz-nw"></span><span class="rz rz-se"></span><span class="rz rz-sw"></span>';
    win.querySelector(".tb-title").textContent = title;
    win.querySelector(".win-content").appendChild(tpl.content.cloneNode(true));

    desktop.appendChild(win);
    requestAnimationFrame(() => win.classList.add("show"));

    // Taskbar entry
    const task = document.createElement("button");
    task.className = "task";
    task.innerHTML = '<span>' + icon + '</span><span class="tk-title"></span>';
    task.querySelector(".tk-title").textContent = title.split(" - ")[0];
    task.addEventListener("click", () => {
      const w = openWins.get(id);
      if (!w) return;
      if (w.minimized) { restore(id); focusWindow(id); }
      else if (win.classList.contains("active")) minimize(id);
      else focusWindow(id);
    });
    tasklist.appendChild(task);

    openWins.set(id, { el: win, task, minimized: false, maximized: false, prevRect: null });

    // Controls
    win.querySelector(".tb-btn.close").addEventListener("click", e => { e.stopPropagation(); closeWindow(id); });
    win.querySelector(".tb-btn.min").addEventListener("click", e => { e.stopPropagation(); minimize(id); });
    win.querySelector(".tb-btn.max").addEventListener("click", e => { e.stopPropagation(); toggleMax(id); });
    const titlebar = win.querySelector(".titlebar");
    titlebar.addEventListener("dblclick", e => {
      if (!e.target.closest(".tb-btn")) toggleMax(id);
    });
    win.addEventListener("pointerdown", () => focusWindow(id), true);
    makeDraggable(win, id);
    makeResizable(win, id);
    titlebar.addEventListener("contextmenu", e => {
      e.preventDefault();
      const w = openWins.get(id);
      showContextMenu(e.clientX, e.clientY, [
        { icon: "-", label: "Minimize", action: () => minimize(id) },
        { icon: "▢", label: (w && (w.maximized || w.snapped)) ? "Restore" : "Maximize", action: () => toggleMax(id) },
        { sep: true },
        { icon: "✕", label: "Close", action: () => closeWindow(id) },
      ]);
    });

    // Links that open other windows (e.g. blog post buttons)
    win.querySelectorAll(".open-win").forEach(btn => {
      btn.addEventListener("click", () => openWindow(btn.dataset.window));
    });

    const wtype = tpl.dataset.type;
    if (wtype === "terminal") initTerminal(win);
    else if (wtype === "browser") initBrowser(win, payload);
    else if (wtype === "settings") initSettings(win);
    else if (wtype === "calculator") initCalc(win);
    else if (wtype === "sticky") initSticky(win);
    else if (wtype === "sysmon") initSysmon(win);
    else if (wtype === "wiki") initWiki(win);
    else if (wtype === "trash") initTrash(win);

    focusWindow(id);
  }

  // Deep linking: keep the URL hash pointed at the active window
  function syncHash(id) {
    const url = id ? "#" + encodeURIComponent(id) : location.pathname + location.search;
    try { history.replaceState(null, "", url); } catch (_) {}
  }
  function topWindowId() {
    let topId = null, max = -1;
    openWins.forEach((w, wid) => {
      if (w.minimized) return;
      const zz = +w.el.style.zIndex || 0;
      if (zz > max) { max = zz; topId = wid; }
    });
    return topId;
  }

  function focusWindow(id) {
    openWins.forEach((w, key) => {
      const on = key === id;
      w.el.classList.toggle("active", on);
      w.task.classList.toggle("active", on && !w.minimized);
    });
    const w = openWins.get(id);
    if (w) { w.el.style.zIndex = ++z; syncHash(id); }
  }

  function closeWindow(id) {
    const w = openWins.get(id);
    if (!w) return;
    w.el.classList.remove("show");
    setTimeout(() => w.el.remove(), 120);
    w.task.remove();
    openWins.delete(id);
    syncHash(topWindowId());
  }

  function minimize(id) {
    const w = openWins.get(id);
    if (!w) return;
    w.minimized = true;
    const el = w.el;
    el.style.transformOrigin = "bottom center";
    el.classList.add("minimizing");
    el.classList.remove("show", "active");
    setTimeout(() => { if (w.minimized) el.style.display = "none"; }, 170);
    w.task.classList.remove("active");
    w.task.classList.add("minimized");
  }

  function restore(id) {
    const w = openWins.get(id);
    if (!w) return;
    w.minimized = false;
    const el = w.el;
    el.style.display = "";
    void el.offsetWidth;              // reflow so the transition plays
    el.classList.remove("minimizing");
    el.classList.add("show");
    w.task.classList.remove("minimized");
  }

  // Briefly enable geometry transitions (for maximize/restore/snap)
  function animGeom(el) { el.classList.add("win-anim"); setTimeout(() => el.classList.remove("win-anim"), 220); }

  function toggleMax(id) {
    const w = openWins.get(id);
    if (!w) return;
    const el = w.el;
    animGeom(el);
    if (w.maximized) {
      const r = w.prevRect;
      el.style.left = r.left; el.style.top = r.top;
      el.style.width = r.width; el.style.height = r.height;
      el.classList.remove("maximized", "snapped");
      w.maximized = false; w.snapped = false;
    } else {
      w.prevRect = { left: el.style.left, top: el.style.top, width: el.style.width, height: el.style.height };
      el.style.left = "0px"; el.style.top = "0px";
      el.style.width = "100%"; el.style.height = "100%";
      el.classList.add("maximized");
      w.maximized = true;
    }
    focusWindow(id);
  }

  /* ---------- Dragging + edge snapping ---------- */
  const snapPreview = document.createElement("div");
  snapPreview.id = "snap-preview";
  desktop.appendChild(snapPreview);

  function snapRectFor(t) {
    const r = desktop.getBoundingClientRect();
    if (t === "max") return { left: 0, top: 0, width: r.width, height: r.height };
    if (t === "left") return { left: 0, top: 0, width: Math.round(r.width / 2), height: r.height };
    if (t === "right") return { left: Math.round(r.width / 2), top: 0, width: Math.round(r.width / 2), height: r.height };
    return null;
  }
  function detectSnap(cx, cy) {
    const r = desktop.getBoundingClientRect();
    if (cy <= r.top + 8) return "max";
    if (cx <= r.left + 8) return "left";
    if (cx >= r.right - 8) return "right";
    return null;
  }
  function showSnapPreview(t) {
    const rect = snapRectFor(t);
    if (!rect) { snapPreview.classList.remove("show"); return; }
    const firstShow = !snapPreview.classList.contains("show");
    const place = () => {
      snapPreview.style.left = rect.left + "px";
      snapPreview.style.top = rect.top + "px";
      snapPreview.style.width = rect.width + "px";
      snapPreview.style.height = rect.height + "px";
    };
    if (firstShow) {
      // Place without animating in from a stale position, then fade in
      snapPreview.style.transition = "none";
      place();
      void snapPreview.offsetWidth;        // reflow
      snapPreview.style.transition = "";
      snapPreview.classList.add("show");
    } else {
      place();                             // glide between zones via CSS transition
    }
  }
  function applySnap(id, t) {
    const w = openWins.get(id); if (!w) return;
    const el = w.el;
    animGeom(el);
    if (!w.maximized && !w.snapped) {
      w.prevRect = { left: el.style.left, top: el.style.top, width: el.offsetWidth + "px", height: el.offsetHeight + "px" };
    }
    const rect = snapRectFor(t);
    el.style.left = rect.left + "px"; el.style.top = rect.top + "px";
    el.style.width = rect.width + "px"; el.style.height = rect.height + "px";
    el.classList.toggle("maximized", t === "max");
    el.classList.toggle("snapped", t !== "max");
    w.maximized = t === "max";
    w.snapped = t !== "max";
  }

  function makeDraggable(win, id) {
    const bar = win.querySelector(".titlebar");
    const THRESHOLD = 4; // px the pointer must move before a drag (and un-maximize) starts
    let sx, sy, ox, oy, pending = false, dragging = false, snapTarget = null;

    bar.addEventListener("pointerdown", e => {
      if (e.target.closest(".tb-btn")) return;
      pending = true; dragging = false; snapTarget = null;
      sx = e.clientX; sy = e.clientY;
      ox = win.offsetLeft; oy = win.offsetTop;
      bar.setPointerCapture(e.pointerId);
    });

    bar.addEventListener("pointermove", e => {
      if (!pending && !dragging) return;
      // Don't start dragging until the pointer actually moves (so a plain click,
      // even on a maximized window, does nothing - restore needs a double-click).
      if (pending && !dragging) {
        if (Math.abs(e.clientX - sx) < THRESHOLD && Math.abs(e.clientY - sy) < THRESHOLD) return;
        dragging = true;
        const w = openWins.get(id);
        // Un-snap / un-maximize now, restoring floating size under the cursor
        if (w && (w.maximized || w.snapped) && w.prevRect) {
          const pw = parseInt(w.prevRect.width) || 560;
          win.classList.add("win-unsnap");
          setTimeout(() => win.classList.remove("win-unsnap"), 190);
          win.style.width = w.prevRect.width; win.style.height = w.prevRect.height;
          win.classList.remove("maximized", "snapped");
          w.maximized = false; w.snapped = false;
          const dRect = desktop.getBoundingClientRect();
          win.style.left = (e.clientX - dRect.left - pw / 2) + "px";
          win.style.top = (e.clientY - dRect.top - 19) + "px";
        }
        ox = win.offsetLeft; oy = win.offsetTop;   // re-anchor after any un-maximize
        sx = e.clientX; sy = e.clientY;
      }
      let nx = ox + (e.clientX - sx);
      let ny = oy + (e.clientY - sy);
      const maxX = window.innerWidth - 60;
      const maxY = window.innerHeight - 46 - 38;
      nx = Math.max(-win.offsetWidth + 120, Math.min(nx, maxX));
      ny = Math.max(0, Math.min(ny, maxY));
      win.style.left = nx + "px";
      win.style.top = ny + "px";
      snapTarget = detectSnap(e.clientX, e.clientY);
      showSnapPreview(snapTarget);
    });

    bar.addEventListener("pointerup", e => {
      const wasDragging = dragging;
      pending = false; dragging = false;
      try { bar.releasePointerCapture(e.pointerId); } catch (_) {}
      snapPreview.classList.remove("show");
      if (wasDragging && snapTarget) applySnap(id, snapTarget);
      snapTarget = null;
    });
  }

  /* ---------- Resizing ---------- */
  function makeResizable(win, id) {
    const MIN_W = 280, MIN_H = 150;
    win.querySelectorAll(".rz").forEach(h => {
      const dir = h.className.replace("rz rz-", "");
      h.addEventListener("pointerdown", e => {
        const w = openWins.get(id);
        if (w && (w.maximized || w.snapped)) return;
        e.preventDefault(); e.stopPropagation();
        focusWindow(id);
        const sx = e.clientX, sy = e.clientY;
        const r = win.getBoundingClientRect();
        const d = desktop.getBoundingClientRect();
        const L0 = r.left - d.left, T0 = r.top - d.top, W0 = r.width, H0 = r.height;
        h.setPointerCapture(e.pointerId);
        const move = ev => {
          const dx = ev.clientX - sx, dy = ev.clientY - sy;
          let L = L0, T = T0, W = W0, H = H0;
          if (dir.includes("e")) W = Math.max(MIN_W, W0 + dx);
          if (dir.includes("s")) H = Math.max(MIN_H, H0 + dy);
          if (dir.includes("w")) { W = Math.max(MIN_W, W0 - dx); L = L0 + (W0 - W); }
          if (dir.includes("n")) { H = Math.max(MIN_H, H0 - dy); T = T0 + (H0 - H); }
          win.style.left = L + "px"; win.style.top = T + "px";
          win.style.width = W + "px"; win.style.height = H + "px";
        };
        const up = ev => {
          h.removeEventListener("pointermove", move);
          h.removeEventListener("pointerup", up);
          try { h.releasePointerCapture(ev.pointerId); } catch (_) {}
        };
        h.addEventListener("pointermove", move);
        h.addEventListener("pointerup", up);
      });
    });
  }

  /* ---------- Context menu ---------- */
  const ctxMenu = document.createElement("div");
  ctxMenu.id = "context-menu";
  document.body.appendChild(ctxMenu);
  function hideContextMenu() { ctxMenu.style.display = "none"; }
  function showContextMenu(x, y, items) {
    ctxMenu.innerHTML = "";
    items.forEach(it => {
      if (it.sep) { const s = document.createElement("div"); s.className = "cm-sep"; ctxMenu.appendChild(s); return; }
      const b = document.createElement("button");
      b.innerHTML = '<span class="cm-ico">' + (it.icon || "") + "</span>" + it.label;
      b.addEventListener("click", () => { hideContextMenu(); it.action && it.action(); });
      ctxMenu.appendChild(b);
    });
    ctxMenu.style.display = "block";
    const mw = ctxMenu.offsetWidth, mh = ctxMenu.offsetHeight;
    ctxMenu.style.left = Math.min(x, window.innerWidth - mw - 6) + "px";
    ctxMenu.style.top = Math.min(y, window.innerHeight - mh - 6) + "px";
  }
  document.addEventListener("click", hideContextMenu);
  document.addEventListener("scroll", hideContextMenu, true);
  window.addEventListener("blur", hideContextMenu);

  /* ---------- Wallpaper (cycled from the desktop context menu) ---------- */
  const WALLPAPERS = [
    "radial-gradient(1200px 700px at 75% 15%, #3a4a63 0%, transparent 60%), radial-gradient(900px 600px at 15% 85%, #2b3b55 0%, transparent 55%), linear-gradient(135deg, #1a2030 0%, #232c3d 50%, #2a3447 100%)",
    "radial-gradient(1000px 700px at 80% 10%, #4a3a63 0%, transparent 60%), linear-gradient(135deg, #241a30 0%, #2d2440 55%, #3a2a47 100%)",
    "radial-gradient(1000px 700px at 20% 20%, #1f5a52 0%, transparent 60%), linear-gradient(135deg, #122421 0%, #16302b 55%, #173b33 100%)",
    "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
    "linear-gradient(135deg, #232526 0%, #414345 100%)",
    // CSS-shape patterns (no images)
    "radial-gradient(#ffffff12 1.5px, transparent 1.6px) 0 0 / 22px 22px, linear-gradient(135deg, #1b2735 0%, #243447 100%)",
    "linear-gradient(#ffffff10 1px, transparent 1px) 0 0/34px 34px, linear-gradient(90deg, #ffffff10 1px, transparent 1px) 0 0/34px 34px, linear-gradient(135deg, #172033 0%, #222f45 100%)",
    "repeating-linear-gradient(45deg, #ffffff0a 0 14px, transparent 14px 28px), linear-gradient(135deg, #1e2433 0%, #2b3550 100%)",
    "conic-gradient(from 45deg at 50% 50%, #ffffff0d 0 25%, transparent 0 50%) 0 0/46px 46px, linear-gradient(135deg, #201a2e 0%, #2c2440 100%)",
    "radial-gradient(circle at 18% 22%, #3daee955 0, transparent 38%), radial-gradient(circle at 82% 30%, #9b59b655 0, transparent 36%), radial-gradient(circle at 50% 85%, #1abc9c55 0, transparent 40%), linear-gradient(135deg, #141a26, #1d2433)",
  ];
  let wallIdx = parseInt(localStorage.getItem("kde-wall") || "0", 10) || 0;
  function applyWallpaper(i) {
    wallIdx = ((i % WALLPAPERS.length) + WALLPAPERS.length) % WALLPAPERS.length;
    desktop.style.background = WALLPAPERS[wallIdx];
    localStorage.setItem("kde-wall", String(wallIdx));
    document.dispatchEvent(new CustomEvent("kde-settings-changed"));
  }
  if (wallIdx) applyWallpaper(wallIdx);

  /* ---------- Accent + light/dark theme (persisted) ---------- */
  const ACCENTS = ["#3daee9", "#9b59b6", "#27ae60", "#e67e22", "#e74c3c", "#f1c40f", "#1abc9c", "#fc4384"];
  function applyAccent(c) {
    document.documentElement.style.setProperty("--accent", c);
    localStorage.setItem("kde-accent", c);
    document.dispatchEvent(new CustomEvent("kde-settings-changed"));
  }
  function applyTheme(mode) {
    document.body.classList.toggle("light", mode === "light");
    localStorage.setItem("kde-theme", mode);
    document.dispatchEvent(new CustomEvent("kde-settings-changed"));
  }
  const savedAccent = localStorage.getItem("kde-accent");
  if (savedAccent) document.documentElement.style.setProperty("--accent", savedAccent);
  if (localStorage.getItem("kde-theme") === "light") document.body.classList.add("light");

  desktop.addEventListener("contextmenu", e => {
    if (e.target.closest(".window")) return; // windows have their own menu
    e.preventDefault();
    const items = [
      { icon: "🗖", label: showingDesktop ? "Restore windows" : "Show desktop", action: toggleShowDesktop },
    ];
    if (!currentEra()) items.push({ icon: "⚙️", label: "Display settings", action: () => openWindow("settings") });
    items.push({ sep: true }, { icon: "⟳", label: "Refresh", action: () => location.reload() });
    showContextMenu(e.clientX, e.clientY, items);
  });

  /* ---------- Desktop icons ---------- */
  document.querySelectorAll(".desk-icon[data-window]").forEach(icon => {
    icon.addEventListener("dblclick", () => openWindow(icon.dataset.window, icon.dataset.url));
    icon.addEventListener("click", e => {
      document.querySelectorAll(".desk-icon").forEach(i => i.classList.remove("selected"));
      icon.classList.add("selected");
      e.stopPropagation();
    });
  });

  // Touch-friendly: single tap opens on touch devices
  if (window.matchMedia("(pointer: coarse)").matches) {
    document.querySelectorAll(".desk-icon[data-window]").forEach(icon => {
      icon.addEventListener("click", () => openWindow(icon.dataset.window, icon.dataset.url));
    });
  }

  /* ---------- Kickoff launcher ---------- */
  function toggleKickoff(show) {
    const open = show ?? !kickoff.classList.contains("open");
    kickoff.classList.toggle("open", open);
    launcher.classList.toggle("active", open);
  }
  launcher.addEventListener("click", e => { e.stopPropagation(); toggleKickoff(); });
  kickoff.querySelectorAll(".kickoff-app").forEach(btn => {
    btn.addEventListener("click", () => { openWindow(btn.dataset.window, btn.dataset.url); toggleKickoff(false); });
  });

  /* ---------- Desktop click: clear selection + close menus ---------- */
  desktop.addEventListener("click", e => {
    if (e.target === desktop || e.target.classList.contains("desktop-icons")) {
      document.querySelectorAll(".desk-icon").forEach(i => i.classList.remove("selected"));
    }
    toggleKickoff(false);
  });
  document.addEventListener("click", e => {
    if (!e.target.closest("#kickoff") && !e.target.closest("#launcher")) toggleKickoff(false);
  });

  /* ---------- Terminal app ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function initTerminal(win) {
    const out = win.querySelector(".term-out");
    const input = win.querySelector(".term-input");
    const term = win.querySelector(".terminal");
    const profile = SITE.profile || {};
    const apps = SITE.apps || [];
    const history = [];
    let hi = -1;

    const print = html => { const d = document.createElement("div"); d.className = "ln"; d.innerHTML = html; out.appendChild(d); };
    const scroller = win.querySelector(".win-content") || term;   // the actual scroll container
    const scroll = () => { scroller.scrollTop = scroller.scrollHeight; };
    const openable = apps.filter(a => a.type !== "web");

    function banner() {
      print('<span class="acc">' +
        " _   _  _   _   ____   ___   ____  \n" +
        "| | | || | | | / ___| / _ \\ / ___| \n" +
        "| |_| || | | || |  _ | | | |\\___ \\ \n" +
        "|  _  || |_| || |_| || |_| | ___) |\n" +
        "|_| |_| \\___/  \\____| \\___/ |____/ " +
        '</span>');
      print('<span class="dim">Welcome to hugOS Web Desktop</span>');
      print('Type <span class="ok">help</span> for commands. Try <span class="ok">neofetch</span> or <span class="ok">open about</span>.');
      print("");
    }

    const HOME = "/home/user";
    const MAN = {
      help: "help - list available commands",
      whoami: "whoami - print the current user",
      uname: "uname [-a] - print system information",
      uptime: "uptime - how long the session has been running",
      date: "date - print the current date and time",
      neofetch: "neofetch - system information with a logo",
      history: "history - show recently typed commands",
      ls: "ls [-l] - list applications (the files on this desktop)",
      pwd: "pwd - print the working directory",
      cd: "cd [dir] - change directory",
      cat: "cat <name> - print a file to the screen",
      open: "open <app> - open an application window",
      echo: "echo <text> - write text to the screen",
      clear: "clear - clear the terminal (or Ctrl+L)",
      exit: "exit - close the terminal",
      man: "man <cmd> - show the manual page for a command",
      fortune: "fortune - print a pseudo-random aphorism",
      cowsay: "cowsay <text> - a cow says something",
      sudo: "sudo <cmd> - execute a command as the superuser",
      rm: "rm [-rf] <path> - remove files or directories",
      bsod: "bsod - trigger a crash screen",
    };
    const commands = {
      help() {
        const r = fmt;
        return '<h3>Commands</h3>' +
          '<span class="dim">system</span>\n' +
          r("help", "this list") + r("whoami", "current user") +
          r("uname -a", "system information") + r("uptime", "session uptime") +
          r("date", "current date / time") + r("neofetch", "system info + logo") +
          r("history", "recently typed commands") +
          '\n<span class="dim">files</span>\n' +
          r("ls [-l] / apps", "list applications") + r("pwd", "working directory") +
          r("cd &lt;dir&gt;", "change directory") + r("cat &lt;name&gt;", "print a file") +
          r("open &lt;app&gt;", "open an app window") +
          '\n<span class="dim">shell</span>\n' +
          r("echo &lt;text&gt;", "print text") + r("man &lt;cmd&gt;", "manual page") +
          r("clear", "clear the screen") + r("exit", "close the terminal") +
          '\n<span class="dim">fun</span>\n' +
          r("fortune", "a random aphorism") + r("cowsay &lt;text&gt;", "a cow says it") +
          r("sudo &lt;cmd&gt;", "run as superuser") + r("rm -rf &lt;path&gt;", "remove files") +
          r("bsod", "trigger a crash");
      },
      whoami() { return '<span class="acc">' + esc(profile.name || "guest") + "</span>" + (profile.role ? " - " + esc(profile.role) : ""); },
      about() { return esc(profile.about || profile.name || "No bio configured."); },
      uname(args) {
        if ((args[0] || "") === "-a") return "hugOS hugos 1.0-web #1 SMP " + new Date().getFullYear() + " x86_64 Hugo/GNU Web";
        return "hugOS";
      },
      uptime() {
        const mins = Math.max(1, Math.floor(performance.now() / 60000));
        return new Date().toTimeString().slice(0, 5) + "  up " + mins + " min,  1 user,  load average: 0.00, 0.01, 0.05";
      },
      history() {
        if (!history.length) return '<span class="dim">(no history yet)</span>';
        return history.slice().reverse().map((h, i) => "  " + String(i + 1).padStart(3) + "  " + esc(h)).join("\n");
      },
      pwd() { return HOME; },
      apps() {
        return '<h3>Applications</h3>' + openable.map(a =>
          '  <span class="ok">' + esc(a.id) + "</span>" + "&nbsp;".repeat(Math.max(2, 16 - a.id.length)) +
          '<span class="dim">' + esc(a.label || "") + "</span>").join("\n") +
          '\n<span class="dim">Run </span><span class="ok">open &lt;name&gt;</span><span class="dim"> to launch.</span>';
      },
      ls(args) {
        const long = (args[0] || "").startsWith("-") && args[0].includes("l");
        if (!long) return openable.map(a =>
          (a.type === "folder" || a.type === "wiki" ? '<span class="ok">' + esc(a.id) + "/</span>" : '<span class="acc">' + esc(a.id) + "</span>")
        ).join("  ");
        return '<span class="dim">total ' + openable.length + "</span>\n" + openable.map(a => {
          const dir = a.type === "folder" || a.type === "wiki";
          const perms = dir ? "drwxr-xr-x" : "-rw-r--r--";
          const size = String(1024 + (esc(a.label || a.id).length * 137 % 8000)).padStart(6);
          const name = dir ? '<span class="ok">' + esc(a.id) + "/</span>" : '<span class="acc">' + esc(a.id) + "</span>";
          return perms + "  user  user " + size + "  " + name;
        }).join("\n");
      },
      neofetch() {
        const u = profile.name || "user";
        return '<span class="acc">' +
          "      .---.       </span><span class=\"ok\">" + esc(u) + "@hugos</span>\n" +
          '<span class="acc">     /     \\      </span>-------------------\n' +
          '<span class="acc">     \\.@-@./      </span><span class="acc">OS</span>      hugOS\n' +
          '<span class="acc">     /`\\_/`\\      </span><span class="acc">DE</span>      Hugo Desktop\n' +
          '<span class="acc">    //  _  \\\\     </span><span class="acc">WM</span>      windows.js\n' +
          '<span class="acc">   | \\     )|_    </span><span class="acc">Shell</span>   hugosh\n' +
          '<span class="acc">  /`\\_`>  <_/ \\   </span><span class="acc">Apps</span>    ' + openable.length + " installed\n" +
          '<span class="acc">  \\__/\'---\'\\__/   </span><span class="acc">Theme</span>   Dark';
      },
      date() { return new Date().toString(); },
      clear() { out.innerHTML = ""; return null; },
      exit() { setTimeout(() => closeWindow("terminal"), 60); return '<span class="dim">logout</span>'; },
      sudo() { return '<span class="warn">user is not in the sudoers file. This incident will be reported. 😏</span>'; },
    };
    function fmt(c, d) { return '  <span class="ok">' + c + "</span>" + "&nbsp;".repeat(Math.max(2, 22 - c.replace(/&[a-z]+;/g, "x").length)) + '<span class="dim">' + d + "</span>\n"; }

    function run(raw) {
      const line = raw.trim();
      print('<span class="ok">user@hugos</span><span class="acc">:~</span>$ <span class="cmd-echo">' + esc(line) + "</span>");
      if (!line) return;
      history.unshift(line); hi = -1;
      const [cmd, ...args] = line.split(/\s+/);
      const c = cmd.toLowerCase();

      if (c === "open") {
        const target = (args[0] || "").toLowerCase();
        const app = apps.find(a => a.id === target);
        if (app) { print('<span class="dim">opening ' + esc(target) + "…</span>"); openWindow(app.type === "web" ? "browser" : app.id, app.url || undefined); }
        else print('<span class="err">open: unknown app \'' + esc(args[0] || "") + "'</span> - try <span class=\"ok\">apps</span>");
        return;
      }
      if (c === "echo") { print(esc(args.join(" "))); return; }
      if (c === "cd") {
        const d = (args[0] || "").replace(/\/+$/, "");
        if (!d || d === "~" || d === HOME || d === ".") return;   // already home, no-op
        print('<span class="err">cd: ' + esc(args[0]) + ": No such file or directory</span>"); return;
      }
      if (c === "cat") {
        const f = (args[0] || "").replace(/\.md$/i, "").toLowerCase();
        if (!f) { print('<span class="dim">usage: cat &lt;name&gt;</span>'); return; }
        if (f === "about" || f === "readme") { print(esc(profile.about || profile.name || "No bio configured.")); return; }
        const app = openable.find(a => a.id === f);
        if (app) { print('<span class="dim">' + esc(f) + ': opens in a window - try </span><span class="ok">open ' + esc(f) + "</span>"); return; }
        print('<span class="err">cat: ' + esc(args[0]) + ": No such file or directory</span>"); return;
      }
      if (c === "man") {
        const m = (args[0] || "").toLowerCase();
        if (!m) { print('<span class="dim">What manual page do you want? Try </span><span class="ok">man ls</span>'); return; }
        if (MAN[m]) { print('<span class="acc">' + esc(MAN[m]) + "</span>"); return; }
        print('<span class="err">No manual entry for ' + esc(args[0]) + "</span>"); return;
      }

      // ----- the fun ones (now listed in help) -----
      if (c === "rm") {
        const flags = args.filter(a => a.startsWith("-")).join("");
        const target = args.filter(a => !a.startsWith("-")).join(" ");
        if (flags.includes("r") && (["/", "*", ".", "~", "~/"].includes(target) || target === "")) {
          print('<span class="err">Deleting everything' + (target ? " in " + esc(target) : "") + "…</span>");
          const victims = ["/bin", "/etc", "/home", "/usr/lib", "~/.ssh", "homework.docx", "the_cloud", "your_browser_tabs"];
          let n = 0;
          const iv = setInterval(() => {
            if (n < victims.length) { print('<span class="dim">removed ' + esc(victims[n++]) + "</span>"); scroll(); }
            else { clearInterval(iv); print('<span class="ok">…just kidding 😄 nothing was harmed.</span>'); scroll(); }
          }, 200);
          return;
        }
        print('<span class="dim">rm: it\'s a website. Nice try though.</span>'); return;
      }
      if (c === "sudo") {
        if (args.join(" ").toLowerCase() === "make me a sandwich") { print("🥪 <span class=\"dim\">Okay.</span>"); return; }
        print('<span class="warn">user is not in the sudoers file. This incident will be reported. 😏</span>'); return;
      }
      if (c === "fortune") {
        const F = [
          "The best way to predict the future is to render it statically.",
          "There are 10 kinds of people: those who get binary and those who don't.",
          "A clean desktop is a sign of a cluttered drawer.",
          "Weeks of coding can save you hours of planning.",
          "It works on my machine. ¯\\_(ツ)_/¯",
          "There is no place like 127.0.0.1.",
        ];
        print('<span class="acc">' + esc(F[Math.floor(Math.random() * F.length)]) + "</span>"); return;
      }
      if (c === "cowsay") {
        const t = (args.join(" ") || "Moo!").slice(0, 42);
        const line = "_".repeat(t.length + 2);
        print('<span class="acc">' +
          " " + line + "\n" +
          "&lt; " + esc(t) + " &gt;\n" +
          " " + "-".repeat(t.length + 2) + "\n" +
          "        \\   ^__^\n" +
          "         \\  (oo)\\_______\n" +
          "            (__)\\       )\\/\\\n" +
          "                ||----w |\n" +
          "                ||     ||" +
          "</span>");
        return;
      }
      if (c === "bsod" || c === "crash") { print('<span class="err">A fatal exception has occurred. 💀</span>'); setTimeout(triggerBSOD, 250); return; }

      if (commands[c]) { const r = commands[c](args); if (r !== null) print(r); return; }
      print('<span class="err">' + esc(cmd) + ": command not found</span> - type <span class=\"ok\">help</span>");
    }

    input.addEventListener("keydown", e => {
      if (e.key === "Enter") { run(input.value); input.value = ""; scroll(); }
      else if (e.key === "ArrowUp") { if (hi < history.length - 1) { hi++; input.value = history[hi]; } e.preventDefault(); }
      else if (e.key === "ArrowDown") { if (hi > 0) { hi--; input.value = history[hi]; } else { hi = -1; input.value = ""; } e.preventDefault(); }
      else if (e.key === "l" && e.ctrlKey) { out.innerHTML = ""; e.preventDefault(); }
    });
    term.addEventListener("mousedown", e => { if (!e.target.closest("a")) setTimeout(() => input.focus(), 0); });

    banner();
    setTimeout(() => input.focus(), 30);
  }

  /* ---------- Browser app ---------- */
  // Sites known to block embedding via X-Frame-Options / CSP frame-ancestors.
  const FRAME_BLOCK = ["linkedin.com", "x.com", "twitter.com", "facebook.com", "instagram.com", "google.com", "youtube.com", "reddit.com"];

  function initBrowser(win, startUrl) {
    const bookmarks = SITE.bookmarks || [];
    const view = win.querySelector(".browser-view");
    const urlBar = win.querySelector(".url-bar");
    const lock = win.querySelector(".url-lock");
    const backBtn = win.querySelector(".nav-back");
    const fwdBtn = win.querySelector(".nav-fwd");
    const reloadBtn = win.querySelector(".nav-reload");
    const homeBtn = win.querySelector(".nav-home");
    const extBtn = win.querySelector(".nav-ext");

    const hist = [];
    let idx = -1;

    const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (_) { return ""; } };
    function normalize(u) {
      u = (u || "").trim();
      if (!u || u === "home" || u === "about:home") return "home";
      if (u === "hugoogle") return "hugoogle";
      if (u.startsWith("mailto:")) return u;
      if (!/^https?:\/\//i.test(u)) {
        if (/^[\w-]+(\.[\w-]+)+/.test(u) && !u.includes(" ")) u = "https://" + u;
        else return "search:" + encodeURIComponent(u);   // not a URL -> Hugoogle "search"
      }
      return u;
    }

    function setNav() { backBtn.disabled = idx <= 0; fwdBtn.disabled = idx >= hist.length - 1; }

    function render(url) {
      if (url === "home") {
        urlBar.value = ""; lock.textContent = "🏠"; extBtn.disabled = true; renderHome(); return;
      }
      // pre-HTTPS eras ('95/XP) show http:// and no padlock; later eras are secure
      const oldWeb = currentEra() === "win95" || currentEra() === "winxp";
      const proto = oldWeb ? "http://" : "https://";
      const lockIcon = oldWeb ? "🌐" : "🔒";
      if (url === "hugoogle") {
        urlBar.value = proto + "hugoogle.com"; lock.textContent = lockIcon; extBtn.disabled = true; renderHugoogle(); return;
      }
      if (url.startsWith("search:")) {
        const q = decodeURIComponent(url.slice(7));
        urlBar.value = proto + "hugoogle.com/search?q=" + encodeURIComponent(q); lock.textContent = lockIcon; extBtn.disabled = true; renderSearch(q); return;
      }
      extBtn.disabled = false;
      if (url.startsWith("mailto:")) { window.open(url); return; }
      urlBar.value = url;
      lock.textContent = url.startsWith("https") ? "🔒" : "🌐";
      const host = hostOf(url);
      if (host === "github.com") return renderGitHub(url);
      if (FRAME_BLOCK.some(d => host === d || host.endsWith("." + d))) return renderBlocked(url, host);
      renderIframe(url);
    }

    function navigate(u) {
      const url = normalize(u);
      if (url.startsWith("mailto:")) { window.open(url); return; }
      hist.splice(idx + 1); hist.push(url); idx = hist.length - 1;
      setNav(); render(url);
    }
    win.__nav = navigate;

    const HG_WORD =
      '<span style="color:#4285f4">H</span><span style="color:#ea4335">u</span>' +
      '<span style="color:#fbbc05">g</span><span style="color:#4285f4">o</span>' +
      '<span style="color:#34a853">o</span><span style="color:#ea4335">g</span>' +
      '<span style="color:#fbbc05">l</span><span style="color:#4285f4">e</span>';
    function renderHome() {
      const tiles =
        '<button class="tile" data-go="hugoogle"><span class="ti">🔍</span><span class="tn">Hugoogle</span></button>' +
        bookmarks.map(t => '<button class="tile" data-go="' + esc(t.url) + '"><span class="ti">' + (t.icon || "🔖") + '</span><span class="tn">' + esc(t.label || t.url) + "</span></button>").join("");
      view.innerHTML = '<div class="bhome"><div class="logo">🌐</div><h2>Browser</h2><div class="tiles">' + tiles +
        '</div><p class="dim" style="margin-top:22px;font-size:12px">Pick a site, or type a URL above. Some sites block embedding - those open in a new tab.</p></div>';
    }
    function renderHugoogle() {
      view.innerHTML =
        '<div class="hugoogle">' +
          '<div class="hg-logo">' + HG_WORD + "</div>" +
          '<div class="hg-box"><span class="hg-mag">🔍</span>' +
            '<input class="hg-input" placeholder="Search the entire web (results sold separately)" autocomplete="off" spellcheck="false"></div>' +
          '<div class="hg-btns">' +
            '<button class="hg-btn" data-search>Hugoogle Search</button>' +
            '<button class="hg-btn" data-lucky>I’m Feeling Lucky</button>' +
          "</div>" +
          '<p class="hg-tag">Hugoogle does not index, track, or in fact search anything at all. Please enjoy the placebo.</p>' +
        "</div>";
      const inp = view.querySelector(".hg-input"); if (inp) setTimeout(() => inp.focus(), 30);
    }
    function renderSearch(q) {
      const safe = esc(q);
      const slug = safe.toLowerCase().replace(/\s+/g, "-") || "nothing";
      const ms = (Math.random() * 0.9 + 0.04).toFixed(2);
      const results = [
        ["The Truth About “" + safe + "” - Hugoogle Knowledge", "hugoogle.com › wisdom › " + slug,
          "Those who search for “" + safe + "” already know the answer in their heart. Hugoogle merely confirms it, for a small fee of zero."],
        ["How to " + safe + " - wikiNope", "wikinope.org › how-to › " + slug,
          "Step 1: have you tried not? Step 2: reconsider your choices. Step 3: run <code>hugo server</code> and feel better."],
        ["“" + safe + "” [closed] - Snack Overflow", "snackoverflow.com › questions › 42",
          "Marked as a duplicate of a question from 2009. Reopened, then closed again out of principle."],
        ["Buy “" + safe + "” online - Hugzon", "hugzon.com › dp › B00HUGO",
          "Currently out of stock. Demand was, frankly, unexpected. Customers also bought: touching grass."],
      ];
      view.innerHTML =
        '<div class="hg-results">' +
          '<div class="hg-mini">' + HG_WORD + "</div>" +
          '<div class="hg-stats">About 0 results (' + ms + " seconds). None of them are relevant.</div>" +
          '<div class="hg-did">Did you mean: <button class="hg-link" data-q="hugo server">hugo server</button>?</div>' +
          results.map(r =>
            '<div class="hg-result"><div class="hg-rurl">' + r[1] + "</div>" +
            '<a class="hg-rtitle" data-q="' + esc(q) + '">' + r[0] + "</a><p>" + r[2] + "</p></div>").join("") +
          '<div class="hg-foot"><button class="hg-link" data-go="hugoogle">← Back to Hugoogle</button></div>' +
        "</div>";
    }
    function renderLucky() {
      const jokes = [
        "🍀 You feel lucky. Hugoogle does not share your optimism.",
        "Error 404: luck not found. Please try again never.",
        "Congratulations! You’ve won a free iframe. It refuses to load.",
        "The house always wins. You are not the house.",
        "Hugoogle consulted the stars. The stars said: <code>git commit</code>.",
        "You have been redirected to exactly where you started. Lucky you.",
      ];
      view.innerHTML =
        '<div class="hg-lucky"><div class="hg-clover">🍀</div><p>' +
        jokes[Math.floor(Math.random() * jokes.length)] + "</p>" +
        '<button class="hg-link" data-go="hugoogle">← Back to Hugoogle</button></div>';
    }

    function renderIframe(url) {
      view.innerHTML = '<div data-spin style="position:absolute;inset:0;display:grid;place-items:center;background:#0d1117"><div class="spinner"></div></div>';
      const f = document.createElement("iframe");
      f.referrerPolicy = "no-referrer";
      f.addEventListener("load", () => { const s = view.querySelector("[data-spin]"); if (s) s.remove(); });
      f.src = url;
      view.appendChild(f);
    }

    function blockedHtml(url, host, extra) {
      return '<div class="bpage"><div class="big">🔒</div><h2>' + esc(host) + " won't embed</h2>" +
        "<p>" + (extra || "This site sends an <code>X-Frame-Options</code> header that stops it loading inside another page - a security setting on their end, not something we can override.") + "</p>" +
        '<p class="url">' + esc(url) + "</p>" +
        '<button class="btn-ext" data-open="' + esc(url) + '">Open in new tab ↗</button></div>';
    }
    function renderBlocked(url, host) { view.innerHTML = blockedHtml(url, host); }

    async function renderGitHub(url) {
      let user = "paradox-ng";
      try { const p = new URL(url).pathname.split("/").filter(Boolean); if (p[0]) user = p[0]; } catch (_) {}
      view.innerHTML = '<div class="bpage"><div class="spinner"></div><p>Loading github.com/' + esc(user) + "…</p></div>";
      try {
        const [uRes, rRes] = await Promise.all([
          fetch("https://api.github.com/users/" + user),
          fetch("https://api.github.com/users/" + user + "/repos?sort=updated&per_page=30"),
        ]);
        if (!uRes.ok) throw new Error("HTTP " + uRes.status);
        const u = await uRes.json();
        const repos = rRes.ok ? await rRes.json() : [];
        view.innerHTML = ghTemplate(u, repos);
      } catch (e) {
        view.innerHTML = blockedHtml(url, "github.com",
          "Couldn't reach the GitHub API (" + esc(e.message) + "). It may be rate-limited or offline - open the real page instead:");
      }
    }

    function ghTemplate(u, repos) {
      const meta = [];
      if (u.location) meta.push("📍 " + esc(u.location));
      meta.push("👥 " + (u.followers || 0) + " followers · " + (u.following || 0) + " following");
      meta.push("📦 " + (u.public_repos || 0) + " repos");
      const cards = (repos || []).slice(0, 12).map(r =>
        '<div class="ghp-repo"><a href="' + esc(r.html_url) + '" target="_blank" rel="noopener">' + esc(r.name) + "</a>" +
        (r.fork ? ' <span class="dim" style="font-size:11px">· forked</span>' : "") +
        "<p>" + esc(r.description || "No description.") + "</p><div class=\"rmeta\">" +
        (r.language ? '<span><span class="ghp-dot"></span>' + esc(r.language) + "</span>" : "") +
        "<span>★ " + (r.stargazers_count || 0) + "</span><span>⑂ " + (r.forks_count || 0) + "</span></div></div>"
      ).join("");
      return '<div class="ghp"><div class="ghp-top">' +
        '<img class="ghp-avatar" src="' + esc(u.avatar_url) + '" alt="">' +
        '<div><div class="ghp-name">' + esc(u.name || u.login) + ' <span class="ghp-login">' + esc(u.login) + "</span></div>" +
        (u.bio ? '<div class="ghp-bio">' + esc(u.bio) + "</div>" : "") +
        '<div class="ghp-meta">' + meta.map(m => "<span>" + m + "</span>").join("") + "</div></div></div>" +
        "<h3>Repositories</h3><div class=\"ghp-repos\">" + cards + "</div></div>";
    }

    // Toolbar wiring
    backBtn.addEventListener("click", () => { if (idx > 0) { idx--; setNav(); render(hist[idx]); } });
    fwdBtn.addEventListener("click", () => { if (idx < hist.length - 1) { idx++; setNav(); render(hist[idx]); } });
    reloadBtn.addEventListener("click", () => render(hist[idx] || "home"));
    homeBtn.addEventListener("click", () => navigate("home"));
    extBtn.addEventListener("click", () => { const c = hist[idx]; if (c && c !== "home") window.open(c, "_blank", "noopener"); });
    urlBar.addEventListener("keydown", e => { if (e.key === "Enter") navigate(urlBar.value); });
    view.addEventListener("click", e => {
      const open = e.target.closest("[data-open]");
      if (open) { window.open(open.dataset.open, "_blank", "noopener"); return; }
      if (e.target.closest("[data-search]")) { const i = view.querySelector(".hg-input"); navigate(i ? i.value : ""); return; }
      if (e.target.closest("[data-lucky]")) { renderLucky(); return; }
      const sq = e.target.closest("[data-q]");
      if (sq) { navigate(sq.dataset.q); return; }
      const go = e.target.closest("[data-go]");
      if (go) navigate(go.dataset.go);
    });
    view.addEventListener("keydown", e => {
      if (e.key === "Enter" && e.target.classList && e.target.classList.contains("hg-input")) { e.preventDefault(); navigate(e.target.value); }
    });

    navigate(startUrl || "home");
  }

  /* ---------- Photo lightbox (used by gallery apps) ---------- */
  const lightbox = document.createElement("div");
  lightbox.id = "lightbox";
  lightbox.innerHTML =
    '<span class="lb-counter"></span>' +
    '<button class="lb-close" title="Close (Esc)">✕</button>' +
    '<button class="lb-nav lb-prev" title="Previous (←)">‹</button>' +
    '<img class="lb-img" alt="">' +
    '<button class="lb-nav lb-next" title="Next (→)">›</button>' +
    '<div class="lb-cap"></div>';
  document.body.appendChild(lightbox);
  let lbItems = [], lbIdx = 0;
  function lbShow() {
    const it = lbItems[lbIdx]; if (!it) return;
    lightbox.querySelector(".lb-img").src = it.full;
    lightbox.querySelector(".lb-cap").textContent = it.cap || "";
    lightbox.querySelector(".lb-counter").textContent = (lbIdx + 1) + " / " + lbItems.length;
  }
  function openLightbox(items, idx) {
    lbItems = items; lbIdx = idx;
    lightbox.querySelector(".lb-img").classList.remove("slide-r", "slide-l");
    lbShow();
    lightbox.classList.add("show");
  }
  function closeLightbox() { lightbox.classList.remove("show"); }
  function lbStep(d) {
    lbIdx = (lbIdx + d + lbItems.length) % lbItems.length;
    const img = lightbox.querySelector(".lb-img");
    img.classList.remove("slide-r", "slide-l");
    lbShow();
    void img.offsetWidth;                       // restart the slide animation
    img.classList.add(d > 0 ? "slide-r" : "slide-l");
  }
  lightbox.querySelector(".lb-close").addEventListener("click", closeLightbox);
  lightbox.querySelector(".lb-prev").addEventListener("click", e => { e.stopPropagation(); lbStep(-1); });
  lightbox.querySelector(".lb-next").addEventListener("click", e => { e.stopPropagation(); lbStep(1); });
  lightbox.addEventListener("click", e => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener("keydown", e => {
    if (!lightbox.classList.contains("show")) return;
    if (e.key === "Escape") closeLightbox();
    else if (e.key === "ArrowLeft") lbStep(-1);
    else if (e.key === "ArrowRight") lbStep(1);
  });
  document.addEventListener("click", e => {
    const thumb = e.target.closest(".photo-thumb");
    if (!thumb) return;
    const thumbs = [...thumb.closest(".gallery").querySelectorAll(".photo-thumb")];
    openLightbox(thumbs.map(t => ({ full: t.dataset.full, cap: t.dataset.caption || "" })), thumbs.indexOf(thumb));
  });

  /* ---------- Settings app ---------- */
  function initSettings(win) {
    const root = win.querySelector(".settings");
    const currentAccent = () => (localStorage.getItem("kde-accent") || ACCENTS[0]).toLowerCase();
    const currentTheme = () => localStorage.getItem("kde-theme") || "dark";

    root.innerHTML =
      '<section><h3>Accent colour</h3><div class="swatches">' +
        ACCENTS.map(c => '<button class="swatch" data-accent="' + c + '" style="background:' + c + '" title="' + c + '"></button>').join("") +
      '</div></section>' +
      '<section><h3>Appearance</h3><div class="seg">' +
        '<button data-theme="dark">🌙 Dark</button><button data-theme="light">☀️ Light</button>' +
      '</div></section>' +
      '<section><h3>Wallpaper</h3><div class="walls">' +
        WALLPAPERS.map((w, i) => '<button class="wall" data-wall="' + i + '" style="background:' + w + '"></button>').join("") +
      '</div></section>' +
      '<p class="muted small">Changes are saved in this browser.</p>';

    function mark() {
      root.querySelectorAll(".swatch").forEach(b => b.classList.toggle("active", b.dataset.accent.toLowerCase() === currentAccent()));
      root.querySelectorAll(".seg button").forEach(b => b.classList.toggle("active", b.dataset.theme === currentTheme()));
      root.querySelectorAll(".wall").forEach(b => b.classList.toggle("active", +b.dataset.wall === wallIdx));
    }
    mark();

    root.addEventListener("click", e => {
      const sw = e.target.closest(".swatch");
      if (sw) { applyAccent(sw.dataset.accent); mark(); return; }
      const th = e.target.closest("[data-theme]");
      if (th) { applyTheme(th.dataset.theme); mark(); return; }
      const wl = e.target.closest(".wall");
      if (wl) { applyWallpaper(+wl.dataset.wall); mark(); return; }
    });
    // keep in sync if another surface (context menu) changes settings
    document.addEventListener("kde-settings-changed", mark);
  }

  /* ---------- Show desktop (button + Meta+D + context menu) ---------- */
  const showDesktopBtn = document.getElementById("show-desktop");
  let showingDesktop = false, hiddenByShowDesktop = [];
  function toggleShowDesktop() {
    if (!showingDesktop) {
      hiddenByShowDesktop = [];
      openWins.forEach((w, id) => { if (!w.minimized) { hiddenByShowDesktop.push(id); minimize(id); } });
      showingDesktop = true;
    } else {
      hiddenByShowDesktop.forEach(id => { if (openWins.has(id)) restore(id); });
      hiddenByShowDesktop = [];
      showingDesktop = false;
    }
  }
  if (showDesktopBtn) showDesktopBtn.addEventListener("click", toggleShowDesktop);

  /* ---------- Calendar popup (click the clock) ---------- */
  const clockEl = document.getElementById("clock");
  const calendar = document.createElement("div");
  calendar.id = "calendar";
  calendar.classList.add("hidden");
  document.body.appendChild(calendar);
  let calView = new Date();
  function renderCalendar() {
    const today = new Date();
    const y = calView.getFullYear(), m = calView.getMonth();
    const startDay = (new Date(y, m, 1).getDay() + 6) % 7; // Monday-first
    const days = new Date(y, m + 1, 0).getDate();
    const title = calView.toLocaleString([], { month: "long", year: "numeric" });
    let cells = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(d => '<span class="cal-dow">' + d + "</span>").join("");
    for (let i = 0; i < startDay; i++) cells += "<span></span>";
    for (let d = 1; d <= days; d++) {
      const isToday = d === today.getDate() && m === today.getMonth() && y === today.getFullYear();
      cells += '<span class="cal-day' + (isToday ? " today" : "") + '">' + d + "</span>";
    }
    calendar.innerHTML =
      '<div class="cal-head"><button class="cal-prev" title="Previous month">‹</button>' +
      '<span class="cal-title">' + title + "</span>" +
      '<button class="cal-next" title="Next month">›</button></div>' +
      '<div class="cal-grid">' + cells + "</div>" +
      '<div class="cal-foot"><button class="cal-today">Today</button>' +
      '<button class="cal-travel">🕰 Time travel…</button></div>';
  }
  function toggleCalendar(show) {
    const open = show ?? calendar.classList.contains("hidden");
    if (open) { calView = new Date(); renderCalendar(); }
    calendar.classList.toggle("hidden", !open);
  }
  if (clockEl) clockEl.addEventListener("click", e => { e.stopPropagation(); toggleCalendar(); });
  calendar.addEventListener("click", e => {
    e.stopPropagation();   // renderCalendar() detaches the target; don't let the outside-click closer fire
    if (e.target.closest(".cal-prev")) { calView.setMonth(calView.getMonth() - 1); renderCalendar(); }
    else if (e.target.closest(".cal-next")) { calView.setMonth(calView.getMonth() + 1); renderCalendar(); }
    else if (e.target.closest(".cal-today")) { calView = new Date(); renderCalendar(); if (currentEra()) timeTravel(null); }
    else if (e.target.closest(".cal-travel")) { toggleCalendar(false); openTimewarp(); }
  });
  document.addEventListener("click", e => {
    if (!e.target.closest("#calendar") && !e.target.closest("#clock")) toggleCalendar(false);
  });

  /* ---------- Time travel (retro skins) ---------- */
  const ERAS = {
    win95: { loading: "Computing like it's 1995…", word: "hugOS 95" },
    winxp: { loading: "Welcome to the green hills…", word: "hugOS XP" },
    win7:  { loading: "Preparing your desktop…", word: "hugOS 7" },
  };
  // apps whose icons are hidden per era - their open windows are closed on switch
  const ERA_HIDDEN = {
    "":     ["minesweeper", "solitaire"],
    win95:  ["settings", "terminal", "stickies", "solitaire"],
    winxp:  ["settings", "terminal", "stickies", "solitaire"],
    win7:   ["settings", "terminal", "minesweeper"],
  };
  const currentEra = () => localStorage.getItem("hugos-era") || "";
  function setEraClass(era) {
    document.body.classList.remove("era-win95", "era-winxp", "era-win7");
    if (era) document.body.classList.add("era-" + era);
  }
  setEraClass(currentEra());   // apply saved era on load

  const timewarp = document.createElement("div");
  timewarp.id = "timewarp";
  timewarp.innerHTML =
    '<div class="tw-loading"><div class="tw-splash"><span class="tw-flag"></span><span class="tw-word">hugOS</span></div>' +
    '<div class="tw-logo">🕰</div><div class="tw-text"></div>' +
    '<div class="tw-bar"><i></i></div></div>' +
    '<div class="tw-dialog"><h2>🕰 Go back in time?</h2><p class="tw-sub">Pick a year and travel.</p>' +
    '<div class="tw-years">' +
    '<button class="tw-year" data-era="win95"><b>1995</b></button>' +
    '<button class="tw-year" data-era="winxp"><b>2001</b></button>' +
    '<button class="tw-year" data-era="win7"><b>2009</b></button>' +
    "</div><button class=\"tw-cancel\">Cancel</button></div>";
  document.body.appendChild(timewarp);
  const twLoading = timewarp.querySelector(".tw-loading");
  const twDialog = timewarp.querySelector(".tw-dialog");

  /* ---------- Clippy (XP assistant easter egg) ---------- */
  const clippy = document.createElement("div");
  clippy.id = "clippy";
  clippy.innerHTML =
    '<div class="clippy-bubble"><span class="clippy-tip"></span>' +
    '<button class="clippy-x" title="Close" aria-label="Close">×</button></div>' +
    '<button class="clippy-clip" title="Another tip" aria-label="Office Assistant">' +
    "<svg viewBox='0 0 64 96'>" +
    "<g fill='none' stroke='#aab2bd' stroke-width='7' stroke-linecap='round' stroke-linejoin='round'>" +
    "<path d='M16,40 V70 a16,16 0 0 0 32,0 V24 a11,11 0 0 0 -22,0 V66 a6,6 0 0 0 12,0 V38'/></g>" +
    "<ellipse cx='25' cy='30' rx='6.5' ry='8.5' fill='#fff' stroke='#333' stroke-width='2'/>" +
    "<ellipse cx='41' cy='30' rx='6.5' ry='8.5' fill='#fff' stroke='#333' stroke-width='2'/>" +
    "<circle cx='26' cy='32' r='2.8' fill='#222'/><circle cx='42' cy='32' r='2.8' fill='#222'/>" +
    "<path d='M17,17 L31,22 M47,17 L33,22' stroke='#333' stroke-width='2.6' stroke-linecap='round'/>" +
    "</svg></button>";
  document.body.appendChild(clippy);
  const CLIPPY_TIPS = [
    "It looks like you're browsing a retro desktop. Need a hand?",
    "Tip: drag a window by its title bar to move it around.",
    "Double-click a title bar to maximize the window.",
    "It looks like you're writing a resume. Want help? (No.)",
    "Psst - the Start menu still works down there.",
    "Feeling brave? Try Ctrl+Alt+B sometime.",
    "Stuck? Have you tried turning it off and on again?",
  ];
  let clippyTip = 0;
  const clippyTipEl = clippy.querySelector(".clippy-tip");
  const clippySay = i => { clippyTipEl.textContent = CLIPPY_TIPS[((i % CLIPPY_TIPS.length) + CLIPPY_TIPS.length) % CLIPPY_TIPS.length]; };
  function syncClippy(era) {
    if (era === "winxp") { clippyTip = 0; clippySay(0); clippy.classList.add("show"); }
    else clippy.classList.remove("show");
  }
  clippy.querySelector(".clippy-clip").addEventListener("click", () => { clippyTip++; clippySay(clippyTip); });
  clippy.querySelector(".clippy-x").addEventListener("click", () => clippy.classList.remove("show"));

  /* ---------- Windows Update gag (plays on arriving in Win7) ---------- */
  const winupdate = document.createElement("div");
  winupdate.id = "winupdate";
  winupdate.innerHTML =
    '<div class="wu-inner"><div class="wu-ring"><i></i><i></i><i></i><i></i><i></i><i></i></div>' +
    '<div class="wu-title">Configuring Windows updates</div>' +
    '<div class="wu-pct"><span class="wu-num">0</span>% complete</div>' +
    '<div class="wu-warn">Do not turn off your computer.</div></div>';
  document.body.appendChild(winupdate);
  const wuNum = winupdate.querySelector(".wu-num");
  function startWinUpdate() {
    winupdate.classList.add("show");
    const seq = [0, 6, 6, 17, 28, 28, 44, 61, 61, 79, 96, 100];
    let i = 0;
    (function step() {
      wuNum.textContent = seq[i];
      if (i >= seq.length - 1) { setTimeout(() => winupdate.classList.remove("show"), 800); return; }
      i++; setTimeout(step, 230 + Math.random() * 300);
    })();
  }

  syncClippy(currentEra());   // restore Clippy if the page loads straight into XP

  function openTimewarp() { twLoading.style.display = "none"; twDialog.style.display = ""; timewarp.classList.add("show"); }
  function closeTimewarp() { timewarp.classList.remove("show", "boot-win95", "boot-winxp", "boot-win7"); }
  const BOOT_DUR = { win95: 2.0, winxp: 2.3, win7: 1.9 };
  function timeTravel(era) {
    const conf = era ? ERAS[era] : null;
    twDialog.style.display = "none"; twLoading.style.display = "";
    timewarp.classList.remove("boot-win95", "boot-winxp", "boot-win7");
    if (era) timewarp.classList.add("boot-" + era);
    timewarp.querySelector(".tw-text").textContent = conf ? conf.loading : "Returning to " + new Date().getFullYear() + "…";
    timewarp.querySelector(".tw-word").textContent = conf ? conf.word : "hugOS";
    const dur = era ? (BOOT_DUR[era] || 2) : 1.4;
    const bar = timewarp.querySelector(".tw-bar i");
    bar.style.transition = "none"; bar.style.width = "0%";
    timewarp.classList.add("show");
    requestAnimationFrame(() => { bar.style.transition = "width " + dur + "s ease"; bar.style.width = "100%"; });
    setTimeout(() => {
      setEraClass(era || "");
      syncClippy(era || "");
      (ERA_HIDDEN[era || ""] || []).forEach(a => { if (openWins.has(a)) closeWindow(a); });   // close apps that don't exist in this era
      if (era) localStorage.setItem("hugos-era", era); else localStorage.removeItem("hugos-era");
      // Win7 "Configuring updates…" shows only sometimes, like the real thing
      if (era === "win7" && Math.random() < 0.5) { startWinUpdate(); setTimeout(closeTimewarp, 560); }
      else closeTimewarp();
    }, dur * 1000 + 110);
  }
  timewarp.addEventListener("click", e => {
    const y = e.target.closest(".tw-year");
    if (y && !y.disabled) return timeTravel(y.dataset.era);
    if (e.target.closest(".tw-cancel")) return closeTimewarp();
    if (e.target === timewarp && twLoading.style.display === "none") closeTimewarp();   // backdrop (dialog only)
  });

  /* ---------- Blue Screen of Death (easter egg) ---------- */
  const bsod = document.createElement("div");
  bsod.id = "bsod";
  document.body.appendChild(bsod);
  const BSOD_9X =
    '<div class="bsod-inner">' +
    '<div class="bsod-head"><span class="bsod-title">hugOS</span></div>' +
    "<p>A fatal exception 0E has occurred at 0028:C0011E36 in VXD VMM(01) +\n" +
    "00010E36. The current application will be terminated.</p>" +
    "<p>*  Press any key to terminate the current application.\n" +
    "*  Press CTRL+ALT+DEL again to restart your computer. You will\n" +
    "   lose any unsaved information in all applications.</p>" +
    '<p class="bsod-cont">Press any key to continue <span class="bsod-cursor">_</span></p>' +
    "</div>";
  const BSOD_XP =
    '<div class="bsod-xp">' +
    "<p>A problem has been detected and Windows has been shut down to prevent damage\nto your computer.</p>" +
    "<p>PAGE_FAULT_IN_NONPAGED_AREA</p>" +
    "<p>If this is the first time you've seen this stop error screen, restart your\ncomputer. If this screen appears again, follow these steps:</p>" +
    "<p>Check to make sure any new hardware or software is properly installed.\nIf this is a new installation, ask your hardware or software manufacturer\nfor any Windows updates you might need.</p>" +
    "<p>If problems continue, disable or remove any newly installed hardware or\nsoftware. Disable BIOS memory options such as caching or shadowing. If you\nneed to use Safe Mode to remove or disable components, restart your computer,\npress F8 to select Advanced Startup Options, and then select Safe Mode.</p>" +
    "<p>Technical information:</p>" +
    "<p>*** STOP: 0x00000050 (0xFD3094C2,0x00000001,0xFBFE7617,0x00000000)</p>" +
    "<p>***  MINESWEEPER.SYS - Address FBFE7617 base at FBFE5000, DateStamp 3d6dd67c</p>" +
    "</div>";
  const BSOD_7 =
    '<div class="bsod-xp">' +
    "<p>A problem has been detected and Windows has been shut down to prevent damage\nto your computer.</p>" +
    "<p>DRIVER_IRQL_NOT_LESS_OR_EQUAL</p>" +
    "<p>If this is the first time you've seen this stop error screen, restart your\ncomputer. If this screen appears again, follow these steps:</p>" +
    "<p>Check for proper installation of any new hardware or drivers. Disable BIOS\nmemory options such as caching or shadowing. If you need to use Safe Mode to\nremove or disable components, restart your computer, press F8 to select\nAdvanced Boot Options, and then select Safe Mode.</p>" +
    "<p>Technical information:</p>" +
    "<p>*** STOP: 0x000000D1 (0x0000000C,0x00000002,0x00000000,0xF86B5A89)</p>" +
    "<p>***  SOLITAIRE.SYS - Address F86B5A89 base at F86B5000, DateStamp 4a5bc60c</p>" +
    "</div>";
  const PANIC_LINUX =
    '<pre class="panic-log">' +
    "<span class='ok-r'>[ 1337.421337]</span> Kernel panic - not syncing: Attempted to kill init! exitcode=0x00000100\n" +
    "<span class='ok-r'>[ 1337.421340]</span> CPU: 0 PID: 1 Comm: hugosh Tainted: G    B   D W  7.0.10-1-MANJARO #1\n" +
    "<span class='ok-r'>[ 1337.421341]</span> Hardware name: hugOS Virtual Platform/Hugo Desktop, BIOS 1.0 2026\n" +
    "<span class='ok-r'>[ 1337.421343]</span> Call Trace:\n" +
    "<span class='ok-r'>[ 1337.421344]</span>  <TASK>\n" +
    "<span class='ok-r'>[ 1337.421345]</span>  dump_stack_lvl+0x48/0x60\n" +
    "<span class='ok-r'>[ 1337.421346]</span>  panic+0x118/0x2b9\n" +
    "<span class='ok-r'>[ 1337.421347]</span>  do_exit.cold+0x2a/0x4f\n" +
    "<span class='ok-r'>[ 1337.421348]</span>  hugo_render_oops+0x1b/0x40 [hugod]\n" +
    "<span class='ok-r'>[ 1337.421349]</span>  __x64_sys_exit_group+0x18/0x20\n" +
    "<span class='ok-r'>[ 1337.421350]</span>  do_syscall_64+0x5c/0x90\n" +
    "<span class='ok-r'>[ 1337.421351]</span>  </TASK>\n" +
    "<span class='ok-r'>[ 1337.421353]</span> Kernel Offset: disabled\n" +
    "<span class='ok-r'>[ 1337.421354]</span> ---[ end Kernel panic - not syncing: Attempted to kill init! ]---" +
    "</pre>";
  const triggerBSOD = () => {
    const era = currentEra();
    if (!era) {   // modern (KDE/Linux) mode: a kernel panic, not a Windows blue screen
      bsod.innerHTML = PANIC_LINUX;
      bsod.classList.remove("isxp");
      bsod.classList.add("panic", "show");
      return;
    }
    bsod.innerHTML = era === "win7" ? BSOD_7 : era === "winxp" ? BSOD_XP : BSOD_9X;
    bsod.classList.remove("panic");
    bsod.classList.toggle("isxp", era === "winxp" || era === "win7");   // both use the STOP layout
    bsod.classList.add("show");
  };
  const dismissBSOD = () => bsod.classList.remove("show");
  bsod.addEventListener("click", dismissBSOD);

  // Win95-style hourglass "busy" cursor, shown for a beat before the crash
  const fakeCursor = document.createElement("div");
  fakeCursor.id = "fake-cursor";
  fakeCursor.innerHTML =
    '<svg width="18" height="22" viewBox="0 0 18 22" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="2" y="1" width="14" height="2" fill="#000"/><rect x="2" y="19" width="14" height="2" fill="#000"/>' +
    '<path d="M3 3 H15 L9 11 Z" fill="#fff" stroke="#000" stroke-width="1.2"/>' +
    '<path d="M9 11 L15 19 H3 Z" fill="#fff" stroke="#000" stroke-width="1.2"/>' +
    '<path d="M6 4.5 H12 L9 8.5 Z" fill="#111"/><path d="M5.5 18 H12.5 L9 13 Z" fill="#111"/></svg>';
  document.body.appendChild(fakeCursor);
  document.addEventListener("mousemove", e => {
    fakeCursor.style.left = e.clientX + "px"; fakeCursor.style.top = e.clientY + "px";
  }, { passive: true });
  function bsodWait() {
    document.body.classList.add("busy");
    fakeCursor.classList.add("show");
    setTimeout(() => {
      fakeCursor.classList.remove("show");
      document.body.classList.remove("busy");
      triggerBSOD();
    }, 2500);
  }

  // Any key (or click) dismisses the blue screen.
  document.addEventListener("keydown", e => {
    if (bsod.classList.contains("show")) { e.preventDefault(); e.stopImmediatePropagation(); dismissBSOD(); }
  }, true);

  /* ---------- Keyboard shortcuts ---------- */
  let metaDown = false, metaCombo = false;
  document.addEventListener("keydown", e => {
    if (e.key === "Meta") { metaDown = true; metaCombo = false; return; }
    if (metaDown) metaCombo = true;
    // Meta+D (or Alt+D): show desktop
    if ((e.metaKey || e.altKey) && (e.key === "d" || e.key === "D")) { e.preventDefault(); toggleShowDesktop(); return; }
    // Ctrl+Alt+B: blue screen of death (Clippy's little secret)
    if (e.ctrlKey && e.altKey && (e.key === "b" || e.key === "B")) { e.preventDefault(); triggerBSOD(); return; }
    if (e.key === "Escape") {
      // close transient surfaces (lightbox has its own handler)
      hideContextMenu();
      if (timewarp.classList.contains("show") && twLoading.style.display === "none") { closeTimewarp(); return; }
      if (!calendar.classList.contains("hidden")) { toggleCalendar(false); return; }
      if (kickoff.classList.contains("open")) { toggleKickoff(false); return; }
    }
  });
  document.addEventListener("keyup", e => {
    if (e.key === "Meta") { if (metaDown && !metaCombo) toggleKickoff(); metaDown = false; }
  });

  /* ---------- Calculator app ---------- */
  function initCalc(win) {
    const display = win.querySelector(".calc-display");
    const keys = win.querySelector(".calc-keys");
    let expr = "";
    const LAYOUT = ["C", "±", "%", "÷", "7", "8", "9", "×", "4", "5", "6", "−", "1", "2", "3", "+", "0", ".", "="];
    keys.innerHTML = LAYOUT.map(k => {
      const op = "÷×−+".includes(k), fn = ["C", "±", "%"].includes(k);
      const cls = "ckey" + (op ? " op" : "") + (k === "=" ? " eq" : "") + (k === "0" ? " wide" : "") + (fn ? " fn" : "");
      return '<button class="' + cls + '" data-k="' + k + '">' + k + "</button>";
    }).join("");
    const render = () => { display.textContent = expr || "0"; };
    function evalExpr() {
      try {
        let js = expr.replace(/[÷×−]/g, m => ({ "÷": "/", "×": "*", "−": "-" }[m])).replace(/%/g, "/100");
        if (!/^[-0-9+/*.() ]*$/.test(js)) { expr = "Error"; return render(); }
        const r = Function('"use strict";return (' + js + ")")();
        expr = (r == null || Number.isNaN(r) || !Number.isFinite(r)) ? "Error"
          : String(Math.round((r + Number.EPSILON) * 1e10) / 1e10);
      } catch (_) { expr = "Error"; }
      render();
    }
    function press(k) {
      if (expr === "Error") expr = "";
      if (k === "C") expr = "";
      else if (k === "=") return evalExpr();
      else if (k === "±") { if (expr) expr = expr.startsWith("-") ? expr.slice(1) : "-" + expr; }
      else expr += k;
      render();
    }
    keys.addEventListener("click", e => { const b = e.target.closest("[data-k]"); if (b) press(b.dataset.k); });
    win.tabIndex = 0;
    win.addEventListener("keydown", e => {
      const map = { "/": "÷", "*": "×", "-": "−", "+": "+", Enter: "=", "=": "=", Escape: "C", c: "C" };
      if (/^[0-9.%]$/.test(e.key)) { press(e.key); e.preventDefault(); }
      else if (map[e.key]) { press(map[e.key]); e.preventDefault(); }
      else if (e.key === "Backspace") { expr = expr.slice(0, -1); render(); e.preventDefault(); }
    });
    render();
  }

  /* ---------- Sticky notes app ---------- */
  function initSticky(win) {
    const board = win.querySelector(".sticky-board");
    const COLORS = ["#fff3a0", "#a5e8ff", "#b8f5c0", "#ffc6c6", "#e3c6ff"];
    let notes = [];
    try { notes = JSON.parse(localStorage.getItem("hugos-sticky") || "[]"); } catch (_) {}
    if (!notes.length) notes = [{ text: "Edit me. Add notes with +.\nThey're saved in your browser.", color: COLORS[0] }];
    const save = () => localStorage.setItem("hugos-sticky", JSON.stringify(notes));
    const escTa = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    function render() {
      board.innerHTML = notes.map((n, i) =>
        '<div class="sticky" style="background:' + n.color + '">' +
        '<button class="sticky-del" data-i="' + i + '" title="Delete">✕</button>' +
        '<textarea data-i="' + i + '" spellcheck="false">' + escTa(n.text) + "</textarea></div>"
      ).join("") + '<button class="sticky-add" title="Add note">＋</button>';
    }
    board.addEventListener("click", e => {
      const del = e.target.closest(".sticky-del");
      if (del) { notes.splice(+del.dataset.i, 1); save(); render(); return; }
      if (e.target.closest(".sticky-add")) {
        notes.push({ text: "", color: COLORS[notes.length % COLORS.length] }); save(); render();
        const tas = board.querySelectorAll("textarea"); if (tas.length) tas[tas.length - 1].focus();
      }
    });
    board.addEventListener("input", e => {
      const ta = e.target.closest("textarea"); if (ta) { notes[+ta.dataset.i].text = ta.value; save(); }
    });
    render();
  }

  /* ---------- System monitor app ---------- */
  function initSysmon(win) {
    const root = win.querySelector(".sysmon");
    const s = SITE.stats || {};
    const t0 = Date.now();
    let cpu = 18, ram = 42, iv = null;
    const gauge = (label, pct, val, fill) =>
      '<div class="sm-row"><div class="sm-top"><span>' + label + '</span><span class="sm-val">' + val + "</span></div>" +
      '<div class="sm-bar"><i style="width:' + Math.max(2, Math.min(100, pct)) + "%" + (fill ? ";background:" + fill : "") + '"></i></div></div>';
    function uptime() {
      const sec = Math.floor((Date.now() - t0) / 1000), m = Math.floor(sec / 60), ss = sec % 60;
      return m + "m " + (ss < 10 ? "0" : "") + ss + "s";
    }
    function render() {
      cpu = Math.max(4, Math.min(96, cpu + (Math.random() * 24 - 12)));
      ram = Math.max(20, Math.min(88, ram + (Math.random() * 8 - 4)));
      root.innerHTML =
        '<div class="sm-head"><span class="sm-logo">📊</span><div><div class="sm-title">hugOS System Monitor</div>' +
        '<div class="sm-sub">Hugo ' + esc(s.hugo || "?") + " · built " + esc(s.built || "?") + "</div></div></div>" +
        gauge("CPU", cpu, Math.round(cpu) + "%", "linear-gradient(90deg,#41cd8c,#3daee9)") +
        gauge("Memory", ram, Math.round(ram) + "%", "linear-gradient(90deg,#3daee9,#9b59b6)") +
        gauge("Pages built", Math.min(100, (s.pages || 0) * 4), (s.pages || 0) + " pages") +
        gauge("Word count", Math.min(100, (s.words || 0) / 40), (s.words || 0) + " words") +
        '<div class="sm-foot">Uptime ' + uptime() + "</div>";
    }
    render();
    iv = setInterval(render, 1000);
    const obs = new MutationObserver(() => { if (!document.body.contains(win)) { clearInterval(iv); obs.disconnect(); } });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  /* ---------- Wiki app ---------- */
  function initWiki(win) {
    const nav = win.querySelector(".wiki-nav");
    const search = win.querySelector(".wiki-search");
    const pages = [...win.querySelectorAll(".wiki-page")];
    const links = [...win.querySelectorAll(".wiki-link")];
    function show(key) {
      pages.forEach(p => { p.hidden = p.dataset.key !== key; });
      links.forEach(l => l.classList.toggle("active", l.dataset.key === key));
      const main = win.querySelector(".wiki-main"); if (main) main.scrollTop = 0;
    }
    nav.addEventListener("click", e => { const b = e.target.closest(".wiki-link"); if (b) show(b.dataset.key); });
    search.addEventListener("input", () => {
      const q = search.value.toLowerCase();
      links.forEach(l => { l.closest("li").hidden = !!q && !l.textContent.toLowerCase().includes(q); });
    });
    if (links[0]) show(links[0].dataset.key);
  }

  /* ---------- Trash app (easter egg) ---------- */
  function initTrash(win) {
    const root = win.querySelector(".trash");
    const QUIPS = [
      "Nothing to see here.",
      "There's nothing here. But it felt good, right?",
      "Still empty. Persistence is admirable.",
      "You really want to delete *something*, huh?",
      "Fine. I recovered a file just for you. ⤵",
    ];
    const SECRET =
      "      /\\_/\\\n" +
      "     ( o.o )   You found the secret file.\n" +
      "      &gt; ^ &lt;    There's nothing important here.\n\n" +
      "   Congrats on emptying an already-empty\n" +
      "   trash a few times. That's dedication.\n\n" +
      "                       - the hugOS team 🐧";
    let clicks = 0, revealed = false;
    const base = () =>
      '<div class="trash-empty"><div class="trash-icon">🗑️</div>' +
      '<div class="trash-msg">Trash is empty</div>' +
      '<div class="trash-sub" id="trash-quip">' + QUIPS[0] + "</div>" +
      '<button class="trash-btn" id="trash-empty">Empty Trash</button>' +
      '<div id="trash-files"></div></div>';
    root.innerHTML = base();
    root.addEventListener("click", e => {
      if (e.target.closest("#trash-empty")) {
        clicks++;
        root.querySelector("#trash-quip").textContent = QUIPS[Math.min(clicks, QUIPS.length - 1)];
        if (clicks >= QUIPS.length - 1 && !revealed) {
          revealed = true;
          root.querySelector("#trash-files").innerHTML =
            '<button class="file open-secret" style="margin-top:14px;max-width:280px">' +
            '<span class="fi">📄</span><span class="fn">do_not_open.txt</span>' +
            '<span class="fd">recovered · 0 KB</span></button>';
        }
        return;
      }
      if (e.target.closest(".open-secret")) {
        root.innerHTML = '<div class="doc"><h1>do_not_open.txt</h1><pre class="secret">' + SECRET +
          '</pre><button class="trash-btn" id="trash-back">← back to Trash</button></div>';
        return;
      }
      if (e.target.closest("#trash-back")) { root.innerHTML = base(); clicks = 0; revealed = false; }
    });
  }

  /* ---------- Deep linking: open a window from the URL hash ---------- */
  function openFromHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id && document.getElementById("tpl-" + id)) openWindow(id);
  }
  window.addEventListener("popstate", openFromHash);

  /* ---------- On load: auto-open flagged apps, then any hash-linked window ---------- */
  window.addEventListener("load", () => {
    const flagged = (SITE.apps || []).filter(a => a.open);
    flagged.forEach((a, i) =>
      setTimeout(() => openWindow(a.type === "web" ? "browser" : a.id, a.url || undefined), i * 140));
    if (location.hash.length > 1) setTimeout(openFromHash, flagged.length * 140 + 30);
  });
})();
