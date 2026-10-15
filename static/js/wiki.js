/**
 * HomeLabik Wiki
 */

document.addEventListener('DOMContentLoaded', () => {
  // Theme toggle
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      
      try {
        localStorage.setItem('theme', newTheme);
      } catch (e) {}

      // Share theme across .homelabik.cz domain
      const hostname = window.location.hostname;
      const domainAttr = hostname.endsWith('homelabik.cz') ? '; domain=.homelabik.cz' : '';
      document.cookie = `theme=${newTheme}${domainAttr}; path=/; max-age=31536000; SameSite=Lax`;
    });
  }

  // Theme by system settings
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleSystemThemeChange = (e) => {
      const matchCookie = document.cookie.match(/(^|;\s*)theme=([^;]+)/);
      const cookieTheme = matchCookie ? decodeURIComponent(matchCookie[2]) : null;
      let localTheme = null;
      try {
        localTheme = localStorage.getItem('theme');
      } catch (_) {}

      const hasSavedTheme = (cookieTheme === 'light' || cookieTheme === 'dark') ||
                            (localTheme === 'light' || localTheme === 'dark');

      if (!hasSavedTheme) {
        document.documentElement.setAttribute('data-theme', e.matches ? 'light' : 'dark');
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleSystemThemeChange);
    }
  }

  // Sidebar category tree
  document.querySelectorAll('.tree-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const node = btn.closest('.tree-node');
      const children = node ? node.querySelector(':scope > .tree-children') : null;
      if (children) {
        const isOpen = children.classList.toggle('open');
        btn.classList.toggle('expanded', isOpen);
      }
    });
  });

  // Mobile sidebar
  const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
  const wikiSidebar = document.getElementById('wikiSidebar');
  if (sidebarToggleBtn && wikiSidebar) {
    sidebarToggleBtn.addEventListener('click', () => {
      wikiSidebar.classList.toggle('open');
    });

    // Close when clicking outside sidebar
    document.addEventListener('click', (e) => {
      if (wikiSidebar.classList.contains('open') && 
          !wikiSidebar.contains(e.target) && 
          !sidebarToggleBtn.contains(e.target)) {
        wikiSidebar.classList.remove('open');
      }
    });
  }

  // Remove diacritics for search
  function removeDiacritics(str) {
    return (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  // Apps catalog (search, filter, pagination)
  const searchInput = document.getElementById('appSearchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const categorySelect = document.getElementById('categorySelect');
  const appsGrid = document.getElementById('appsGrid');
  const emptyState = document.getElementById('emptyState');
  const visibleCount = document.getElementById('visibleCount');
  const pageInfoText = document.getElementById('pageInfoText');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  const perPageSelect = document.getElementById('perPageSelect');
  const appSortSelect = document.getElementById('appSortSelect');
  const paginationNav = document.getElementById('paginationNav');
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  const paginationNumbers = document.getElementById('paginationNumbers');

  if (appsGrid) {
    const appCards = Array.from(appsGrid.querySelectorAll('.wiki-app-card'));
    let activeCategory = 'all';
    let activeQuery = '';
    let currentPage = 1;
    let currentSort = 'newest';

    // Load per-page preference (default 8)
    const validPageSizes = ['8', '24', '48', '96'];
    let savedPerPage = localStorage.getItem('appsPerPage');
    if (!validPageSizes.includes(savedPerPage)) {
      savedPerPage = '8';
      localStorage.setItem('appsPerPage', '8');
    }
    let pageSize = parseInt(savedPerPage, 10);
    if (perPageSelect) {
      perPageSelect.value = savedPerPage;
    }

    // Format date tooltip in local timezone
    appCards.forEach(card => {
      const rawDate = card.dataset.date;
      if (rawDate && (rawDate.includes('T') || rawDate.includes(':'))) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          const dateBox = card.querySelector('.app-date');
          if (dateBox) {
            const day = d.getDate();
            const month = d.getMonth() + 1;
            const year = d.getFullYear();
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            dateBox.setAttribute('title', `${day}. ${month}. ${year} ${hours}:${minutes}`);
          }
        }
      }
    });

    // Check cached icons
    document.querySelectorAll('.app-icon-box img').forEach(img => {
      if (img.complete && img.naturalWidth > 0) {
        img.style.display = 'block';
        if (img.previousElementSibling) img.previousElementSibling.style.display = 'none';
      }
    });

    function renderList() {
      const query = removeDiacritics(activeQuery);

      // 1. Filter by category and search query
      const matchingCards = appCards.filter(card => {
        const name = removeDiacritics(card.dataset.name);
        const desc = removeDiacritics(card.dataset.desc);
        const category = card.dataset.category || '';
        const slug = removeDiacritics(card.dataset.slug);

        const matchesCategory = (activeCategory === 'all' || category === activeCategory);
        const matchesSearch = !query || name.includes(query) || desc.includes(query) || slug.includes(query);

        return matchesCategory && matchesSearch;
      });

      // 2. Sort
      matchingCards.sort((a, b) => {
        const nameA = a.dataset.name || '';
        const nameB = b.dataset.name || '';
        const dateA = a.dataset.date || '';
        const dateB = b.dataset.date || '';

        if (currentSort === 'az') {
          return nameA.localeCompare(nameB, 'cs');
        } else if (currentSort === 'za') {
          return nameB.localeCompare(nameA, 'cs');
        } else if (currentSort === 'oldest') {
          const timeA = Date.parse(dateA) || 0;
          const timeB = Date.parse(dateB) || 0;
          if (timeA !== timeB) return timeA - timeB;
          return nameA.localeCompare(nameB, 'cs');
        } else {
          // Default: newest first
          const timeA = Date.parse(dateA) || 0;
          const timeB = Date.parse(dateB) || 0;
          if (timeA !== timeB) return timeB - timeA;
          return nameA.localeCompare(nameB, 'cs');
        }
      });

      const totalMatching = matchingCards.length;

      // 3. Pagination
      let totalPages = 1;
      let paginatedCards = matchingCards;

      if (typeof pageSize === 'number' && pageSize > 0) {
        totalPages = Math.ceil(totalMatching / pageSize) || 1;
        if (currentPage > totalPages) {
          currentPage = totalPages;
        }
        if (currentPage < 1) {
          currentPage = 1;
        }
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        paginatedCards = matchingCards.slice(startIndex, endIndex);
      }

      // 4. Render sorted cards
      appCards.forEach(card => {
        card.style.display = 'none';
      });
      paginatedCards.forEach(card => {
        card.style.display = 'flex';
        appsGrid.appendChild(card);
      });

    // Update stats
    if (visibleCount) {
      visibleCount.textContent = totalMatching;
    }

    if (pageInfoText) {
      if (totalPages > 1) {
        pageInfoText.textContent = `· Stránka ${currentPage} z ${totalPages}`;
      } else {
        pageInfoText.textContent = '';
      }
    }

    if (emptyState) {
      emptyState.style.display = totalMatching === 0 ? 'block' : 'none';
    }

    if (resetFiltersBtn) {
      resetFiltersBtn.style.display = (activeCategory !== 'all' || activeQuery.length > 0) ? 'inline-block' : 'none';
    }

    if (clearSearchBtn) {
      clearSearchBtn.style.display = activeQuery.length > 0 ? 'block' : 'none';
    }

    // Render pagination
    if (paginationNav) {
      if (totalPages > 1) {
        paginationNav.style.display = 'flex';

        if (prevPageBtn) {
          prevPageBtn.disabled = currentPage <= 1;
        }
        if (nextPageBtn) {
          nextPageBtn.disabled = currentPage >= totalPages;
        }

        const scrollToGridTopIfNeeded = () => {
          const rect = appsGrid.getBoundingClientRect();
          if (rect.top < 70) {
            window.scrollTo({
              top: window.scrollY + rect.top - 80,
              behavior: 'smooth'
            });
          }
        };

        if (paginationNumbers) {
          paginationNumbers.innerHTML = '';
          for (let p = 1; p <= totalPages; p++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-num-btn${p === currentPage ? ' active' : ''}`;
            pageBtn.textContent = p;
            pageBtn.setAttribute('aria-label', `Stránka ${p}`);
            pageBtn.addEventListener('click', () => {
              currentPage = p;
              renderList();
              scrollToGridTopIfNeeded();
            });
            paginationNumbers.appendChild(pageBtn);
          }
        }
      } else {
        paginationNav.style.display = 'none';
      }
    }
  }

  // Prev / Next buttons
  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderList();
        const rect = appsGrid.getBoundingClientRect();
        if (rect.top < 70) {
          window.scrollTo({ top: window.scrollY + rect.top - 80, behavior: 'smooth' });
        }
      }
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
      currentPage++;
      renderList();
      const rect = appsGrid.getBoundingClientRect();
      if (rect.top < 70) {
        window.scrollTo({ top: window.scrollY + rect.top - 80, behavior: 'smooth' });
      }
    });
  }

  // Per-page selector
  if (perPageSelect) {
    perPageSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      pageSize = parseInt(val, 10) || 8;
      localStorage.setItem('appsPerPage', val);
      currentPage = 1;
      renderList();
    });
  }

  // Sort selector
  if (appSortSelect) {
    appSortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      currentPage = 1;
      renderList();
    });
  }

  // URL category parameter
  const urlParams = new URLSearchParams(window.location.search);
  const paramCategory = urlParams.get('category');
  if (paramCategory) {
    activeCategory = paramCategory;
    if (categorySelect) {
      categorySelect.value = paramCategory;
    }
  }

  // Search input listeners
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      activeQuery = e.target.value;
      currentPage = 1;
      renderList();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
      if (e.key === 'Escape' && document.activeElement === searchInput) {
        searchInput.value = '';
        activeQuery = '';
        currentPage = 1;
        searchInput.blur();
        renderList();
      }
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        activeQuery = '';
        currentPage = 1;
        searchInput.focus();
        renderList();
      }
    });
  }

  // Category dropdown
  if (categorySelect) {
    categorySelect.addEventListener('change', (e) => {
      activeCategory = e.target.value;
      currentPage = 1;

      const newUrl = new URL(window.location);
      if (activeCategory === 'all') {
        newUrl.searchParams.delete('category');
      } else {
        newUrl.searchParams.set('category', activeCategory);
      }
      window.history.replaceState({}, '', newUrl);

      renderList();
    });
  }

  // Reset filters
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      activeCategory = 'all';
      activeQuery = '';
      currentSort = 'newest';
      if (categorySelect) categorySelect.value = 'all';
      if (appSortSelect) appSortSelect.value = 'newest';
      currentPage = 1;
      if (searchInput) searchInput.value = '';
      const newUrl = new URL(window.location);
      newUrl.searchParams.delete('category');
      window.history.replaceState({}, '', newUrl);
      renderList();
    });
  }

    // Initial render
    renderList();
  }

  // Section search and pagination
  const sectionPostsList = document.getElementById('sectionPostsList');
  if (sectionPostsList) {
    const postCards = Array.from(sectionPostsList.querySelectorAll('.wiki-post-card'));
    const secSearchInput = document.getElementById('sectionSearchInput');
    const secClearBtn = document.getElementById('clearSectionSearchBtn');
    const secEmptyState = document.getElementById('sectionEmptyState');
    const secVisibleCount = document.getElementById('sectionVisibleCount');
    const secPageInfoText = document.getElementById('sectionPageInfoText');
    const secPerPageSelect = document.getElementById('sectionPerPageSelect');
    const secPaginationNav = document.getElementById('sectionPaginationNav');
    const secPrevBtn = document.getElementById('sectionPrevPageBtn');
    const secNextBtn = document.getElementById('sectionNextPageBtn');
    const secPageNumbers = document.getElementById('sectionPaginationNumbers');

    let secQuery = '';
    let secCurrentPage = 1;
    let secPageSize = 6;

    if (secPerPageSelect) {
      secPerPageSelect.addEventListener('change', () => {
        secPageSize = secPerPageSelect.value === 'all' ? 'all' : parseInt(secPerPageSelect.value, 10);
        secCurrentPage = 1;
        renderSectionList();
      });
    }

    function renderSectionList() {
      const q = removeDiacritics(secQuery);
      const matched = postCards.filter(card => {
        if (!q) return true;
        const title = removeDiacritics(card.dataset.title);
        const desc = removeDiacritics(card.dataset.desc);
        return title.includes(q) || desc.includes(q);
      });

      if (secVisibleCount) secVisibleCount.textContent = matched.length;

      if (matched.length === 0) {
        postCards.forEach(c => c.style.display = 'none');
        if (secEmptyState) secEmptyState.style.display = 'block';
        if (secPaginationNav) secPaginationNav.style.display = 'none';
        if (secPageInfoText) secPageInfoText.textContent = '';
        return;
      }

      if (secEmptyState) secEmptyState.style.display = 'none';

      let totalPages = 1;
      let startIndex = 0;
      let endIndex = matched.length;

      if (secPageSize !== 'all') {
        totalPages = Math.ceil(matched.length / secPageSize);
        if (secCurrentPage > totalPages) secCurrentPage = totalPages;
        if (secCurrentPage < 1) secCurrentPage = 1;
        startIndex = (secCurrentPage - 1) * secPageSize;
        endIndex = startIndex + secPageSize;
      }

      const pagedSet = new Set(matched.slice(startIndex, endIndex));
      postCards.forEach(card => {
        card.style.display = pagedSet.has(card) ? 'flex' : 'none';
      });

      if (secPageInfoText) {
        if (secPageSize !== 'all' && totalPages > 1) {
          secPageInfoText.textContent = `· Stránka ${secCurrentPage} z ${totalPages}`;
        } else {
          secPageInfoText.textContent = '';
        }
      }

      if (secPaginationNav) {
        if (totalPages > 1 && secPageSize !== 'all') {
          secPaginationNav.style.display = 'flex';
          if (secPrevBtn) secPrevBtn.disabled = secCurrentPage <= 1;
          if (secNextBtn) secNextBtn.disabled = secCurrentPage >= totalPages;

          if (secPageNumbers) {
            secPageNumbers.innerHTML = '';
            for (let i = 1; i <= totalPages; i++) {
              const numBtn = document.createElement('button');
              numBtn.className = `pagination-number-btn${i === secCurrentPage ? ' active' : ''}`;
              numBtn.textContent = i;
              numBtn.addEventListener('click', () => {
                secCurrentPage = i;
                renderSectionList();
              });
              secPageNumbers.appendChild(numBtn);
            }
          }
        } else {
          secPaginationNav.style.display = 'none';
        }
      }
    }

    if (secSearchInput) {
      secSearchInput.addEventListener('input', (e) => {
        secQuery = e.target.value;
        secCurrentPage = 1;
        if (secClearBtn) secClearBtn.style.display = secQuery ? 'block' : 'none';
        renderSectionList();
      });
    }

    if (secClearBtn) {
      secClearBtn.addEventListener('click', () => {
        secQuery = '';
        if (secSearchInput) secSearchInput.value = '';
        secClearBtn.style.display = 'none';
        secCurrentPage = 1;
        renderSectionList();
      });
    }

    if (secPrevBtn) {
      secPrevBtn.addEventListener('click', () => {
        if (secCurrentPage > 1) {
          secCurrentPage--;
          renderSectionList();
        }
      });
    }

    if (secNextBtn) {
      secNextBtn.addEventListener('click', () => {
        secCurrentPage++;
        renderSectionList();
      });
    }

    renderSectionList();
  }

  // Code block copy button
  const copyIconSvg = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="13" height="13" x="9" y="9" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const checkIconSvg = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  document.querySelectorAll('.highlight, .wiki-markdown-body pre').forEach((block) => {
    if (block.tagName === 'PRE' && block.closest('.highlight')) return;
    if (block.querySelector('.copy-code-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'copy-code-btn';
    btn.setAttribute('aria-label', 'Kopírovat kód');
    btn.title = 'Kopírovat kód';
    btn.innerHTML = copyIconSvg;

    block.appendChild(btn);

    btn.addEventListener('click', () => {
      const code = block.querySelector('code') || block.querySelector('pre') || block;
      const textToCopy = (code.innerText || '').trim();
      if (!textToCopy) return;

      navigator.clipboard.writeText(textToCopy).then(() => {
        btn.innerHTML = checkIconSvg;
        btn.classList.add('copied');
        setTimeout(() => {
          btn.innerHTML = copyIconSvg;
          btn.classList.remove('copied');
        }, 2000);
      }).catch(err => {
        console.error('Chyba při kopírování:', err);
      });
    });
  });

  // Markdown callouts (> [!NOTE], > [!TIP], etc.)
  document.querySelectorAll('.wiki-markdown-body blockquote').forEach((bq) => {
    const firstP = bq.querySelector('p') || bq;
    const match = firstP.innerHTML.match(/^\s*\[!(NOTE|INFO|TIP|WARNING|CAUTION|IMPORTANT|BETA)\]\s*(<br\s*\/?>)?\s*/i);
    if (match) {
      const type = match[1].toUpperCase();
      firstP.innerHTML = firstP.innerHTML.replace(match[0], '');
      bq.classList.add('callout-box');

      if (type === 'WARNING' || type === 'BETA') {
        bq.classList.add('callout-warning');
      } else if (type === 'TIP') {
        bq.classList.add('callout-tip');
      } else if (type === 'CAUTION' || type === 'IMPORTANT') {
        bq.classList.add('callout-important');
      } else {
        bq.classList.add('callout-info');
      }
    } else {
      bq.classList.add('callout-quote');
    }
  });
});
