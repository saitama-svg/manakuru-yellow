/* マナクル YELLOW v108 — スマホ専用ナビゲーション・通常学習画面（Step 2）
   既存の switchView / setAppMode / 保存・採点処理を再利用します。 */
(function initManakuruMobileUI() {
  'use strict';

  const mobileQuery = window.matchMedia
    ? window.matchMedia('(max-width: 1100px) and (hover: none) and (pointer: coarse)')
    : null;
  const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent || '');
  const isMobileDevice = () => Boolean((mobileQuery && mobileQuery.matches) || mobileUserAgent);

  if (!isMobileDevice()) return;

  const body = document.body;
  if (!body) return;
  body.classList.add('mobile-ui-active');

  const viewTitles = {
    inputCard: 'カード学習',
    inputList: '一覧学習',
    roulette: '一問一答',
    spaced: '今日の復習',
    stats: '成績・弱点',
    library: '問題集',
    sharedLibrary: 'みんなの問題集',
    register: '問題登録',
    manage: '問題管理',
    tag: '分野・タグ',
    url: '共有・追加',
    settings: '学習設定',
    appearance: 'デザイン設定',
    dataManagement: 'データ管理',
    print: '印刷',
    usage: '使い方',
    mockTest: '模擬テスト',
    blankStudy: '白紙勉強法',
    whiteRecall: '白紙勉強法',
    timeAttack: 'タイムアタック'
  };

  const learningViews = new Set([
    'inputCard', 'inputList', 'roulette', 'spaced', 'mockTest', 'blankStudy', 'whiteRecall', 'timeAttack'
  ]);
  const libraryViews = new Set(['library', 'sharedLibrary', 'register', 'manage', 'tag', 'url']);
  const otherViews = new Set(['settings', 'appearance', 'dataManagement', 'print', 'usage']);
  const inputViews = new Set(['inputCard', 'inputList']);

  function currentView() {
    const active = document.querySelector('.nav button[data-view].active');
    if (active && active.dataset.view) {
      return active.dataset.view === 'whiteRecall' ? 'blankStudy' : active.dataset.view;
    }
    for (const [view, id] of Object.entries({
      inputCard: 'inputCardView', inputList: 'inputListView', roulette: 'rouletteView',
      spaced: 'spacedView', stats: 'statsView', library: 'libraryView', sharedLibrary: 'sharedLibraryView',
      register: 'registerView', manage: 'manageView', tag: 'tagView', url: 'urlPanel',
      settings: 'settingsView', appearance: 'appearanceView', dataManagement: 'dataManagementView',
      print: 'printView', usage: 'usageView', mockTest: 'mockTestView', blankStudy: 'blankStudyView',
      timeAttack: 'timeAttackView'
    })) {
      const element = document.getElementById(id);
      if (element && getComputedStyle(element).display !== 'none') return view;
    }
    return 'roulette';
  }

  const header = document.createElement('header');
  header.className = 'mobile-ui-header';
  header.setAttribute('aria-label', 'マナクル YELLOW スマホ版ヘッダー');
  header.innerHTML = `
    <div class="mobile-brand-mark" aria-hidden="true">M</div>
    <div class="mobile-brand-copy">
      <span class="mobile-brand-name">マナクル YELLOW</span>
      <span class="mobile-current-view" id="mobileCurrentViewTitle">一問一答</span>
    </div>
    <button class="mobile-header-menu" id="mobileHeaderMenu" type="button" aria-label="メニューを開く" aria-haspopup="dialog" aria-expanded="false">☰</button>
  `;
  body.appendChild(header);

  const bottomNav = document.createElement('nav');
  bottomNav.className = 'mobile-bottom-nav';
  bottomNav.id = 'mobileBottomNavigation';
  bottomNav.setAttribute('aria-label', 'スマホ版メインメニュー');
  bottomNav.innerHTML = `
    <button type="button" data-mobile-destination="learn" aria-label="学習">
      <span class="mobile-nav-icon" aria-hidden="true">📘</span><span>学習</span>
    </button>
    <button type="button" data-mobile-destination="library" aria-label="問題集">
      <span class="mobile-nav-icon" aria-hidden="true">📚</span><span>問題集</span>
    </button>
    <button type="button" data-mobile-destination="stats" aria-label="成績">
      <span class="mobile-nav-icon" aria-hidden="true">📊</span><span>成績</span>
    </button>
    <button type="button" data-mobile-destination="more" aria-label="その他の機能" aria-haspopup="dialog" aria-expanded="false">
      <span class="mobile-nav-icon" aria-hidden="true">☰</span><span>その他</span>
    </button>
  `;
  body.appendChild(bottomNav);

  const moreBackdrop = document.createElement('div');
  moreBackdrop.className = 'mobile-more-backdrop';
  moreBackdrop.id = 'mobileMoreBackdrop';
  moreBackdrop.hidden = true;
  moreBackdrop.innerHTML = `
    <section class="mobile-more-sheet" role="dialog" aria-modal="true" aria-labelledby="mobileMoreTitle" tabindex="-1">
      <div class="mobile-sheet-grabber" aria-hidden="true"></div>
      <div class="mobile-sheet-header">
        <h2 id="mobileMoreTitle">機能メニュー</h2>
        <button class="mobile-sheet-close" id="mobileMoreClose" type="button" aria-label="メニューを閉じる">×</button>
      </div>
      <div class="mobile-sheet-content">
        <section class="mobile-menu-group" aria-label="学習方法">
          <h3 class="mobile-menu-group-title">学習方法</h3>
          <div class="mobile-menu-grid">
            <button class="mobile-menu-item" type="button" data-mobile-view="inputCard"><span class="mobile-menu-emoji">🃏</span><span>カード学習</span></button>
            <button class="mobile-menu-item" type="button" data-mobile-view="inputList"><span class="mobile-menu-emoji">📋</span><span>一覧学習</span></button>
            <button class="mobile-menu-item" type="button" data-mobile-view="roulette"><span class="mobile-menu-emoji">🧠</span><span>一問一答</span></button>
            <button class="mobile-menu-item" type="button" data-mobile-view="spaced"><span class="mobile-menu-emoji">🔁</span><span>今日の復習</span></button>
            <button class="mobile-menu-item" type="button" data-mobile-view="blankStudy"><span class="mobile-menu-emoji">📓</span><span>白紙勉強法</span></button>
            <button class="mobile-menu-item" type="button" data-mobile-view="mockTest"><span class="mobile-menu-emoji">📝</span><span>模擬テスト</span></button>
            <button class="mobile-menu-item" type="button" data-mobile-view="timeAttack"><span class="mobile-menu-emoji">⏱️</span><span>タイムアタック</span></button>
          </div>
        </section>
        <section class="mobile-menu-group" aria-label="問題集と作成">
          <h3 class="mobile-menu-group-title">問題集・作成</h3>
          <div class="mobile-menu-grid">
            <button class="mobile-menu-item" type="button" data-mobile-view="library"><span class="mobile-menu-emoji">📚</span><span>自分の問題集</span></button>
            <button class="mobile-menu-item" type="button" data-mobile-view="sharedLibrary"><span class="mobile-menu-emoji">🌐</span><span>みんなの問題集</span></button>
            <button class="mobile-menu-item" type="button" data-mobile-view="register"><span class="mobile-menu-emoji">✍️</span><span>問題登録</span></button>
            <button class="mobile-menu-item" type="button" data-mobile-view="manage"><span class="mobile-menu-emoji">🛠️</span><span>問題管理</span></button>
            <button class="mobile-menu-item" type="button" data-mobile-view="tag"><span class="mobile-menu-emoji">🏷️</span><span>分野・タグ</span></button>
            <button class="mobile-menu-item" type="button" data-mobile-view="url"><span class="mobile-menu-emoji">🔗</span><span>共有・追加</span></button>
          </div>
        </section>
        <section class="mobile-menu-group" aria-label="管理と設定">
          <h3 class="mobile-menu-group-title">管理・設定</h3>
          <div class="mobile-menu-grid">
            <button class="mobile-menu-item" type="button" data-mobile-view="settings"><span class="mobile-menu-emoji">⚙️</span><span>学習設定</span></button>
            <button class="mobile-menu-item" type="button" data-mobile-view="appearance"><span class="mobile-menu-emoji">🎨</span><span>デザイン設定</span></button>
            <button class="mobile-menu-item" type="button" data-mobile-view="dataManagement"><span class="mobile-menu-emoji">📦</span><span>データ管理</span></button>
            <button class="mobile-menu-item" type="button" data-mobile-view="print"><span class="mobile-menu-emoji">🖨️</span><span>印刷</span></button>
            <button class="mobile-menu-item" type="button" data-mobile-view="usage"><span class="mobile-menu-emoji">📖</span><span>使い方</span></button>
            <button class="mobile-menu-item" type="button" data-mobile-view="stats"><span class="mobile-menu-emoji">📊</span><span>成績・弱点</span></button>
          </div>
        </section>
      </div>
    </section>
  `;
  body.appendChild(moreBackdrop);

  const portraitNotice = document.createElement('div');
  portraitNotice.className = 'mobile-portrait-notice';
  portraitNotice.id = 'mobilePortraitNotice';
  portraitNotice.hidden = true;
  portraitNotice.setAttribute('role', 'status');
  portraitNotice.setAttribute('aria-live', 'polite');
  portraitNotice.innerHTML = `
    <div class="mobile-portrait-inner">
      <div class="mobile-portrait-icon" aria-hidden="true">↻</div>
      <h2 class="mobile-portrait-title">スマートフォンを横向きにしてください</h2>
      <p class="mobile-portrait-copy">マナクル YELLOWの学習画面は、横画面で使いやすいように設計しています。端末を横向きにすると学習を始められます。</p>
      <p class="mobile-portrait-hint">問題集・成績・その他の機能は下部メニューから開けます</p>
    </div>
  `;
  body.appendChild(portraitNotice);

  const titleElement = document.getElementById('mobileCurrentViewTitle');
  const headerMenu = document.getElementById('mobileHeaderMenu');
  const closeButton = document.getElementById('mobileMoreClose');
  const sheet = moreBackdrop.querySelector('.mobile-more-sheet');
  const moreBottomButton = bottomNav.querySelector('[data-mobile-destination="more"]');
  let lastFocusedElement = null;
  let updateQueued = false;

  function setSheetOpen(open) {
    moreBackdrop.hidden = !open;
    body.classList.toggle('mobile-menu-open', open);
    headerMenu.setAttribute('aria-expanded', String(open));
    moreBottomButton.setAttribute('aria-expanded', String(open));
    if (open) {
      lastFocusedElement = document.activeElement;
      window.setTimeout(() => closeButton.focus(), 0);
    } else if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus({ preventScroll: true });
    }
  }

  function queueUpdate() {
    if (updateQueued) return;
    updateQueued = true;
    requestAnimationFrame(() => {
      updateQueued = false;
      updateMobileState();
    });
  }

  function updateMobileState() {
    const view = currentView();
    titleElement.textContent = viewTitles[view] || 'マナクル YELLOW';

    const destinations = {
      learn: learningViews.has(view),
      library: libraryViews.has(view),
      stats: view === 'stats',
      more: otherViews.has(view)
    };
    bottomNav.querySelectorAll('[data-mobile-destination]').forEach(button => {
      const key = button.dataset.mobileDestination;
      const active = Boolean(destinations[key]);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });

    const isPortrait = window.matchMedia
      ? window.matchMedia('(orientation: portrait)').matches
      : window.innerHeight > window.innerWidth;
    const isLandscapeMobileLearning = isMobileDevice() && !isPortrait && (view === 'roulette' || view === 'inputCard');
    body.classList.toggle('mobile-learning-landscape', isLandscapeMobileLearning);
    body.classList.toggle('mobile-learning-roulette', isLandscapeMobileLearning && view === 'roulette');
    body.classList.toggle('mobile-learning-input-card', isLandscapeMobileLearning && view === 'inputCard');

    // 横画面の通常学習では、設定で手書きが有効な場合だけ手書き欄を初期表示する。
    if (isLandscapeMobileLearning && body.dataset.userHandwriting !== 'off') {
      const padDetails = document.getElementById(view === 'inputCard' ? 'inputHandwritingDetails' : 'outputHandwritingDetails');
      if (padDetails && !padDetails.open) padDetails.open = true;
    }

    // Keep the orientation prompt independent of the more-sheet, so the bottom navigation remains usable.
    portraitNotice.hidden = !(isMobileDevice() && isPortrait && learningViews.has(view));

    moreBackdrop.querySelectorAll('[data-mobile-view]').forEach(button => {
      const target = button.dataset.mobileView;
      const active = target === view || (target === 'blankStudy' && view === 'whiteRecall');
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });

  }

  function navigateTo(view) {
    if (typeof window.switchView !== 'function') return;
    setSheetOpen(false);
    window.switchView(view);
    queueUpdate();
  }

  bottomNav.querySelector('[data-mobile-destination="learn"]').addEventListener('click', () => {
    const view = currentView();
    if (learningViews.has(view)) return;
    const inputGroup = document.getElementById('inputNavGroup');
    const inputModeActive = inputGroup && !inputGroup.hidden;
    navigateTo(inputModeActive ? 'inputCard' : 'roulette');
  });
  bottomNav.querySelector('[data-mobile-destination="library"]').addEventListener('click', () => navigateTo('library'));
  bottomNav.querySelector('[data-mobile-destination="stats"]').addEventListener('click', () => navigateTo('stats'));
  moreBottomButton.addEventListener('click', () => setSheetOpen(true));
  headerMenu.addEventListener('click', () => setSheetOpen(true));
  closeButton.addEventListener('click', () => setSheetOpen(false));

  moreBackdrop.addEventListener('click', event => {
    if (event.target === moreBackdrop) setSheetOpen(false);
  });
  moreBackdrop.querySelectorAll('[data-mobile-view]').forEach(button => {
    button.addEventListener('click', () => navigateTo(button.dataset.mobileView));
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !moreBackdrop.hidden) setSheetOpen(false);
  });

  // switchView の既存処理はそのまま実行し、完了後にスマホUIの見出し・選択状態だけを更新。
  if (typeof window.switchView === 'function') {
    const originalSwitchView = window.switchView;
    window.switchView = function mobileAwareSwitchView(view) {
      const beforeView = currentView();
      const result = originalSwitchView.apply(this, arguments);
      queueUpdate();
      // スマホ版では .app 自体がスクロール領域になるため、画面切替後は新しい画面の先頭へ戻す。
      requestAnimationFrame(() => {
        if (currentView() !== beforeView) {
          const app = document.querySelector('.app');
          if (app) app.scrollTop = 0;
        }
        // CSS gridへの切替後、既存のResizeObserverがcanvasの実寸変化を検出する。
      });
      return result;
    };
  }

  const oldNav = document.querySelector('.nav');
  if (oldNav && window.MutationObserver) {
    const observer = new MutationObserver(queueUpdate);
    observer.observe(oldNav, { subtree: true, attributes: true, attributeFilter: ['class', 'aria-current', 'hidden'] });
  }

  window.addEventListener('resize', queueUpdate, { passive: true });
  window.addEventListener('orientationchange', () => window.setTimeout(queueUpdate, 100), { passive: true });
  if (mobileQuery && typeof mobileQuery.addEventListener === 'function') mobileQuery.addEventListener('change', queueUpdate);

  updateMobileState();
  window.setTimeout(updateMobileState, 80);
})();
