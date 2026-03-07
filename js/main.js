// ===== Search Filter =====
(function () {
  const searchInput = document.getElementById('search-input');
  const issueList = document.getElementById('issue-list');
  const noResults = document.getElementById('no-results');

  if (!searchInput || !issueList) return;

  searchInput.addEventListener('input', function () {
    const query = this.value.toLowerCase().trim();
    const cards = issueList.querySelectorAll('.issue-card');
    let visibleCount = 0;

    cards.forEach(function (card) {
      const text = card.textContent.toLowerCase();
      const keywords = (card.getAttribute('data-search') || '').toLowerCase();
      const match = !query || text.includes(query) || keywords.includes(query);
      card.style.display = match ? '' : 'none';
      if (match) visibleCount++;
    });

    if (noResults) {
      noResults.style.display = visibleCount === 0 && query ? 'block' : 'none';
    }
  });
})();

// ===== Mobile Nav Toggle =====
(function () {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');

  if (!toggle || !nav) return;

  toggle.addEventListener('click', function () {
    nav.classList.toggle('open');
    const expanded = nav.classList.contains('open');
    toggle.setAttribute('aria-expanded', expanded);
  });

  // Close nav when clicking a link
  nav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
})();
