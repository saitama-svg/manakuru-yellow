/* マナクル YELLOW：アップデート・新着問題集のお知らせ */
(() => {
  'use strict';

  const STORAGE_KEY = (() => {
    // GitHub Pagesでは同じドメイン上の別リポジトリ間でlocalStorageを共有するため、アプリのパスごとに分離します。
    const appPath = new URL('.', window.location.href).pathname.replace(/\/+$/, '') || '/';
    return `manakuru-yellow:notices:v1:${appPath}`;
  })();
  const MAX_HISTORY = 100;
  let state = loadState();
  let manualAnnouncements = Array.isArray(state.manualCache) ? state.manualCache : [];
  let allNotices = [];
  let overlay = null;
  let lastFocus = null;

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        dismissedIds: Array.isArray(parsed.dismissedIds) ? parsed.dismissedIds.filter(v => typeof v === 'string') : [],
        lastSharedSetIds: Array.isArray(parsed.lastSharedSetIds) ? parsed.lastSharedSetIds.filter(v => typeof v === 'string') : null,
        autoAnnouncements: Array.isArray(parsed.autoAnnouncements) ? parsed.autoAnnouncements : [],
        manualCache: Array.isArray(parsed.manualCache) ? parsed.manualCache : []
      };
    } catch (_) {
      return { dismissedIds: [], lastSharedSetIds: null, autoAnnouncements: [], manualCache: [] };
    }
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (error) { console.warn('お知らせの既読状態を保存できませんでした。', error); }
  }

  async function fetchJson(path) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${path} の取得に失敗しました (${response.status})`);
    return response.json();
  }

  function normalizeNotice(item) {
    if (!item || typeof item !== 'object' || !String(item.id || '').trim()) return null;
    const type = ['update', 'new-sets', 'important'].includes(item.type) ? item.type : 'update';
    return {
      id: String(item.id),
      type,
      date: String(item.date || '').slice(0, 10),
      title: String(item.title || 'お知らせ'),
      body: String(item.body || ''),
      items: Array.isArray(item.items) ? item.items.map(v => typeof v === 'string' ? { title: v } : v).filter(v => v && typeof v === 'object').map(v => ({
        title: String(v.title || v.name || ''),
        subject: String(v.subject || ''),
        grade: String(v.grade || ''),
        topic: String(v.topic || '')
      })).filter(v => v.title) : [],
      source: item.source || 'manual'
    };
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  async function loadManualNotices() {
    try {
      const data = await fetchJson('./announcements.json');
      const fetched = Array.isArray(data?.announcements) ? data.announcements.map(normalizeNotice).filter(Boolean) : [];
      const merged = new Map();
      // Keep historical entries in the local cache even if an older server file omits them.
      [...state.manualCache, ...fetched].forEach(item => {
        const normalized = normalizeNotice(item);
        if (normalized) merged.set(normalized.id, normalized);
      });
      manualAnnouncements = [...merged.values()].slice(-MAX_HISTORY);
      state.manualCache = manualAnnouncements;
      saveState();
    } catch (error) {
      console.warn('お知らせJSONを取得できませんでした。保存済みのお知らせを使用します。', error);
      manualAnnouncements = state.manualCache.map(normalizeNotice).filter(Boolean);
    }
  }

  async function detectNewSharedSets() {
    try {
      const data = await fetchJson('./shared-sets.json');
      const sets = Array.isArray(data?.sets) ? data.sets : [];
      const validSets = sets.filter(set => set && typeof set.id === 'string' && set.id && typeof set.title === 'string' && set.title.trim());
      const currentIds = [...new Set(validSets.map(set => set.id))].sort();

      // 初回訪問時は現存セットを基準として記録し、古いセットを一斉通知しません。
      if (!Array.isArray(state.lastSharedSetIds)) {
        state.lastSharedSetIds = currentIds;
        saveState();
        return;
      }

      const previousIds = new Set(state.lastSharedSetIds);
      const addedSets = validSets.filter(set => !previousIds.has(set.id));
      state.lastSharedSetIds = currentIds;
      if (!addedSets.length) {
        saveState();
        return;
      }

      const addedIds = addedSets.map(set => set.id).sort();
      const autoId = `auto-new-sets-${hashString(addedIds.join('|'))}`;
      if (!state.autoAnnouncements.some(item => item && item.id === autoId)) {
        state.autoAnnouncements.push({
          id: autoId,
          type: 'new-sets',
          date: new Date().toISOString().slice(0, 10),
          title: '新しい問題集が追加されました',
          body: `みんなの問題集に、新しく${addedSets.length}件の問題集が追加されました。`,
          items: addedSets.map(set => ({ title: set.title, subject: set.subject, grade: set.grade, topic: set.topic })),
          source: 'automatic'
        });
        state.autoAnnouncements = state.autoAnnouncements.slice(-MAX_HISTORY);
      }
      saveState();
    } catch (error) {
      // データ取得に失敗しても学習機能は停止させません。次回起動時に再確認します。
      console.warn('新着問題集を確認できませんでした。', error);
    }
  }

  function collectNotices() {
    const merged = new Map();
    [...manualAnnouncements, ...state.autoAnnouncements].forEach(item => {
      const notice = normalizeNotice(item);
      if (notice) merged.set(notice.id, notice);
    });
    return [...merged.values()].sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.id.localeCompare(a.id));
  }

  function typeLabel(type) {
    if (type === 'important') return '重要なお知らせ';
    if (type === 'new-sets') return '新着問題集';
    return 'アップデート';
  }

  function formatDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return value || '日付不明';
    const [y, m, d] = value.split('-');
    return `${y}/${m}/${d}`;
  }

  function makeElement(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  function makeCountBadge(count) {
    const badge = makeElement('span', 'mky-notice-count', count > 99 ? '99+' : String(count));
    badge.hidden = count <= 0;
    badge.setAttribute('aria-label', count > 0 ? `未読${count}件` : '未読なし');
    return badge;
  }

  function renderNotices(target, notices, showReadStatus) {
    target.replaceChildren();
    if (!notices.length) {
      target.appendChild(makeElement('div', 'mky-notice-empty', 'まだお知らせはありません。\n新しい情報が届くと、ここに表示されます。'));
      return;
    }
    const dismissed = new Set(state.dismissedIds);
    for (const notice of notices) {
      const card = makeElement('article', 'mky-notice-card');
      const top = makeElement('div', 'mky-notice-card-top');
      const type = makeElement('span', `mky-notice-type${notice.type === 'important' ? ' is-important' : notice.type === 'new-sets' ? ' is-new-sets' : ''}`, typeLabel(notice.type));
      const date = makeElement('time', 'mky-notice-date', formatDate(notice.date));
      if (notice.date) date.dateTime = notice.date;
      top.append(type, date);
      if (showReadStatus) {
        top.appendChild(makeElement('span', 'mky-notice-history-status', dismissed.has(notice.id) ? '既読' : '未読'));
      }
      card.appendChild(top);
      card.appendChild(makeElement('h3', 'mky-notice-card-title', notice.title));
      if (notice.body) card.appendChild(makeElement('p', 'mky-notice-card-body', notice.body));
      if (notice.items.length) {
        const list = makeElement('ul', 'mky-notice-items');
        for (const item of notice.items) {
          const li = makeElement('li');
          li.appendChild(makeElement('span', '', item.title));
          if (notice.type === 'new-sets') li.appendChild(makeElement('span', 'mky-notice-new-chip', 'NEW'));
          const meta = [item.subject, item.grade, item.topic].filter(Boolean).join(' ・ ');
          if (meta) li.appendChild(makeElement('small', 'mky-notice-history-status', meta));
          list.appendChild(li);
        }
        card.appendChild(list);
      }
      target.appendChild(card);
    }
  }

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = makeElement('div', 'mky-notice-overlay');
    overlay.hidden = true;
    overlay.innerHTML = `
      <section class="mky-notice-dialog" role="dialog" aria-modal="true" aria-labelledby="mkyNoticeDialogTitle" tabindex="-1">
        <header class="mky-notice-header">
          <div>
            <p class="mky-notice-brand">マナクル YELLOW / 新着情報</p>
            <h2 class="mky-notice-dialog-title" id="mkyNoticeDialogTitle">アップデートのお知らせ！</h2>
            <p class="mky-notice-summary" id="mkyNoticeSummary"></p>
          </div>
          <button class="mky-notice-close-x" type="button" aria-label="お知らせを閉じる">×</button>
        </header>
        <div class="mky-notice-list" id="mkyNoticeList"></div>
        <footer class="mky-notice-footer">
          <button class="mky-notice-confirm" type="button">閉じる</button>
        </footer>
      </section>
    `;
    document.body.appendChild(overlay);
    const close = () => closeDialog();
    overlay.querySelector('.mky-notice-close-x').addEventListener('click', close);
    overlay.querySelector('.mky-notice-confirm').addEventListener('click', close);
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !overlay.hidden) close();
      if (event.key === 'Tab' && !overlay.hidden) trapFocus(event);
    });
    return overlay;
  }

  let activeMode = 'unread';
  let activeNoticeIds = [];

  function trapFocus(event) {
    const dialog = overlay?.querySelector('.mky-notice-dialog');
    if (!dialog) return;
    const focusable = [...dialog.querySelectorAll('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')];
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function openDialog(mode, notices) {
    const el = ensureOverlay();
    activeMode = mode;
    activeNoticeIds = notices.map(item => item.id);
    lastFocus = document.activeElement;
    el.querySelector('.mky-notice-dialog-title').textContent = mode === 'unread' ? 'アップデートのお知らせ！' : 'お知らせ一覧';
    el.querySelector('.mky-notice-summary').textContent = mode === 'unread'
      ? `新しいお知らせが${notices.length}件あります。確認して閉じると、次回から同じお知らせは表示されません。`
      : '過去のお知らせも含めて確認できます。';
    renderNotices(el.querySelector('#mkyNoticeList'), notices, mode === 'history');
    el.hidden = false;
    document.body.classList.add('mky-notice-open');
    const dialog = el.querySelector('.mky-notice-dialog');
    window.requestAnimationFrame(() => dialog.focus());
  }

  function closeDialog() {
    if (!overlay || overlay.hidden) return;
    if (activeMode === 'unread') {
      const dismissed = new Set(state.dismissedIds);
      activeNoticeIds.forEach(id => dismissed.add(id));
      state.dismissedIds = [...dismissed];
      saveState();
      updateBadges();
    }
    overlay.hidden = true;
    document.body.classList.remove('mky-notice-open');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus({ preventScroll: true });
  }

  function unreadNotices() {
    const dismissed = new Set(state.dismissedIds);
    return allNotices.filter(item => !dismissed.has(item.id));
  }

  function updateBadges() {
    const count = unreadNotices().length;
    document.querySelectorAll('[data-mky-notice-badge]').forEach(old => old.remove());
    document.querySelectorAll('.mky-notice-open-btn').forEach(button => {
      button.appendChild(makeCountBadge(count)).setAttribute('data-mky-notice-badge', 'true');
    });
  }

  function openHistory() {
    allNotices = collectNotices();
    // 一覧を自分で開いた場合は、一覧に含まれるお知らせを確認したものとして扱います。
    const dismissed = new Set(state.dismissedIds);
    allNotices.forEach(item => dismissed.add(item.id));
    state.dismissedIds = [...dismissed];
    saveState();
    updateBadges();
    openDialog('history', allNotices);
  }

  function makeOpenButton(className, iconText, label) {
    const button = makeElement('button', className, '');
    button.type = 'button';
    button.classList.add('mky-notice-open-btn');
    const icon = makeElement('span', '', iconText);
    const text = makeElement('span', '', label);
    button.append(icon, document.createTextNode(' '), text);
    button.addEventListener('click', openHistory);
    return button;
  }

  function installAccessPoints() {
    const desktopGroup = document.querySelector('.nav-common-group');
    if (desktopGroup && !document.getElementById('mkyNoticeDesktopButton')) {
      const button = makeOpenButton('mky-notice-nav-button', '🔔', 'お知らせ');
      button.id = 'mkyNoticeDesktopButton';
      desktopGroup.appendChild(button);
    }

    const settingsView = document.getElementById('settingsView');
    if (settingsView && !document.getElementById('mkyNoticeSettingsCard')) {
      const card = makeElement('div', 'mky-notice-settings-card');
      card.id = 'mkyNoticeSettingsCard';
      const copy = makeElement('div', 'mky-notice-settings-copy');
      copy.append(
        makeElement('strong', '', '🔔 お知らせ'),
        makeElement('span', '', 'アップデート・新着問題集・重要なお知らせを確認できます。')
      );
      const button = makeOpenButton('mky-notice-settings-open', '', 'お知らせを見る');
      button.id = 'mkyNoticeSettingsButton';
      card.append(copy, button);
      const note = settingsView.querySelector('.note');
      if (note) note.insertAdjacentElement('afterend', card);
      else settingsView.insertBefore(card, settingsView.children[1] || null);
    }

    const mobileContent = document.querySelector('.mobile-sheet-content');
    if (mobileContent && !document.getElementById('mkyNoticeMobileButton')) {
      const group = makeElement('section', 'mobile-menu-group');
      group.setAttribute('aria-label', 'お知らせ');
      group.appendChild(makeElement('h3', 'mobile-menu-group-title', 'お知らせ'));
      const grid = makeElement('div', 'mobile-menu-grid');
      const button = makeElement('button', 'mobile-menu-item mky-notice-open-btn', '');
      button.type = 'button';
      button.id = 'mkyNoticeMobileButton';
      button.append(makeElement('span', 'mobile-menu-emoji', '🔔'), makeElement('span', '', 'お知らせ・更新情報'));
      button.addEventListener('click', openHistory);
      grid.appendChild(button);
      group.appendChild(grid);
      mobileContent.appendChild(group);
    }
  }

  async function initialize() {
    installAccessPoints();
    await Promise.all([loadManualNotices(), detectNewSharedSets()]);
    allNotices = collectNotices();
    updateBadges();
    const unread = unreadNotices();
    if (unread.length) {
      const splash = document.getElementById('startupSplash');
      if (splash) {
        let openedAfterSplash = false;
        const maybeOpenAfterSplash = () => {
          if (openedAfterSplash || document.getElementById('startupSplash')) return;
          openedAfterSplash = true;
          observer.disconnect();
          openDialog('unread', unread);
        };
        const observer = new MutationObserver(maybeOpenAfterSplash);
        observer.observe(document.body, { childList: true });
        maybeOpenAfterSplash();
        // Safety fallback for a custom splash implementation that removes its node without a child-list event.
        window.setTimeout(maybeOpenAfterSplash, 7000);
      } else {
        openDialog('unread', unread);
      }
    }
  }

  function start() {
    installAccessPoints();
    initialize().catch(error => console.warn('お知らせ機能を初期化できませんでした。', error));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
