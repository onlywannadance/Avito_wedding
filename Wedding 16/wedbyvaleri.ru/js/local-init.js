(function () {
  function boot() {
    document.querySelectorAll('.t-records').forEach(function (el) {
      el.classList.add('t-records_visible');
      el.style.opacity = '1';
    });
    document.querySelectorAll('.t674__cover-carrier').forEach(function (el) {
      el.classList.add('loaded');
    });
    window.dispatchEvent(new Event('resize'));
  }

  function showHiddenFallback() {
    if (typeof window.t396_init === 'function' && typeof window.t_animationSBS__init !== 'undefined') return;
    document.querySelectorAll('.t396__artboard').forEach(function (board) {
      var hiddenImgs = board.querySelectorAll('.t396__elem--anim-hidden[data-elem-type="image"]');
      if (hiddenImgs.length) {
        var anyVisible = false;
        hiddenImgs.forEach(function (el) {
          if (parseFloat(window.getComputedStyle(el).opacity) > 0.01) anyVisible = true;
        });
        if (!anyVisible) hiddenImgs[0].style.setProperty('opacity', '1', 'important');
      }
      board.querySelectorAll('.t396__elem--anim-hidden').forEach(function (el) {
        if (el.getAttribute('data-elem-type') === 'image') return;
        if (parseFloat(window.getComputedStyle(el).opacity) < 0.01) {
          el.style.setProperty('opacity', '1', 'important');
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.addEventListener('load', function () {
    setTimeout(showHiddenFallback, 3000);
  });
})();