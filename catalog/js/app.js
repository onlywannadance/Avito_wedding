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

  function encodePath(p) {
    return p.split('/').map(encodeURIComponent).join('/');
  }

  function getIframeMaxScroll(win) {
    var doc = win.document;
    var viewH = win.innerHeight || 844;
    return Math.max(
      0,
      Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight) - viewH
    );
  }

  function unlockIframePreview(win) {
    if (!win) return;
    try {
      if (typeof win.unlockPageScroll === 'function') {
        win.unlockPageScroll();
        return;
      }
      var unlockBtn = win.document.querySelector('.js-unlock-scroll');
      if (unlockBtn) unlockBtn.click();
    } catch (e) { /* same-origin guard */ }
  }

  function computePreviewScrollTop(win, step) {
    var viewH = win.innerHeight || 844;
    var maxScroll = getIframeMaxScroll(win);

    if (step === 0) return 0;

    var doc = win.document;
    var blocks = doc.querySelectorAll(
      '#allrecords > .r.t-rec, #allrecords > .t-rec, section.cli-block, [data-type="block-wrapper"]'
    );
    var tops = [];

    blocks.forEach(function (block) {
      if (block.offsetHeight < 120) return;
      var top = block.offsetTop;
      if (!tops.length || top > tops[tops.length - 1] + 60) tops.push(top);
    });

    var viewBased = step === 1
      ? Math.min(Math.round(viewH * 0.98), maxScroll)
      : Math.min(Math.round(viewH * 1.92), maxScroll);

    if (step === 1 && tops.length >= 2 && tops[1] > 80) {
      return Math.min(tops[1], maxScroll);
    }
    if (step === 2 && tops.length >= 3 && tops[2] > (tops[1] || 0) + 80) {
      return Math.min(tops[2], maxScroll);
    }
    if (step === 2 && maxScroll < viewH * 1.2) {
      return Math.min(Math.round(maxScroll * 0.55), maxScroll);
    }

    return viewBased;
  }

  function prepareModalIframe(iframe) {
    if (!iframe || !iframe.contentWindow) return;
    var win = iframe.contentWindow;
    try {
      var doc = win.document;
      var meta = doc.querySelector('meta[name="viewport"]');
      if (meta) {
        meta.setAttribute('content', 'width=390, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
      }
    } catch (e) { /* same-origin guard */ }
    unlockIframePreview(win);
    try {
      win.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      win.dispatchEvent(new Event('resize'));
    } catch (e) { /* same-origin guard */ }
  }

  function stabilizeModalIframe(iframe) {
    prepareModalIframe(iframe);
    setTimeout(function () { prepareModalIframe(iframe); }, 350);
    setTimeout(function () { prepareModalIframe(iframe); }, 1200);
  }

  function phoneScrollHtml(posterSrc, demoPath, alt) {
    var dots = [0, 1, 2]
      .map(function (i) {
        return '<button type="button" class="phone-scroll__dot' + (i === 0 ? ' phone-scroll__dot--active' : '') + '" data-index="' + i + '" aria-label="Блок ' + (i + 1) + '"></button>';
      })
      .join('');
    return (
      '<div class="phone-scroll" data-phone-scroll tabindex="0" aria-label="Листайте блоки шаблона">' +
      '<div class="phone-scroll__poster">' +
      '<img src="' + encodePath(posterSrc) + '" alt="" loading="lazy" draggable="false" aria-hidden="true">' +
      '</div>' +
      '<div class="phone-scroll__live">' +
      '<iframe data-src="' + encodePath(demoPath) + '" title="' + alt + '" sandbox="allow-scripts allow-same-origin" loading="lazy"></iframe>' +
      '</div>' +
      '<div class="phone-scroll__dots">' + dots + '</div>' +
      '</div>'
    );
  }

  function iphone17Frame(size, posterSrc, demoPath, alt) {
    return (
      '<div class="iphone17 iphone17--' + size + '">' +
      '<div class="iphone17__shell">' +
      '<span class="iphone17__button iphone17__button--action" aria-hidden="true"></span>' +
      '<span class="iphone17__button iphone17__button--vol-up" aria-hidden="true"></span>' +
      '<span class="iphone17__button iphone17__button--vol-down" aria-hidden="true"></span>' +
      '<span class="iphone17__button iphone17__button--power" aria-hidden="true"></span>' +
      '<div class="iphone17__display">' +
      '<div class="iphone17__island" aria-hidden="true"><span class="iphone17__island-cam"></span></div>' +
      '<div class="iphone17__viewport">' +
      phoneScrollHtml(posterSrc, demoPath, alt || 'Превью шаблона') +
      '</div></div>' +
      '<div class="iphone17__shine" aria-hidden="true"></div>' +
      '</div></div>'
    );
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
        return (
          '<article class="card" data-id="' + demo.id + '" style="transition-delay:' + (i % 6) * 60 + 'ms">' +
          '<div class="card__cover">' +
          iphone17Frame('card', demo.preview, demo.path, 'Превью «' + demo.name + '»') +
          '</div>' +
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
    initPhoneScrolls();
  }

  function initPhoneScrolls() {
    grid.querySelectorAll('[data-phone-scroll]').forEach(initPhoneScroll);
  }

  function initPhoneScroll(root) {
    if (root.dataset.scrollReady === 'true') return;
    root.dataset.scrollReady = 'true';

    var iframe = root.querySelector('iframe[data-src]');
    var dots = root.querySelectorAll('.phone-scroll__dot');
    var count = dots.length;
    var index = 0;
    var startY = 0;
    var deltaY = 0;
    var dragging = false;
    var scrollPositions = [0, 0, 0];
    var iframeReady = false;
    var unlocked = false;

    function refreshScrollPositions() {
      if (!iframe.contentWindow) return;
      try {
        var win = iframe.contentWindow;
        scrollPositions[0] = 0;
        if (unlocked) {
          scrollPositions[1] = computePreviewScrollTop(win, 1);
          scrollPositions[2] = computePreviewScrollTop(win, 2);
        } else {
          var viewH = win.innerHeight || 844;
          scrollPositions[1] = viewH;
          scrollPositions[2] = viewH * 2;
        }
      } catch (e) {
        scrollPositions = [0, 520, 980];
      }
    }

    function applyScroll(i, smooth) {
      index = Math.max(0, Math.min(count - 1, i));
      dots.forEach(function (dot, j) {
        dot.classList.toggle('phone-scroll__dot--active', j === index);
      });

      if (!iframeReady) return;

      if (index === 0 && unlocked) {
        unlocked = false;
        iframeReady = false;
        root.classList.remove('phone-scroll--ready');
        var src = iframe.dataset.src || iframe.src;
        iframe.addEventListener('load', function onReset() {
          iframeReady = true;
          scheduleRefresh();
          iframe.removeEventListener('load', onReset);
        });
        iframe.src = src;
        return;
      }

      root.classList.add('phone-scroll--ready');

      function doScroll() {
        try {
          refreshScrollPositions();
          iframe.contentWindow.scrollTo({
            top: scrollPositions[index],
            behavior: smooth ? 'smooth' : 'auto'
          });
        } catch (e) { /* cross-origin guard */ }
      }

      try {
        if (index === 0) {
          iframe.contentWindow.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
          return;
        }
        if (!unlocked) {
          unlockIframePreview(iframe.contentWindow);
          unlocked = true;
          setTimeout(doScroll, 220);
        } else {
          doScroll();
        }
      } catch (e) { /* cross-origin guard */ }
    }

    function scheduleRefresh() {
      refreshScrollPositions();
      applyScroll(index, false);
      setTimeout(function () {
        refreshScrollPositions();
        applyScroll(index, false);
      }, 500);
      setTimeout(function () {
        refreshScrollPositions();
        applyScroll(index, false);
      }, 1500);
    }

    function loadIframe() {
      if (!iframe || !iframe.dataset.src || iframe.dataset.loaded === 'true') return;
      iframe.dataset.loaded = 'true';
      iframe.addEventListener('load', function onLoad() {
        iframeReady = true;
        unlocked = false;
        scheduleRefresh();
        iframe.removeEventListener('load', onLoad);
      });
      iframe.src = iframe.dataset.src;
    }

    if ('IntersectionObserver' in window) {
      var loader = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            loadIframe();
            loader.unobserve(entry.target);
          });
        },
        { rootMargin: '100px 0px', threshold: 0.01 }
      );
      loader.observe(root);
    } else {
      loadIframe();
    }

    function stopBubble(e) {
      e.stopPropagation();
    }

    dots.forEach(function (dot) {
      dot.addEventListener('click', function (e) {
        stopBubble(e);
        applyScroll(Number(dot.dataset.index), true);
      });
    });

    root.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaY) < 8) return;
      e.preventDefault();
      stopBubble(e);
      applyScroll(index + (e.deltaY > 0 ? 1 : -1), true);
    }, { passive: false });

    root.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      dragging = true;
      startY = e.clientY;
      deltaY = 0;
      root.classList.add('phone-scroll--dragging');
      e.preventDefault();
    });

    function onMove(clientY) {
      if (!dragging) return;
      deltaY = clientY - startY;
    }

    window.addEventListener('mousemove', function (e) { onMove(e.clientY); });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      root.classList.remove('phone-scroll--dragging');
      if (deltaY < -32) applyScroll(index + 1, true);
      else if (deltaY > 32) applyScroll(index - 1, true);
      else applyScroll(index, true);
      deltaY = 0;
    }

    window.addEventListener('mouseup', endDrag);

    root.addEventListener('touchstart', function (e) {
      dragging = true;
      startY = e.touches[0].clientY;
      deltaY = 0;
      root.classList.add('phone-scroll--dragging');
    }, { passive: true });

    root.addEventListener('touchmove', function (e) {
      if (!dragging) return;
      onMove(e.touches[0].clientY);
    }, { passive: true });

    root.addEventListener('touchend', endDrag, { passive: true });
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
    modalIframe.src = encodePath(demo.path);
    modalOpenBtn.href = encodePath(demo.path);
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
      stabilizeModalIframe(modalIframe);
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
