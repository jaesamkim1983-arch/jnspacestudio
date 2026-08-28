// ==========================================================================
// 제이앤스튜디오(JN STUDIO) 공통 스크립트
// ==========================================================================

document.addEventListener('DOMContentLoaded', function () {
  initMobileNav();
  markActiveNavLink();
  injectFloatingCta();
  initContactForm();
  initChatWidget();
});

/* ---------- 모바일 메뉴 토글 ---------- */
function initMobileNav() {
  var toggle = document.querySelector('.nav-toggle');
  var mobileNav = document.querySelector('.nav-mobile');
  if (!toggle || !mobileNav) return;

  toggle.addEventListener('click', function () {
    mobileNav.classList.toggle('is-open');
  });

  mobileNav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      mobileNav.classList.remove('is-open');
    });
  });
}

/* ---------- 현재 페이지 메뉴 강조 ---------- */
function markActiveNavLink() {
  var current = (location.pathname.split('/').pop() || 'index.html');
  document.querySelectorAll('.nav-desktop a, .nav-mobile a, .nav-icons a, .nav-mobile-icons a').forEach(function (link) {
    var href = link.getAttribute('href');
    if (href === current) link.classList.add('active');
  });
}

/* ---------- 어디서든 보이는 예약하기 플로팅 버튼 ---------- */
function injectFloatingCta() {
  if (document.body.classList.contains('no-floating-cta')) return;
  var current = (location.pathname.split('/').pop() || 'index.html');
  if (current === 'reserve.html') return;

  var a = document.createElement('a');
  a.href = 'reserve.html';
  a.className = 'btn btn-primary floating-cta';
  a.textContent = '예약하기';
  document.body.appendChild(a);
}

/* ---------- 예약 폼 전송 (/api/reservation -> Supabase + Kakao + Gmail) ---------- */
function initContactForm() {
  var form = document.getElementById('reserve-form');
  if (!form) return;

  var status = document.getElementById('form-status');

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var submitBtn = form.querySelector('button[type="submit"]');
    var originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '전송 중...';

    var formData = new FormData(form);
    var payload = {};
    formData.forEach(function (value, key) {
      if (payload[key]) {
        if (Array.isArray(payload[key])) {
          payload[key].push(value);
        } else {
          payload[key] = [payload[key], value];
        }
      } else {
        payload[key] = value;
      }
    });
    if (Array.isArray(payload.purpose)) payload.purpose = payload.purpose.join(', ');
    if (Array.isArray(payload.rental_items)) payload.rental_items = payload.rental_items.join(', ');

    fetch('/api/reservation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (result.ok && result.data.success) {
          status.textContent = '예약 신청이 접수되었습니다. 카카오톡 문의를 남겨주시면 빠르게 확인해드립니다.';
          status.className = 'form-status is-visible success';
          form.reset();
        } else {
          status.textContent = result.data.error || '전송 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
          status.className = 'form-status is-visible error';
        }
      })
      .catch(function () {
        status.textContent = '전송 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
        status.className = 'form-status is-visible error';
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      });
  });
}

/* ---------- 카카오톡 상담 연결 버튼 ---------- */
function initChatWidget() {
  var link = document.createElement('a');
  link.href = 'http://pf.kakao.com/_rtxmxhG/chat';
  link.target = '_blank';
  link.rel = 'noopener';
  link.className = 'chatbot-toggle';
  link.setAttribute('aria-label', '카카오톡 상담하기');
  link.innerHTML =
    '<span class="kakao-icon-circle">' +
      '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="10.5" rx="9" ry="7.2"/><path d="M8.5 16.2L6.3 20.5l5.4-3.4-3.2-0.9z"/></svg>' +
    '</span>' +
    '<span class="kakao-text">톡상담</span>';

  document.body.appendChild(link);
}
