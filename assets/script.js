// ==========================================================================
// 제이앤스튜디오(JN STUDIO) 공통 스크립트
// ==========================================================================

document.addEventListener('DOMContentLoaded', function () {
  initMobileNav();
  markActiveNavLink();
  injectFloatingCta();
  initContactForm();
  initChatWidget();
  initScheduleCalendar();
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

/* ---------- 스케쥴 페이지: 월별 예약 현황 캘린더 ---------- */
function initScheduleCalendar() {
  var grid = document.getElementById('cal-grid');
  if (!grid) return;

  var titleEl = document.getElementById('cal-title');
  var statusEl = document.getElementById('cal-status');
  var prevBtn = document.getElementById('cal-prev');
  var nextBtn = document.getElementById('cal-next');

  var today = new Date();
  var view = { year: today.getFullYear(), month: today.getMonth() + 1 }; // month: 1-12

  function pad(n) { return String(n).padStart(2, '0'); }

  function render() {
    titleEl.textContent = view.year + '년 ' + view.month + '월';
    statusEl.textContent = '불러오는 중...';
    statusEl.className = 'cal-status';

    // clear previously injected day cells (keep the 7 weekday headers)
    grid.querySelectorAll('.cal-day').forEach(function (el) { el.remove(); });

    var firstOfMonth = new Date(view.year, view.month - 1, 1);
    var daysInMonth = new Date(view.year, view.month, 0).getDate();
    var startWeekday = firstOfMonth.getDay(); // 0=일
    var totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

    var cells = {};
    for (var i = 0; i < totalCells; i++) {
      var dayNum = i - startWeekday + 1;
      var cell = document.createElement('div');
      cell.className = 'cal-day';
      if (dayNum < 1 || dayNum > daysInMonth) {
        cell.classList.add('is-other-month');
      } else {
        var dateStr = view.year + '-' + pad(view.month) + '-' + pad(dayNum);
        var numEl = document.createElement('div');
        numEl.className = 'cal-day-num';
        numEl.textContent = dayNum;
        cell.appendChild(numEl);
        var isToday = dateStr === (today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate()));
        if (isToday) cell.classList.add('is-today');
        cells[dateStr] = cell;
      }
      grid.appendChild(cell);
    }

    fetch('/api/schedule?year=' + view.year + '&month=' + view.month)
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok) {
          statusEl.textContent = result.data.error || '예약 현황을 불러오지 못했습니다.';
          statusEl.className = 'cal-status is-error';
          return;
        }
        statusEl.textContent = '';
        (result.data.bookings || []).forEach(function (b) {
          var cell = cells[b.date];
          if (!cell) return;
          var pill = document.createElement('div');
          pill.className = 'cal-booking';
          pill.textContent = b.end ? (b.start + '~' + b.end + ' 예약됨') : (b.start + ' 예약됨');
          cell.appendChild(pill);
        });
      })
      .catch(function () {
        statusEl.textContent = '예약 현황을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
        statusEl.className = 'cal-status is-error';
      });
  }

  prevBtn.addEventListener('click', function () {
    view.month -= 1;
    if (view.month < 1) { view.month = 12; view.year -= 1; }
    render();
  });
  nextBtn.addEventListener('click', function () {
    view.month += 1;
    if (view.month > 12) { view.month = 1; view.year += 1; }
    render();
  });

  render();
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
