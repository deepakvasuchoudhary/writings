/**
 * SUKHAN &middot; KALAAM
 * Interactive Urdu & Hindi Poetry Archive and Dictionary
 */

(function () {
  'use strict';

  // --- State ---
  const state = {
    activeTab: 'tab-shayari',
    searchQuery: '',
    selectedPoet: 'all',
    selectedGenre: 'all',
    selectedTheme: 'all',
    sortBy: 'default',
    viewMode: 'detailed',
    dictSearchQuery: '',
    dictLetterFilter: 'all',
    favorites: new Set(),
    theme: 'midnight',
    fontSize: 'normal',
    activeTooltipTerm: null
  };

  // Data references
  let data = (typeof SHAYARI_DATA !== 'undefined' ? SHAYARI_DATA : null) || (typeof window !== 'undefined' ? window.SHAYARI_DATA : null);

  // DOM Elements
  const elements = {
    // Badges & Counters
    badgeTotalPoems: document.getElementById('badgeTotalPoems'),
    badgeTotalWords: document.getElementById('badgeTotalWords'),
    badgeTotalPoets: document.getElementById('badgeTotalPoets'),
    badgeTotalFavs: document.getElementById('badgeTotalFavs'),
    resultsCountText: document.getElementById('resultsCountText'),
    dictCountText: document.getElementById('dictCountText'),

    // Shayari Tab Elements
    shayariSearchInput: document.getElementById('shayariSearchInput'),
    clearShayariSearch: document.getElementById('clearShayariSearch'),
    poetSelect: document.getElementById('poetSelect'),
    genreSelect: document.getElementById('genreSelect'),
    sortSelect: document.getElementById('sortSelect'),
    themeChipsContainer: document.getElementById('themeChipsContainer'),
    activeFiltersBar: document.getElementById('activeFiltersBar'),
    activeTagsContainer: document.getElementById('activeTagsContainer'),
    resetAllFiltersBtn: document.getElementById('resetAllFiltersBtn'),
    shayariCardsContainer: document.getElementById('shayariCardsContainer'),
    viewDetailedBtn: document.getElementById('viewDetailedBtn'),
    viewCompactBtn: document.getElementById('viewCompactBtn'),

    // Dictionary Tab Elements
    dictSearchInput: document.getElementById('dictSearchInput'),
    clearDictSearch: document.getElementById('clearDictSearch'),
    devanagariAlphabet: document.getElementById('devanagariAlphabet'),
    dictionaryGrid: document.getElementById('dictionaryGrid'),

    // Poets & Favorites Containers
    poetsGrid: document.getElementById('poetsGrid'),
    favoritesContainer: document.getElementById('favoritesContainer'),

    // Controls
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    fontSizeBtns: document.querySelectorAll('.font-size-btn'),
    randomPoemBtn: document.getElementById('randomPoemBtn'),
    navTabs: document.querySelectorAll('.nav-tab'),
    tabPanes: document.querySelectorAll('.tab-pane'),

    // Modal
    ittefaqModal: document.getElementById('ittefaqModal'),
    modalContent: document.getElementById('modalContent'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    nextRandomBtn: document.getElementById('nextRandomBtn'),
    viewInContextBtn: document.getElementById('viewInContextBtn'),

    // Tooltip & Toast
    wordTooltip: document.getElementById('wordTooltip'),
    tooltipWord: document.getElementById('tooltipWord'),
    tooltipTrans: document.getElementById('tooltipTrans'),
    tooltipMeaning: document.getElementById('tooltipMeaning'),
    tooltipViewDictBtn: document.getElementById('tooltipViewDictBtn'),
    toastNotification: document.getElementById('toastNotification'),
    toastMessage: document.getElementById('toastMessage')
  };

  // --- Initializer ---
  function init() {
    loadPreferences();
    setupEventListeners();

    if (!data) {
      fetch('data.json')
        .then(res => res.json())
        .then(json => {
          data = json;
          renderApp();
        })
        .catch(err => {
          console.error('Failed to load shayari data:', err);
          elements.shayariCardsContainer.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon">⚠️</div>
              <h3 class="empty-state-title">कलाम लोड करने में त्रुटि हुई</h3>
              <p class="empty-state-desc">कृपया पृष्ठ को पुनः लोड करें।</p>
            </div>
          `;
        });
    } else {
      renderApp();
    }
  }

  function loadPreferences() {
    // Theme - Default to Minimal Smoked Black (midnight)
    const savedTheme = localStorage.getItem('sukhan_theme_v8') || 'midnight';
    state.theme = savedTheme;
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Font Size
    const savedFontSize = localStorage.getItem('sukhan_fontsize') || 'normal';
    state.fontSize = savedFontSize;
    document.documentElement.setAttribute('data-fontsize', savedFontSize);
    elements.fontSizeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === savedFontSize);
    });

    // Favorites
    try {
      const savedFavs = JSON.parse(localStorage.getItem('sukhan_favorites') || '[]');
      state.favorites = new Set(savedFavs);
    } catch (e) {
      state.favorites = new Set();
    }
    updateFavoritesBadge();
  }

  function renderApp() {
    // Populate counts
    if (elements.badgeTotalPoems) elements.badgeTotalPoems.textContent = data.stats.total_poems;
    if (elements.badgeTotalWords) elements.badgeTotalWords.textContent = data.stats.total_words;
    if (elements.badgeTotalPoets) elements.badgeTotalPoets.textContent = data.stats.total_poets;

    // Populate Filters
    populatePoetSelect();
    populateThemeChips();
    populateAlphabetFilter();

    // Render Tab Views
    renderShayariList();
    renderDictionaryList();
    renderPoetsGrid();
    renderFavoritesList();

    // Check hash for deep link
    checkUrlHash();
  }

  // --- Filter Populaters ---
  function populatePoetSelect() {
    const poetCounts = {};
    data.poems.forEach(p => {
      const name = p.poet.name_hi;
      poetCounts[name] = (poetCounts[name] || 0) + 1;
    });

    elements.poetSelect.innerHTML = '<option value="all">सभी शायर (All Poets)</option>';
    const sortedPoets = Object.keys(poetCounts).sort((a, b) => a.localeCompare(b, 'hi'));

    sortedPoets.forEach(poet => {
      const opt = document.createElement('option');
      opt.value = poet;
      opt.textContent = `${poet} (${poetCounts[poet]})`;
      elements.poetSelect.appendChild(opt);
    });
  }

  function populateThemeChips() {
    // Count themes frequency
    const themeCounts = {};
    data.poems.forEach(p => {
      p.themes.forEach(t => {
        themeCounts[t] = (themeCounts[t] || 0) + 1;
      });
    });

    // Sort themes by count
    const sortedThemes = Object.keys(themeCounts).sort((a, b) => themeCounts[b] - themeCounts[a]);
    const topThemes = sortedThemes.slice(0, 14);

    elements.themeChipsContainer.innerHTML = `
      <button class="theme-chip ${state.selectedTheme === 'all' ? 'active' : ''}" data-theme="all">सभी</button>
    `;

    topThemes.forEach(theme => {
      const chip = document.createElement('button');
      chip.className = `theme-chip ${state.selectedTheme === theme ? 'active' : ''}`;
      chip.dataset.theme = theme;
      chip.textContent = theme;
      elements.themeChipsContainer.appendChild(chip);
    });
  }

  function populateAlphabetFilter() {
    // Unique initials in dictionary with counts
    const initials = new Set();
    const counts = {};
    data.dictionary.forEach(w => {
      if (w.initial_hi) {
        initials.add(w.initial_hi);
        counts[w.initial_hi] = (counts[w.initial_hi] || 0) + 1;
      }
    });

    const sortedInitials = Array.from(initials).sort((a, b) => a.localeCompare(b, 'hi'));

    elements.devanagariAlphabet.innerHTML = `
      <button class="letter-btn ${state.dictLetterFilter === 'all' ? 'active' : ''}" data-letter="all">
        <span>सभी</span> <span class="letter-count">${data.stats.total_words}</span>
      </button>
    `;

    sortedInitials.forEach(char => {
      const btn = document.createElement('button');
      btn.className = `letter-btn ${state.dictLetterFilter === char ? 'active' : ''}`;
      btn.dataset.letter = char;
      btn.innerHTML = `<span>${char}</span> <span class="letter-count">${counts[char]}</span>`;
      elements.devanagariAlphabet.appendChild(btn);
    });
  }

  // --- Filtering & Querying Logic ---
  function getFilteredPoems() {
    let list = [...data.poems];

    // Search Query (Verses, Poet, Words, About, Themes)
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.trim().toLowerCase();
      list = list.filter(p => {
        const matchPoetHi = p.poet.name_hi.toLowerCase().includes(q);
        const matchPoetEn = p.poet.name_en.toLowerCase().includes(q);
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchAbout = p.about.toLowerCase().includes(q);
        const matchRawVerses = p.verses.raw.toLowerCase().includes(q);
        const matchGenre = p.genre.category.toLowerCase().includes(q) || p.genre.detail.toLowerCase().includes(q);
        const matchThemes = p.themes.some(t => t.toLowerCase().includes(q));
        const matchWords = p.words.some(w => 
          w.word.toLowerCase().includes(q) || 
          w.transliteration.toLowerCase().includes(q) || 
          w.meaning.toLowerCase().includes(q)
        );

        return matchPoetHi || matchPoetEn || matchTitle || matchAbout || matchRawVerses || matchGenre || matchThemes || matchWords;
      });
    }

    // Filter by Poet
    if (state.selectedPoet !== 'all') {
      list = list.filter(p => p.poet.name_hi === state.selectedPoet);
    }

    // Filter by Genre
    if (state.selectedGenre !== 'all') {
      list = list.filter(p => p.genre.category === state.selectedGenre);
    }

    // Filter by Theme
    if (state.selectedTheme !== 'all') {
      list = list.filter(p => p.themes.includes(state.selectedTheme));
    }

    // Sorting
    if (state.sortBy === 'poet-asc') {
      list.sort((a, b) => a.poet.name_hi.localeCompare(b.poet.name_hi, 'hi'));
    } else if (state.sortBy === 'words-desc') {
      list.sort((a, b) => b.words.length - a.words.length);
    } else if (state.sortBy === 'lines-desc') {
      list.sort((a, b) => b.verses.couplets.length - a.verses.couplets.length);
    }

    return list;
  }

  // --- Render Functions ---
  function renderShayariList() {
    const filtered = getFilteredPoems();
    updateActiveFiltersUI();

    // Result status text
    elements.resultsCountText.textContent = `${data.stats.total_poems} में से ${filtered.length} कलाम`;

    if (filtered.length === 0) {
      elements.shayariCardsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <h3 class="empty-state-title">कोई कलाम नहीं मिला</h3>
          <p class="empty-state-desc">आपके चुने गए मापदंडों के अनुसार कोई शायरी उपलब्ध नहीं है। कृपया फ़िल्टर बदलें या खोज शब्द साफ़ करें।</p>
          <button class="modal-action-btn primary" onclick="document.getElementById('resetAllFiltersBtn').click()">फ़िल्टर साफ़ करें</button>
        </div>
      `;
      return;
    }

    elements.shayariCardsContainer.innerHTML = '';
    filtered.forEach(poem => {
      const card = createPoemCard(poem);
      elements.shayariCardsContainer.appendChild(card);
    });
  }

  /**
   * Create Poem Card:
   * Modern Apple Studio Card with Stanzas, Radiant Chromatic Contrast,
   * Collapsible Context Drawer, and Interactive Vocabulary Ribbon
   */
  function createPoemCard(poem) {
    const isFav = state.favorites.has(poem.id);
    const card = document.createElement('article');
    card.className = 'shayari-card';
    card.id = `poem-${poem.id}`;

    // Monogram for poet avatar (first 2 letters)
    const poetMonogram = poem.poet.name_hi.slice(0, 2);

    // --- ZONE 1: TOP ARTIST & CONTEXT STRIP ---
    const partAbout = `
      <section class="card-part-about">
        <div class="about-header">
          <div class="poet-badge">
            <div class="poet-avatar">${escapeHtml(poetMonogram)}</div>
            <div class="poet-meta">
              <h3>${escapeHtml(poem.poet.name_hi)}</h3>
              <span>${escapeHtml(poem.poet.name_en)}</span>
            </div>
          </div>
          <div class="card-meta-badges">
            <span class="genre-badge">${escapeHtml(poem.genre.category)}</span>
            <span class="poem-num-badge">#${poem.id}</span>
          </div>
        </div>

        <div class="poem-card-headline">
          <h2 class="poem-headline-title">${escapeHtml(poem.title)}</h2>
          <button class="context-drawer-btn" data-poem-id="${poem.id}">
            <span>📖 कलाम परिचय व संदर्भ</span>
            <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>

        <div class="poem-context-drawer">
          <p class="about-text-content">${escapeHtml(poem.about)}</p>
          <div class="about-genre-detail">
            <strong>विधा संदर्भ:</strong> ${escapeHtml(poem.genre.detail)}
          </div>
          <div class="card-theme-tags">
            ${poem.themes.map(t => `<span class="card-tag">#${escapeHtml(t)}</span>`).join('')}
          </div>
        </div>
      </section>
    `;

    // --- ZONE 2: THE POETRY SANCTUARY (STANZAS WITH NUMBERING & CONTRAST) ---
    const formattedCoupletsHtml = poem.verses.couplets.map((couplet, cIdx) => {
      const line1 = couplet[0] ? highlightDifficultWords(couplet[0], poem.words) : '';
      const line2 = couplet[1] ? highlightDifficultWords(couplet[1], poem.words) : '';
      const numStr = String(cIdx + 1).padStart(2, '0');

      return `
        <div class="couplet-stanza" data-couplet-idx="${cIdx}">
          <div class="couplet-index-badge">${numStr}</div>
          <div class="couplet-lines">
            <div class="misra misra-1">${line1}</div>
            <div class="misra misra-2">${line2}</div>
          </div>
        </div>
      `;
    }).join('');

    const partVerses = `
      <section class="card-part-verses">
        <div class="verses-watermark">”</div>
        <div class="verses-title-bar">
          <span class="verses-heading">कलाम मुकम्मल</span>
          <div class="verses-actions">
            <button class="verse-action-btn listen-btn" data-poem-id="${poem.id}" title="सस्वर पाठ सुनें (Audio Recitation)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              <span>सुनें</span>
            </button>
            <button class="verse-action-btn fav-btn ${isFav ? 'active' : ''}" data-poem-id="${poem.id}" title="${isFav ? 'पसंदीदा से हटाएं' : 'पसंदीदा में जोड़ें'}">
              <svg viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <span>${isFav ? 'पसंदीदा' : 'सहेजें'}</span>
            </button>
            <button class="verse-action-btn copy-btn" data-poem-id="${poem.id}" title="पूरा कलाम कॉपी करें">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>कॉपी</span>
            </button>
          </div>
        </div>

        <div class="poetry-body">
          ${formattedCoupletsHtml}
        </div>
      </section>
    `;

    // --- ZONE 3: INLINE SLEEK VOCABULARY RIBBON ---
    const previewWords = poem.words.slice(0, 8);
    const previewPillsHtml = previewWords.map(w => `
      <button class="vocab-pill-btn" data-word="${escapeHtml(w.word)}" data-trans="${escapeHtml(w.transliteration)}" data-meaning="${escapeHtml(w.meaning)}" title="${escapeHtml(w.meaning)} (अर्थ देखें)">
        <span class="vp-term">${escapeHtml(w.word)}</span>
      </button>
    `).join('');

    const wordsCardsHtml = poem.words.map(w => `
      <div class="word-card" data-word="${escapeHtml(w.word)}">
        <div class="word-card-top">
          <span class="word-term">${escapeHtml(w.word)}</span>
          ${w.transliteration ? `<span class="word-trans">(${escapeHtml(w.transliteration)})</span>` : ''}
        </div>
        <p class="word-meaning">${escapeHtml(w.meaning)}</p>
        <a href="#dict-${encodeURIComponent(w.word)}" class="word-dict-link" data-word="${escapeHtml(w.word)}">
          शब्दकोश में देखें &rarr;
        </a>
      </div>
    `).join('');

    const partWords = `
      <section class="card-part-words">
        <div class="vocab-ribbon-bar">
          <div class="vocab-title">
            <span class="vocab-sparkle">✨</span>
            <span>लफ़्ज़-ओ-मा'नी</span>
            <span class="vocab-badge">${poem.words.length} शब्द</span>
          </div>
          <button class="vocab-expand-toggle" data-poem-id="${poem.id}">
            विस्तृत शब्दार्थ ↓
          </button>
        </div>

        <div class="vocab-pills-row">
          ${previewPillsHtml}
          ${poem.words.length > 6 ? `<span class="vocab-more-hint">+${poem.words.length - 6} और शब्द</span>` : ''}
        </div>

        <div class="vocab-full-drawer">
          <div class="vocab-drawer-grid">
            ${wordsCardsHtml}
          </div>
        </div>
      </section>
    `;

    card.innerHTML = partAbout + partVerses + partWords;
    return card;
  }

  /**
   * Helper to wrap glossary words inside poetry verses with .glossary-term
   */
  function highlightDifficultWords(text, wordsList) {
    if (!wordsList || wordsList.length === 0) return escapeHtml(text);

    // Sort words by length descending so longer phrases match first
    const sortedWords = [...wordsList].sort((a, b) => b.word.length - a.word.length);

    let result = escapeHtml(text);

    sortedWords.forEach(w => {
      const cleanWord = w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Regex matching the word boundary or within hyphens
      const regex = new RegExp(`(${cleanWord})`, 'gi');
      result = result.replace(regex, (match) => {
        return `<span class="glossary-term" data-word="${escapeHtml(w.word)}" data-trans="${escapeHtml(w.transliteration)}" data-meaning="${escapeHtml(w.meaning)}">${match}</span>`;
      });
    });

    return result;
  }

  // --- Dictionary View ---
  function getFilteredDictionary() {
    let list = [...data.dictionary];

    // Search Query
    if (state.dictSearchQuery.trim()) {
      const q = state.dictSearchQuery.trim().toLowerCase();
      list = list.filter(item => 
        item.word.toLowerCase().includes(q) ||
        item.transliteration.toLowerCase().includes(q) ||
        item.meaning.toLowerCase().includes(q)
      );
    }

    // Letter Filter
    if (state.dictLetterFilter !== 'all') {
      list = list.filter(item => item.initial_hi === state.dictLetterFilter);
    }

    return list;
  }

  function renderDictionaryList() {
    const list = getFilteredDictionary();
    const totalWords = data.stats.total_words;

    // Check if filtering is active
    const isFiltered = state.dictSearchQuery.trim() !== '' || state.dictLetterFilter !== 'all';
    const alertEl = document.getElementById('dictFilterAlert');
    const alertTextEl = document.getElementById('dictFilterAlertText');

    if (alertEl && alertTextEl) {
      if (isFiltered) {
        alertEl.style.display = 'flex';
        let filterDesc = '';
        if (state.dictSearchQuery.trim()) filterDesc += `खोज: "${state.dictSearchQuery.trim()}"`;
        if (state.dictLetterFilter !== 'all') {
          if (filterDesc) filterDesc += ' • ';
          filterDesc += `अक्षर: "${state.dictLetterFilter}"`;
        }
        alertTextEl.innerHTML = `फ़िल्टर सक्रिय (${filterDesc}) — <strong>${list.length}</strong> शब्द मिले (कुल संग्रह: ${totalWords} शब्द)`;
      } else {
        alertEl.style.display = 'none';
      }
    }

    elements.dictCountText.textContent = `${totalWords} में से ${list.length} शब्द प्रदर्शित`;

    if (list.length === 0) {
      elements.dictionaryGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">📖</div>
          <h3 class="empty-state-title">कोई शब्द नहीं मिला</h3>
          <p class="empty-state-desc">आपके खोजे गए शब्द या चुने गए अक्षर के अनुसार कोई प्रविष्टि नहीं मिली।</p>
          <button class="dict-reset-filter-btn" style="margin: 1rem auto; display: inline-flex;" onclick="window.sukhanResetDictFilters()">सभी ${totalWords} शब्द दिखाएं</button>
        </div>
      `;
      return;
    }

    elements.dictionaryGrid.innerHTML = '';
    list.forEach(w => {
      const card = document.createElement('div');
      card.className = 'dict-card';
      card.id = `dict-${encodeURIComponent(w.word)}`;

      const occurrencesHtml = w.poems.map(p => `
        <div class="occurrence-item">
          <span>${escapeHtml(p.poet_hi)}</span>
          <a class="occurrence-link jump-to-poem" data-poem-id="${p.poem_id}" data-target-word="${escapeHtml(w.word)}" title="कलाम पढ़ें">
            कलाम #${p.poem_id} &rarr;
          </a>
        </div>
      `).join('');

      card.innerHTML = `
        <div class="dict-card-top">
          <span class="dict-word">${escapeHtml(w.word)}</span>
          ${w.transliteration ? `<span class="dict-trans">(${escapeHtml(w.transliteration)})</span>` : ''}
        </div>
        <div class="dict-meaning">${escapeHtml(w.meaning)}</div>
        <div class="dict-occurrences">
          <div class="occurrences-title">प्रयुक्त कलाम (${w.poems.length}):</div>
          ${occurrencesHtml}
        </div>
      `;

      elements.dictionaryGrid.appendChild(card);
    });
  }

  // --- Poets Grid View ---
  function renderPoetsGrid() {
    const poetMap = {};
    data.poems.forEach(p => {
      const name = p.poet.name_hi;
      if (!poetMap[name]) {
        poetMap[name] = {
          name_hi: p.poet.name_hi,
          name_en: p.poet.name_en,
          poems: [],
          genres: new Set(),
          wordsCount: 0
        };
      }
      poetMap[name].poems.push(p);
      poetMap[name].genres.add(p.genre.category);
      poetMap[name].wordsCount += p.words.length;
    });

    const sortedPoets = Object.values(poetMap).sort((a, b) => b.poems.length - a.poems.length);

    elements.poetsGrid.innerHTML = '';
    sortedPoets.forEach(poet => {
      const card = document.createElement('div');
      card.className = 'poet-card';
      card.innerHTML = `
        <div class="poet-card-main">
          <div class="poet-card-avatar">${poet.name_hi[0]}</div>
          <div class="poet-card-name">
            <h3>${escapeHtml(poet.name_hi)}</h3>
            <p>${escapeHtml(poet.name_en)}</p>
          </div>
        </div>
        <div class="poet-card-footer">
          <span class="poet-count-badge">${poet.poems.length} कलाम &bull; ${poet.wordsCount} शब्द</span>
          <span class="poet-view-action">कलाम देखें &rarr;</span>
        </div>
      `;

      card.addEventListener('click', () => {
        state.selectedPoet = poet.name_hi;
        elements.poetSelect.value = poet.name_hi;
        switchTab('tab-shayari');
        renderShayariList();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      elements.poetsGrid.appendChild(card);
    });
  }

  // --- Favorites View ---
  function renderFavoritesList() {
    const favPoems = data.poems.filter(p => state.favorites.has(p.id));

    if (favPoems.length === 0) {
      elements.favoritesContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🤍</div>
          <h3 class="empty-state-title">अभी कोई पसंदीदा कलाम नहीं है</h3>
          <p class="empty-state-desc">कलाम पढ़ते समय 'सहेजें' बटन पर क्लिक करके अपने पसंदीदा शेर यहाँ सहेज सकते हैं।</p>
          <button class="modal-action-btn primary" onclick="document.querySelector('[data-tab=tab-shayari]').click()">कलाम संग्रह देखें</button>
        </div>
      `;
      return;
    }

    elements.favoritesContainer.innerHTML = '';
    favPoems.forEach(poem => {
      const card = createPoemCard(poem);
      elements.favoritesContainer.appendChild(card);
    });
  }

  function toggleFavorite(poemId) {
    if (state.favorites.has(poemId)) {
      state.favorites.delete(poemId);
      showToast('पसंदीदा से हटाया गया');
    } else {
      state.favorites.add(poemId);
      showToast('पसंदीदा में सहेजा गया ❤️');
    }
    localStorage.setItem('sukhan_favorites', JSON.stringify(Array.from(state.favorites)));
    updateFavoritesBadge();

    // Re-render favorite buttons in place
    document.querySelectorAll(`.fav-btn[data-poem-id="${poemId}"]`).forEach(btn => {
      const isFav = state.favorites.has(poemId);
      btn.classList.toggle('active', isFav);
      btn.querySelector('span').textContent = isFav ? 'पसंदीदा' : 'सहेजें';
      const svg = btn.querySelector('svg');
      if (svg) svg.setAttribute('fill', isFav ? 'currentColor' : 'none');
    });

    if (state.activeTab === 'tab-favorites') {
      renderFavoritesList();
    }
  }

  function updateFavoritesBadge() {
    if (elements.badgeTotalFavs) {
      elements.badgeTotalFavs.textContent = state.favorites.size;
    }
  }

  // --- Active Filters Indicator UI ---
  function updateActiveFiltersUI() {
    const tags = [];

    if (state.searchQuery.trim()) {
      tags.push({ label: `खोज: "${state.searchQuery}"`, key: 'search' });
    }
    if (state.selectedPoet !== 'all') {
      tags.push({ label: `शायर: ${state.selectedPoet}`, key: 'poet' });
    }
    if (state.selectedGenre !== 'all') {
      tags.push({ label: `विधा: ${state.selectedGenre}`, key: 'genre' });
    }
    if (state.selectedTheme !== 'all') {
      tags.push({ label: `मौज़ू: ${state.selectedTheme}`, key: 'theme' });
    }

    if (tags.length > 0) {
      elements.activeFiltersBar.style.display = 'flex';
      elements.activeTagsContainer.innerHTML = tags.map(t => `
        <span class="filter-tag">
          <span>${escapeHtml(t.label)}</span>
          <span class="filter-tag-remove" data-key="${t.key}">&times;</span>
        </span>
      `).join('');
    } else {
      elements.activeFiltersBar.style.display = 'none';
      elements.activeTagsContainer.innerHTML = '';
    }
  }

  function resetAllFilters() {
    state.searchQuery = '';
    state.selectedPoet = 'all';
    state.selectedGenre = 'all';
    state.selectedTheme = 'all';
    state.sortBy = 'default';

    elements.shayariSearchInput.value = '';
    elements.clearShayariSearch.style.display = 'none';
    elements.poetSelect.value = 'all';
    elements.genreSelect.value = 'all';
    elements.sortSelect.value = 'default';

    document.querySelectorAll('.theme-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.theme === 'all');
    });

    renderShayariList();
  }

  // --- Random Poem / Ittefaq Feature ---
  function showRandomPoemModal() {
    const randomIndex = Math.floor(Math.random() * data.poems.length);
    const randomPoem = data.poems[randomIndex];

    // Pick couplet from poem
    const couplet = randomPoem.verses.couplets[0] || [];
    const coupletText = couplet.map(line => `<div>${escapeHtml(line)}</div>`).join('');

    elements.modalContent.innerHTML = `
      <div class="modal-couplet">${coupletText}</div>
      <div class="modal-poet-meta">&mdash; ${escapeHtml(randomPoem.poet.name_hi)} (${escapeHtml(randomPoem.genre.category)})</div>
    `;

    elements.viewInContextBtn.onclick = () => {
      closeModal();
      jumpToPoem(randomPoem.id);
    };

    elements.ittefaqModal.classList.add('open');
  }

  function closeModal() {
    elements.ittefaqModal.classList.remove('open');
  }

  // --- Jump to Poem & Highlight Word ---
  function jumpToPoem(poemId, targetWord) {
    switchTab('tab-shayari');

    // Reset filters if poem is currently filtered out
    const isCurrentlyVisible = getFilteredPoems().some(p => p.id === poemId);
    if (!isCurrentlyVisible) {
      resetAllFilters();
    }

    setTimeout(() => {
      const card = document.getElementById(`poem-${poemId}`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('highlighted');
        setTimeout(() => card.classList.remove('highlighted'), 2500);

        if (targetWord) {
          // Highlight the specific word in the card
          const terms = card.querySelectorAll(`.glossary-term[data-word="${targetWord}"]`);
          terms.forEach(term => {
            term.style.backgroundColor = 'var(--accent-gold)';
            term.style.color = '#FFF';
            setTimeout(() => {
              term.style.backgroundColor = '';
              term.style.color = '';
            }, 3000);
          });
        }
      }
    }, 150);
  }

  // --- Copy Functionality ---
  function copyPoemToClipboard(poemId) {
    const poem = data.poems.find(p => p.id === poemId);
    if (!poem) return;

    let textToCopy = `« ${poem.title} »\nशायर: ${poem.poet.name_hi} (${poem.poet.name_en})\nविधा: ${poem.genre.category}\n\n`;
    textToCopy += poem.verses.raw + '\n\n';
    textToCopy += `--- कठिन शब्दों के अर्थ ---\n`;
    poem.words.forEach(w => {
      textToCopy += `• ${w.word}${w.transliteration ? ` (${w.transliteration})` : ''}: ${w.meaning}\n`;
    });
    textToCopy += `\nस्रोत: सुख़न कलाम डिजिटल संग्रह`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      showToast('मुकम्मल कलाम कॉपी हो गया! 📋');
    }).catch(() => {
      showToast('कॉपी करने में असमर्थ');
    });
  }

  // --- Audio / Speech Recitation Feature (Apple Spoken Content) ---
  let activeAudioPoemId = null;

  function togglePoemAudio(poemId, btn) {
    if (!('speechSynthesis' in window)) {
      showToast('वाक्-संश्लेषण (Speech) समर्थित नहीं है');
      return;
    }

    if (window.speechSynthesis.speaking && activeAudioPoemId === poemId) {
      window.speechSynthesis.cancel();
      stopPoemAudioUI();
      showToast('सस्वर पाठ रोका गया');
      return;
    }

    window.speechSynthesis.cancel();
    stopPoemAudioUI();

    const poem = data.poems.find(p => p.id === poemId);
    if (!poem) return;

    activeAudioPoemId = poemId;
    btn.classList.add('playing');
    const btnSpan = btn.querySelector('span');
    if (btnSpan) btnSpan.textContent = 'रोकें';
    showToast('पाठ सुना जा रहा है... 🎙️');

    // Show persistent Apple Music Audio Bar at bottom
    const audioBar = document.getElementById('appleAudioBar');
    if (audioBar) {
      audioBar.style.display = 'flex';
      const titleEl = document.getElementById('audioBarTitle');
      const poetEl = document.getElementById('audioBarPoet');
      const avatarEl = document.getElementById('audioBarAvatar');
      if (titleEl) titleEl.textContent = poem.title || `कलाम #${poem.id}`;
      if (poetEl) poetEl.textContent = poem.poet.name_hi;
      if (avatarEl) avatarEl.textContent = poem.poet.name_hi[0] || 'श';
    }

    const card = document.getElementById(`poem-${poemId}`);
    const coupletElems = card ? card.querySelectorAll('.couplet') : [];

    let currentIdx = 0;
    const couplets = poem.verses.couplets;

    function speakNextCouplet() {
      if (currentIdx >= couplets.length || activeAudioPoemId !== poemId) {
        stopPoemAudioUI();
        return;
      }

      coupletElems.forEach((el, idx) => el.classList.toggle('speaking', idx === currentIdx));

      const textToSpeak = couplets[currentIdx].join(' । ');
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'hi-IN';
      utterance.rate = 0.88;

      const voices = window.speechSynthesis.getVoices();
      const hindiVoice = voices.find(v => v.lang.startsWith('hi') || v.lang.startsWith('ur'));
      if (hindiVoice) utterance.voice = hindiVoice;

      utterance.onend = () => {
        currentIdx++;
        speakNextCouplet();
      };

      utterance.onerror = () => {
        stopPoemAudioUI();
      };

      window.speechSynthesis.speak(utterance);
    }

    speakNextCouplet();
  }

  function stopPoemAudioUI() {
    if (activeAudioPoemId) {
      const card = document.getElementById(`poem-${activeAudioPoemId}`);
      if (card) {
        const btn = card.querySelector('.listen-btn');
        if (btn) {
          btn.classList.remove('playing');
          const btnSpan = btn.querySelector('span');
          if (btnSpan) btnSpan.textContent = 'सुनें';
        }
        card.querySelectorAll('.couplet').forEach(el => el.classList.remove('speaking'));
      }
      activeAudioPoemId = null;
    }
    const audioBar = document.getElementById('appleAudioBar');
    if (audioBar) audioBar.style.display = 'none';
  }

  // --- Tooltip Logic ---
  function showWordTooltip(targetElement) {
    const word = targetElement.dataset.word;
    const trans = targetElement.dataset.trans;
    const meaning = targetElement.dataset.meaning;

    elements.tooltipWord.textContent = word;
    elements.tooltipTrans.textContent = trans ? `(${trans})` : '';
    elements.tooltipMeaning.textContent = meaning;

    elements.tooltipViewDictBtn.onclick = (e) => {
      e.stopPropagation();
      hideWordTooltip();
      switchTab('tab-dictionary');
      state.dictSearchQuery = word;
      elements.dictSearchInput.value = word;
      renderDictionaryList();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Position tooltip
    const rect = targetElement.getBoundingClientRect();
    const tooltipWidth = 300;
    let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
    let top = rect.bottom + 8;

    // Boundary checks
    if (left < 10) left = 10;
    if (left + tooltipWidth > window.innerWidth - 10) {
      left = window.innerWidth - tooltipWidth - 10;
    }
    if (top + 160 > window.innerHeight) {
      top = rect.top - 140;
    }

    elements.wordTooltip.style.left = `${left}px`;
    elements.wordTooltip.style.top = `${top}px`;
    elements.wordTooltip.style.display = 'block';

    state.activeTooltipTerm = targetElement;
  }

  function hideWordTooltip() {
    elements.wordTooltip.style.display = 'none';
    state.activeTooltipTerm = null;
  }

  // --- Toast Notification ---
  let toastTimer = null;
  function showToast(message) {
    if (toastTimer) clearTimeout(toastTimer);
    elements.toastMessage.textContent = message;
    elements.toastNotification.classList.add('show');
    toastTimer = setTimeout(() => {
      elements.toastNotification.classList.remove('show');
    }, 2400);
  }

  // --- Tab Switcher ---
  function switchTab(tabId) {
    state.activeTab = tabId;

    elements.navTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });

    elements.tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === tabId);
    });

    hideWordTooltip();
  }

  // --- URL Hash Routing ---
  function checkUrlHash() {
    const hash = window.location.hash;
    if (!hash) return;

    if (hash.startsWith('#poem-')) {
      const id = parseInt(hash.replace('#poem-', ''), 10);
      if (id) jumpToPoem(id);
    } else if (hash.startsWith('#dict-')) {
      const word = decodeURIComponent(hash.replace('#dict-', ''));
      switchTab('tab-dictionary');
      state.dictSearchQuery = word;
      elements.dictSearchInput.value = word;
      renderDictionaryList();
    }
  }

  // Reset all dictionary search and letter filters to show all 252 words
  window.sukhanResetDictFilters = function() {
    state.dictSearchQuery = '';
    state.dictLetterFilter = 'all';
    if (elements.dictSearchInput) elements.dictSearchInput.value = '';
    if (elements.clearDictSearch) elements.clearDictSearch.style.display = 'none';
    if (elements.devanagariAlphabet) {
      elements.devanagariAlphabet.querySelectorAll('.letter-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.letter === 'all');
      });
    }
    renderDictionaryList();
  };

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // Navigation Tabs
    elements.navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        if (targetTab === 'tab-dictionary') {
          // Opening dictionary tab directly resets any previous word filter to show all 252 words!
          window.sukhanResetDictFilters();
        }
        switchTab(targetTab);
        if (targetTab === 'tab-favorites') {
          renderFavoritesList();
        }
      });
    });

    // Theme Switcher (Clean 2-way: Minimal Smoked Black <-> Studio Parchment Light)
    elements.themeToggleBtn.addEventListener('click', () => {
      const newTheme = state.theme === 'midnight' ? 'parchment' : 'midnight';
      const themeMsg = newTheme === 'midnight' ? 'डार्क मोड सक्रिय 🌙' : 'काग़ज़/लाइट मोड सक्रिय ☀️';
      state.theme = newTheme;
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('sukhan_theme_v8', newTheme);
      showToast(themeMsg);
    });

    // Apple Audio Bar Controls
    const audioBarClose = document.getElementById('audioBarCloseBtn');
    if (audioBarClose) {
      audioBarClose.addEventListener('click', () => {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        stopPoemAudioUI();
        showToast('सस्वर पाठ बंद किया गया');
      });
    }

    const audioBarPlayPause = document.getElementById('audioBarPlayPauseBtn');
    if (audioBarPlayPause) {
      audioBarPlayPause.addEventListener('click', () => {
        if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
            showToast('सस्वर पाठ जारी ▶');
          } else {
            window.speechSynthesis.pause();
            showToast('सस्वर पाठ विराम ⏸');
          }
        }
      });
    }

    // Font Size Switcher
    elements.fontSizeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const size = btn.dataset.size;
        state.fontSize = size;
        document.documentElement.setAttribute('data-fontsize', size);
        localStorage.setItem('sukhan_fontsize', size);
        elements.fontSizeBtns.forEach(b => b.classList.toggle('active', b === btn));
      });
    });

    // Random Couplet Modal
    elements.randomPoemBtn.addEventListener('click', showRandomPoemModal);
    elements.closeModalBtn.addEventListener('click', closeModal);
    elements.nextRandomBtn.addEventListener('click', showRandomPoemModal);
    elements.ittefaqModal.addEventListener('click', (e) => {
      if (e.target === elements.ittefaqModal) closeModal();
    });

    // Shayari Search Input
    elements.shayariSearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      elements.clearShayariSearch.style.display = state.searchQuery ? 'block' : 'none';
      renderShayariList();
    });

    elements.clearShayariSearch.addEventListener('click', () => {
      state.searchQuery = '';
      elements.shayariSearchInput.value = '';
      elements.clearShayariSearch.style.display = 'none';
      renderShayariList();
    });

    // Filters Dropdowns
    elements.poetSelect.addEventListener('change', (e) => {
      state.selectedPoet = e.target.value;
      renderShayariList();
    });

    elements.genreSelect.addEventListener('change', (e) => {
      state.selectedGenre = e.target.value;
      renderShayariList();
    });

    elements.sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      renderShayariList();
    });

    // View Mode Toggle
    elements.viewDetailedBtn.addEventListener('click', () => {
      state.viewMode = 'detailed';
      elements.viewDetailedBtn.classList.add('active');
      elements.viewCompactBtn.classList.remove('active');
      elements.shayariCardsContainer.classList.remove('compact-view');
    });

    elements.viewCompactBtn.addEventListener('click', () => {
      state.viewMode = 'compact';
      elements.viewCompactBtn.classList.add('active');
      elements.viewDetailedBtn.classList.remove('active');
      elements.shayariCardsContainer.classList.add('compact-view');
    });

    // Theme Chips
    elements.themeChipsContainer.addEventListener('click', (e) => {
      const chip = e.target.closest('.theme-chip');
      if (!chip) return;
      state.selectedTheme = chip.dataset.theme;
      elements.themeChipsContainer.querySelectorAll('.theme-chip').forEach(c => {
        c.classList.toggle('active', c === chip);
      });
      renderShayariList();
    });

    // Active Filters Bar Tag Removal
    elements.activeTagsContainer.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.filter-tag-remove');
      if (!removeBtn) return;
      const key = removeBtn.dataset.key;
      if (key === 'search') {
        state.searchQuery = '';
        elements.shayariSearchInput.value = '';
        elements.clearShayariSearch.style.display = 'none';
      } else if (key === 'poet') {
        state.selectedPoet = 'all';
        elements.poetSelect.value = 'all';
      } else if (key === 'genre') {
        state.selectedGenre = 'all';
        elements.genreSelect.value = 'all';
      } else if (key === 'theme') {
        state.selectedTheme = 'all';
        elements.themeChipsContainer.querySelectorAll('.theme-chip').forEach(c => {
          c.classList.toggle('active', c.dataset.theme === 'all');
        });
      }
      renderShayariList();
    });

    elements.resetAllFiltersBtn.addEventListener('click', resetAllFilters);

    // Dictionary Search & Letter Buttons
    elements.dictSearchInput.addEventListener('input', (e) => {
      state.dictSearchQuery = e.target.value;
      elements.clearDictSearch.style.display = state.dictSearchQuery ? 'block' : 'none';
      renderDictionaryList();
    });

    elements.clearDictSearch.addEventListener('click', () => {
      state.dictSearchQuery = '';
      elements.dictSearchInput.value = '';
      elements.clearDictSearch.style.display = 'none';
      renderDictionaryList();
    });

    elements.devanagariAlphabet.addEventListener('click', (e) => {
      const btn = e.target.closest('.letter-btn');
      if (!btn) return;
      state.dictLetterFilter = btn.dataset.letter;
      elements.devanagariAlphabet.querySelectorAll('.letter-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
      });
      renderDictionaryList();
    });

    // Global Delegated Click Listeners
    document.addEventListener('click', (e) => {
      // Favorite Button
      const favBtn = e.target.closest('.fav-btn');
      if (favBtn) {
        const id = parseInt(favBtn.dataset.poemId, 10);
        toggleFavorite(id);
        return;
      }

      // Audio Listen Button
      const listenBtn = e.target.closest('.listen-btn');
      if (listenBtn) {
        const id = parseInt(listenBtn.dataset.poemId, 10);
        togglePoemAudio(id, listenBtn);
        return;
      }

      // Copy Button
      const copyBtn = e.target.closest('.copy-btn');
      if (copyBtn) {
        const id = parseInt(copyBtn.dataset.poemId, 10);
        copyPoemToClipboard(id);
        return;
      }

      // Jump to Poem Link
      const jumpLink = e.target.closest('.jump-to-poem');
      if (jumpLink) {
        const poemId = parseInt(jumpLink.dataset.poemId, 10);
        const targetWord = jumpLink.dataset.targetWord;
        jumpToPoem(poemId, targetWord);
        return;
      }

      // Word Dictionary Link inside Poem Card Part 3
      const wordDictLink = e.target.closest('.word-dict-link');
      if (wordDictLink) {
        const word = wordDictLink.dataset.word;
        switchTab('tab-dictionary');
        state.dictSearchQuery = word;
        elements.dictSearchInput.value = word;
        elements.clearDictSearch.style.display = 'block';
        renderDictionaryList();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // Compact view expand button
      const compactBtn = e.target.closest('.compact-toggle-btn');
      if (compactBtn) {
        const card = compactBtn.closest('.shayari-card');
        if (card) {
          card.classList.toggle('expanded');
          compactBtn.querySelector('span').textContent = card.classList.contains('expanded') ? 'परिचय संक्षिप्त करें' : 'विस्तृत परिचय पढ़ें';
        }
        return;
      }

      // Context Drawer Toggle (Poem Story & Background)
      const contextBtn = e.target.closest('.context-drawer-btn');
      if (contextBtn) {
        const card = contextBtn.closest('.shayari-card');
        if (card) {
          card.classList.toggle('context-open');
          const isOpen = card.classList.contains('context-open');
          const span = contextBtn.querySelector('span');
          if (span) span.textContent = isOpen ? '📖 परिचय संक्षिप्त करें' : '📖 कलाम परिचय व संदर्भ';
        }
        return;
      }

      // Vocabulary Full Drawer Toggle
      const vocabToggleBtn = e.target.closest('.vocab-expand-toggle');
      if (vocabToggleBtn) {
        const card = vocabToggleBtn.closest('.shayari-card');
        if (card) {
          card.classList.toggle('vocab-open');
          const isOpen = card.classList.contains('vocab-open');
          vocabToggleBtn.textContent = isOpen ? 'शब्दार्थ समेटें ↑' : 'विस्तृत शब्दार्थ ↓';
        }
        return;
      }

      // Vocabulary Micro-Pill Click (Show Definition Popover)
      const vocabPillBtn = e.target.closest('.vocab-pill-btn');
      if (vocabPillBtn) {
        e.stopPropagation();
        showWordTooltip(vocabPillBtn);
        return;
      }

      // Reset Dictionary Filters Button
      const resetDictBtn = e.target.closest('#dictResetFilterBtn');
      if (resetDictBtn) {
        window.sukhanResetDictFilters();
        showToast('सभी 252 शब्द प्रदर्शित किए गए 📖');
        return;
      }

      // Glossary Term inside Verses
      const term = e.target.closest('.glossary-term');
      if (term) {
        e.stopPropagation();
        if (state.activeTooltipTerm === term) {
          hideWordTooltip();
        } else {
          showWordTooltip(term);
        }
        return;
      }

      // Clicking outside tooltip hides it
      if (!e.target.closest('#wordTooltip')) {
        hideWordTooltip();
      }
    });

    // Apple-style Keyboard Support (⌘K / Ctrl+K, Escape, Space/Enter in modal)
    document.addEventListener('keydown', (e) => {
      // ⌘K or Ctrl+K for search focus
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        switchTab('tab-shayari');
        elements.shayariSearchInput.focus();
        elements.shayariSearchInput.select();
        showToast('खोज सक्रिय 🔍');
        return;
      }

      if (e.key === 'Escape') {
        closeModal();
        hideWordTooltip();
        stopPoemAudioUI();
        if (document.activeElement === elements.shayariSearchInput || document.activeElement === elements.dictSearchInput) {
          document.activeElement.blur();
        }
      }

      // Space / Enter for next random couplet when Ittefaq modal is open
      if (elements.ittefaqModal.classList.contains('open')) {
        if (e.key === ' ' || e.key === 'Enter') {
          // don't trigger if focus is on a button
          if (document.activeElement && document.activeElement.tagName === 'BUTTON') return;
          e.preventDefault();
          showRandomPoemModal();
        }
      }
    });
  }

  // --- Utility ---
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Start Application
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
