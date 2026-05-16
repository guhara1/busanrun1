// 부산달리기 - 공통 스크립트
(function () {
  'use strict';

  // 모바일 메뉴 토글
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // 모바일에서 서브메뉴 펼치기/접기
  var hasSubItems = document.querySelectorAll('.main-nav > ul > li.has-sub');
  hasSubItems.forEach(function (li) {
    var link = li.querySelector(':scope > a');
    if (!link) return;
    link.addEventListener('click', function (e) {
      if (window.matchMedia('(max-width: 880px)').matches) {
        e.preventDefault();
        // 다른 메뉴 닫기
        hasSubItems.forEach(function (other) {
          if (other !== li) other.classList.remove('expanded');
        });
        li.classList.toggle('expanded');
      }
    });
  });

  // 현재 페이지 메뉴 활성화
  var path = window.location.pathname.replace(/\/index\.html$/, '/');
  document.querySelectorAll('.main-nav a[href]').forEach(function (a) {
    var href = a.getAttribute('href');
    if (!href || href === '#') return;
    var clean = href.replace(/\/index\.html$/, '/');
    if (clean !== '/' && (path === clean || path.indexOf(clean.replace(/\/$/, '')) === 0)) {
      a.classList.add('active');
      var parentLi = a.closest('.main-nav > ul > li');
      if (parentLi) {
        var topLink = parentLi.querySelector(':scope > a');
        if (topLink) topLink.classList.add('active');
      }
    }
  });

  // 연도 자동 표기
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
