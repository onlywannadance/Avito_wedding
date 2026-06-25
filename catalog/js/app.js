(function () {
  'use strict';

  const CATEGORY_LABELS = {
    all: 'Все',
    classic: 'Классика',
    romantic: 'Романтика',
    modern: 'Современный',
    nature: 'Природа',
    elegant: 'Элегантный',
    playful: 'Игривый'
  };

  const TEMPLATE_PRICE = 3999;

  let demos = [];
  let activeFilter = 'all';
  let searchQuery = '';

  const grid = document.getElementById('catalog-grid');
  const searchInput = document.getElementById('search-input');
  const filterContainer = document.getElementById('filters');
  const modal = document.getElementById('preview-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalIframe = document.getElementById('modal-iframe');
  const modalLoader = document.getElementById('modal-loader');
  const modalOpenBtn = document.getElementById('modal-open-full');
  const demoCountEl = document.getElementById('demo-count');
  const visibleCountEl = document.getElementById('visible-count');

  function formatPrice(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽';
  }

  async function init() {
    try {
      const res = await fetch('catalog/data/demos.json');
      demos = await res.json();
    } catch {
      demos = [];
    }

    if (demoCountEl) demoCountEl.textContent = demos.length;
    renderFilters();
    renderCards();
    bindEvents();
    handleDeepLink();
    duplicateMarquee();
  }

  function duplicateMarquee() {
    var track = document.querySelector('.marquee__track');
    if (!track) return;
    track.innerHTML += track.innerHTML;
  }

  function getFilteredDemos() {
    return demos.filter(function (demo) {
      var matchCategory = activeFilter === 'all' || demo.category === activeFilter;
      var q = searchQuery.toLowerCase().trim();
      var matchSearch =
        !q ||
        demo.name.toLowerCase().includes(q) ||
        (demo.feature || '').toLowerCase().includes(q) ||
        demo.description.toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }

  function renderFilters() {
    var categories = ['all'].concat(Array.from(new Set(demos.map(function (d) { return d.category; }))));
    filterContainer.innerHTML = categories
      .map(function (cat) {
        var active = cat === activeFilter ? ' filter-btn--active' : '';
        return (
          '<button type="button" class="filter-btn' + active + '" data-filter="' + cat + '">' +
          (CATEGORY_LABELS[cat] || cat) +
          '</button>'
        );
      })
      .join('');
  }

  function renderCards() {
    var filtered = getFilteredDemos();
    if (visibleCountEl) visibleCountEl.textContent = filtered.length;

    if (filtered.length === 0) {
      grid.innerHTML = '<div class="catalog__empty"><p>Ничего не найдено. Попробуйте другой запрос.</p></div>';
      return;
    }

    grid.innerHTML = filtered
      .map(function (demo, i) {
        var demoPath = demo.path.split('/').map(encodeURIComponent).join('/');
        var previewPath = (demo.preview || demo.path).split('/').map(encodeURIComponent).join('/');
        return (
          '<article class="card" data-id="' + demo.id + '" style="transition-delay:' + (i % 6) * 60 + 'ms">' +
          '<div class="card__cover">' +
          '<div class="card__cover-poster">' +
          '<img src="' + previewPath + '" alt="" loading="lazy" aria-hidden="true">' +
          '</div>' +
          '<div class="card__cover-live">' +
          '<iframe data-src="' + demoPath + '" title="Превью «' + demo.name + '»" sandbox="allow-scripts allow-same-origin" loading="lazy"></iframe>' +
          '</div></div>' +
          '<div class="card__body">' +
          '<div class="card__prices">' +
          '<span class="card__price">' + formatPrice(TEMPLATE_PRICE) + '</span>' +
          '</div>' +
          '<p class="card__feature">' + (demo.feature || '') + '</p>' +
          '<h3 class="card__title">' + demo.name + '</h3>' +
          '<div class="card__actions">' +
          '<button type="button" class="card__btn card__btn--demo" data-demo-id="' + demo.id + '">демо-версия</button>' +
          '<a href="#contact" class="card__btn card__btn--order">заказать</a>' +
          '</div></div></article>'
        );
      })
      .join('');

    observeCards();
    initPreviewIframes();
  }

  function initPreviewIframes() {
    var iframes = grid.querySelectorAll('.card__cover-live iframe[data-src]');
    if (!('IntersectionObserver' in window)) {
      iframes.forEach(loadPreviewIframe);
      return;
    }
    var loader = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          loadPreviewIframe(entry.target);
          loader.unobserve(entry.target);
        });
      },
      { rootMargin: '80px 0px', threshold: 0.01 }
    );
    iframes.forEach(function (iframe) { loader.observe(iframe); });
  }

  function loadPreviewIframe(iframe) {
    if (!iframe.dataset.src || iframe.dataset.loaded === 'true') return;
    iframe.addEventListener('load', function onLoad() {
      var cover = iframe.closest('.card__cover');
      if (cover) cover.classList.add('card__cover--ready');
      iframe.removeEventListener('load', onLoad);
    });
    iframe.src = iframe.dataset.src;
    iframe.dataset.loaded = 'true';
  }

  function observeCards() {
    var cards = grid.querySelectorAll('.card');
    if (!('IntersectionObserver' in window)) {
      cards.forEach(function (c) { c.classList.add('card--visible'); });
      return;
    }
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('card--visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
    );
    cards.forEach(function (card) { observer.observe(card); });
  }

  function openModal(demo) {
    modalTitle.textContent = demo.name;
    modalLoader.style.display = 'flex';
    modalIframe.style.opacity = '0';
    modalIframe.src = demo.path.split('/').map(encodeURIComponent).join('/');
    modalOpenBtn.href = demo.path.split('/').map(encodeURIComponent).join('/');
    modal.classList.add('modal--open');
    document.body.style.overflow = 'hidden';
    history.replaceState(null, '', '?demo=' + demo.slug);
  }

  function closeModal() {
    modal.classList.remove('modal--open');
    document.body.style.overflow = '';
    modalIframe.src = 'about:blank';
    history.replaceState(null, '', window.location.pathname + window.location.hash);
  }

  function handleDeepLink() {
    var params = new URLSearchParams(window.location.search);
    var slug = params.get('demo');
    if (!slug) return;
    var demo = demos.find(function (d) { return d.slug === slug; });
    if (demo) {
      setTimeout(function () { openModal(demo); }, 300);
    }
  }

  function bindEvents() {
    if (searchInput) {
      searchInput.addEventListener('input', function (e) {
        searchQuery = e.target.value;
        renderCards();
      });
    }

    filterContainer.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-filter]');
      if (!btn) return;
      activeFilter = btn.dataset.filter;
      filterContainer.querySelectorAll('.filter-btn').forEach(function (b) {
        b.classList.toggle('filter-btn--active', b.dataset.filter === activeFilter);
      });
      renderCards();
    });

    grid.addEventListener('click', function (e) {
      var demoBtn = e.target.closest('[data-demo-id]');
      if (!demoBtn) return;
      e.preventDefault();
      var demo = demos.find(function (d) { return d.id === Number(demoBtn.dataset.demoId); });
      if (demo) openModal(demo);
    });

    modal.querySelector('.modal__backdrop').addEventListener('click', closeModal);
    document.getElementById('modal-close').addEventListener('click', closeModal);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('modal--open')) closeModal();
    });

    modalIframe.addEventListener('load', function () {
      modalLoader.style.display = 'none';
      modalIframe.style.opacity = '1';
    });

    var header = document.querySelector('.header');
    window.addEventListener('scroll', function () {
      header.classList.toggle('header--scrolled', window.scrollY > 20);
    }, { passive: true });

    var burger = document.getElementById('burger');
    var nav = document.getElementById('main-nav');
    if (burger && nav) {
      burger.addEventListener('click', function () {
        var open = nav.classList.toggle('nav--open');
        burger.classList.toggle('burger--open', open);
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      nav.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
          nav.classList.remove('nav--open');
          burger.classList.remove('burger--open');
          burger.setAttribute('aria-expanded', 'false');
        });
      });
    }

    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        var id = anchor.getAttribute('href');
        if (!id || id === '#') return;
        var target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  init();
})();
