(function () {
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

  function fmtDate(iso) {
    const d = new Date(iso + "T00:00:00");
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYS[d.getDay()]})`;
  }
  const baseTitle = (b) => b.replace(/\s*\(\d\)$/, "");
  const meetings = SESSIONS.filter((s) => s.type === "meeting");

  // ----- hero stats -----
  const books = [];
  SESSIONS.filter((s) => s.type !== "canceled").forEach((s) => {
    const t = baseTitle(s.book);
    if (!books.some((b) => b.title === t)) books.push({ title: t, author: s.author, color: s.color, id: s.id, year: s.date.slice(0, 7) });
  });
  const stats = [
    [meetings.length, "기록된 정기 모임"],
    [books.length, "함께 읽은 책"],
    [MEMBERS.length, "함께한 사람"],
    [EVENTS.length, "함께 들은 강연"],
  ];
  $("#stats").innerHTML = stats.map(([n, l]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`).join("");

  const upcoming = SESSIONS.find((s) => s.type === "upcoming");
  if (upcoming) {
    $("#nextUp").innerHTML = `이번 모임 · <b>${fmtDate(upcoming.date)} 오후 3시</b> · 『${esc(upcoming.book)}』 ${esc(upcoming.author)}`;
  }

  // ----- timeline -----
  const years = [...new Set(SESSIONS.map((s) => s.date.slice(0, 4)))];
  let yearSel = "all";
  function renderFilters() {
    const opts = [["all", "전체"], ...years.map((y) => [y, y + "년"])];
    $("#yearFilter").innerHTML = opts
      .map(([v, l]) => `<button data-y="${v}" class="${v === yearSel ? "on" : ""}">${l}</button>`)
      .join("");
  }
  $("#yearFilter").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    yearSel = b.dataset.y;
    renderFilters();
    renderTimeline();
  });

  function chips(names, cls) {
    return `<div class="chips">${names.map((n) => `<span class="chip ${cls}">${esc(n)}</span>`).join("")}</div>`;
  }

  function sessionBody(s) {
    let h = "";
    if (s.type !== "canceled") {
      h += `<p class="meta-line">${fmtDate(s.date)} ${s.time ? "· " + s.time : ""} · ${esc(s.place || "")}</p>`;
      h += `<h4>책 소개</h4>`;
      h += `<p class="meta-line">${esc(s.original || "")}${s.year ? " · " + s.year + "년" : ""}${s.authorInfo ? " · " + esc(s.author) + " (" + esc(s.authorInfo) + ")" : ""}</p>`;
    }
    h += `<p>${esc(s.about)}</p>`;
    if (s.type !== "canceled" && AUTHORS[s.author]) {
      h += `<h4>작가 소개 · ${esc(s.author)}</h4><p class="author-bio">${esc(AUTHORS[s.author])}</p>`;
    }
    if (s.attended) {
      h += `<h4>${esc(s.attendLabel || "참석")} · ${s.attended.length}명</h4>${chips(s.attended, "in")}`;
      if (s.attendNote) h += `<p class="meta-line" style="margin-top:6px">${esc(s.attendNote)}</p>`;
    }
    if (s.absent && s.absent.length) h += `<h4>불참 알림</h4>${chips(s.absent, "out")}`;
    if (s.talk && s.talk.length) {
      h += `<h4>${s.type === "upcoming" ? "모임 전 나눈 이야기" : s.type === "canceled" ? "경과" : "나눈 이야기"}</h4>`;
      h += `<ul class="talk">${s.talk.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`;
    }
    if (s.quotes && s.quotes.length) {
      h += `<h4>남은 말</h4>` + s.quotes.map((q) => `<blockquote>${esc(q.text)}<cite>— ${esc(q.who)}</cite></blockquote>`).join("");
    }
    if (s.keywords) h += `<h4>키워드</h4>${chips(s.keywords.map((k) => "#" + k), "kw")}`;
    if (s.media && s.media.length) {
      h += `<h4>함께 본 자료</h4>`;
      h += s.media
        .map((m) =>
          m.type === "audio"
            ? `<div class="media-item"><div class="media-cap">🎧 ${esc(m.cap)}</div><audio controls preload="none" src="${m.src}"></audio></div>`
            : `<div class="media-item"><a href="${m.src}" target="_blank" rel="noopener">📄 ${esc(m.cap)}</a></div>`
        )
        .join("");
    }
    if (s.photos && s.photos.length) {
      h += `<h4>사진</h4><div class="photos">${s.photos
        .map((p) => `<figure data-src="${p.src}" data-cap="${esc(p.cap)}"><img loading="lazy" src="${p.src}" alt="${esc(p.cap)}"><figcaption>${esc(p.cap)}</figcaption></figure>`)
        .join("")}</div>`;
    }
    if (s.next) h += `<p class="next-book">다음 책 → <strong>${esc(s.next)}</strong></p>`;
    return h;
  }

  function renderTimeline() {
    const list = SESSIONS.filter((s) => yearSel === "all" || s.date.startsWith(yearSel)).slice().reverse();
    $("#timelineList").innerHTML = list
      .map((s) => {
        const d = new Date(s.date + "T00:00:00");
        const badge =
          s.type === "upcoming" ? `<span class="badge up">이번 모임</span>` : s.type === "canceled" ? `<span class="badge cancel">모임 취소</span>` : s.genre ? `<span class="badge">${esc(s.genre)}</span>` : "";
        return `<li class="tl-item" id="s-${s.id}" style="--dot:${s.color}">
          <div class="tl-card${s.type === "upcoming" ? " open" : ""}">
            <button class="tl-head" aria-expanded="${s.type === "upcoming"}">
              <span class="mini-book" style="--c:${s.color}">${esc(baseTitle(s.book))}</span>
              <span>
                <span class="tl-date">${d.getFullYear()}년 ${d.getMonth() + 1}월${badge}</span>
                <span class="tl-title" style="display:block">${s.type === "canceled" ? "(휴회) " : ""}${esc(s.book)}</span>
                <span class="tl-author">${esc(s.author)}${s.attended ? ` · ${s.attendLabel || "참석"} ${s.attended.length}명` : ""}</span>
              </span>
              <span class="tl-toggle" aria-hidden="true">+</span>
            </button>
            <div class="tl-body">${sessionBody(s)}</div>
          </div>
        </li>`;
      })
      .join("");
  }
  $("#timelineList").addEventListener("click", (e) => {
    const head = e.target.closest(".tl-head");
    if (head) {
      const card = head.parentElement;
      card.classList.toggle("open");
      head.setAttribute("aria-expanded", card.classList.contains("open"));
    }
  });

  function openSession(id) {
    if (yearSel !== "all" && !id.startsWith(yearSel)) {
      yearSel = "all";
      renderFilters();
      renderTimeline();
    }
    const el = document.getElementById("s-" + id);
    if (!el) return;
    const card = el.querySelector(".tl-card");
    card.classList.add("open");
    card.querySelector(".tl-head").setAttribute("aria-expanded", "true");
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ----- bookshelf -----
  $("#bookshelf").innerHTML = books
    .map((b) => `<button class="spine" style="--c:${b.color}" data-id="${b.id}" title="${esc(b.title)} · ${esc(b.author)}"><span>${esc(b.title.length > 10 ? b.title.slice(0, 9) + "…" : b.title)}</span><small>${b.year.replace("-", ".")}</small></button>`)
    .join("");
  $("#bookshelf").addEventListener("click", (e) => {
    const sp = e.target.closest(".spine");
    if (sp) openSession(sp.dataset.id);
  });

  $("#readingList").innerHTML = READING_LIST_2026.map(
    (r) =>
      `<li class="${r.done ? "done" : ""}"><span class="mark">${r.done ? "✓" : "○"}</span><span class="t">${esc(r.book)}${r.note ? ` <small class="muted">(${esc(r.note)})</small>` : ""}</span><span class="a">${esc(r.author)}${r.done ? " · " + r.done.replace("-", ".") : ""}</span></li>`
  ).join("");
  $("#earlierList").innerHTML = EARLIER_BOOKS.map((r) => `<li><span>📖</span><span>${esc(r.book)}</span><span class="a">${esc(r.author)}</span></li>`).join("");

  // ----- members -----
  const palette = ["#2f5d50", "#b5653a", "#5b3a3a", "#2f4f6f", "#7b4b2a", "#3d5a4a", "#6b2f3a", "#4a4a3a"];
  $("#memberGrid").innerHTML = MEMBERS.map((m, i) => {
    const went = meetings.map((s) => (s.attended || []).includes(m.name));
    const n = went.filter(Boolean).length;
    const dots = meetings
      .map((s, j) => `<i class="${went[j] ? "on" : ""}" title="${s.date.slice(0, 7)} ${esc(baseTitle(s.book))}"></i>`)
      .join("");
    return `<article class="member${m.until ? " past" : ""}">
      <div class="member-top">
        <div class="avatar" style="--c:${palette[i % palette.length]}">${esc(m.name.length > 2 ? m.name.slice(1) : m.name)}</div>
        <div><h3>${esc(m.name)}</h3><div class="role">${esc(m.role)} · ${esc(m.since)}${m.until ? " – " + esc(m.until) : " –"}</div></div>
      </div>
      <p>${esc(m.note)}</p>
      <div class="count">확인된 참석 ${n}회</div>
      <div class="dots" aria-label="모임별 참석 표시">${dots}</div>
    </article>`;
  }).join("");

  // ----- events -----
  $("#eventList").innerHTML = EVENTS.map(
    (ev) => `<article class="event">
      <img loading="lazy" src="${ev.img}" alt="${esc(ev.title)} 포스터" data-src="${ev.img}" data-cap="${esc(ev.title)}">
      <div>
        <p class="meta-line">${fmtDate(ev.date)} · ${esc(ev.place)}</p>
        <h3>${esc(ev.title)}</h3>
        <p class="meta-line">${esc(ev.who)}</p>
        <p>${esc(ev.text)}</p>
        ${ev.link ? `<p style="margin-top:8px"><a href="${ev.link.href}" target="_blank" rel="noopener">${esc(ev.link.label)} ↗</a></p>` : ""}
      </div>
    </article>`
  ).join("");

  // ----- archive -----
  const ARCHIVE = [
    { k: "독서 계획", t: "2025년 하반기 독서 계획 (2025.7 공지)", img: "img/20250730_150957_2.jpg" },
    { k: "인포그래픽", t: "리스본행 야간열차: 삶을 바꾸는 건 행동인가, 성찰인가?", img: "img/20260128_120039_22.jpg" },
    { k: "인물 관계도", t: "Night Train to Lisbon 등장인물", img: "img/20260128_144732_23.jpg" },
    { k: "인포그래픽", t: "평온한 마무리를 위한 선물: ‘자연사’의 권유", img: "img/20260323_080545_29.jpg" },
    { k: "인포그래픽", t: "프랑켄슈타인 인물 관계도: 창조와 우정의 이야기", img: "img/20260429_115250_31.jpg" },
    { k: "오디오", t: "리스본행 야간열차, 삶을 바꾸는 건 행동인가 성찰인가", audio: "media/lisbon-podcast.m4a" },
    { k: "오디오", t: "The Grace of Natural Death (편안한 죽음을 맞으려면…)", audio: "media/natural-death-podcast.m4a" },
    { k: "슬라이드", t: "자연사의 권유 (PDF, 15쪽)", pdf: "media/natural-death-slides.pdf" },
  ];
  $("#archiveGrid").innerHTML = ARCHIVE.map(
    (a) => `<div class="arch"><div class="k">${a.k}</div><h3>${esc(a.t)}</h3>${
      a.img
        ? `<img loading="lazy" src="${a.img}" alt="${esc(a.t)}" data-src="${a.img}" data-cap="${esc(a.t)}">`
        : a.audio
        ? `<audio controls preload="none" src="${a.audio}"></audio>`
        : `<a href="${a.pdf}" target="_blank" rel="noopener">PDF 열기 ↗</a>`
    }</div>`
  ).join("");

  // ----- lightbox -----
  const lb = $("#lightbox");
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-src]");
    if (t && !t.classList.contains("spine")) {
      lb.querySelector("img").src = t.dataset.src;
      lb.querySelector("p").textContent = t.dataset.cap || "";
      lb.hidden = false;
      return;
    }
    if (!lb.hidden && (e.target === lb || e.target.tagName === "BUTTON")) lb.hidden = true;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") lb.hidden = true;
  });

  renderFilters();
  renderTimeline();
})();
