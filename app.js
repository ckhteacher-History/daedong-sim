/* =========================================================
   광해군의 물음 — 대동법 시뮬레이션
   흐름: 시작 클릭 → 오프닝 영상 → (대기 영상 반복 + 답 입력) → AI 채점 → 결과 영상
   ========================================================= */
(() => {
  const CFG = window.APP_CONFIG;
  const $ = (id) => document.getElementById(id);

  const vids = [$("vidA"), $("vidB")];
  let cur = 0; // 현재 보이는 video 인덱스
  let playToken = 0; // 영상 전환이 겹칠 때 이전 요청 무시용

  const LABELS = {
    perfect: "성은이 망극하옵니다 — 완벽한 답",
    good: "가상하도다 — 괜찮은 답",
    poor: "전하께서 언짢으시다 — 아쉬운 답",
    terrible: "여봐라! — 완전 별로인 답",
  };

  let studentName = "";

  /* ---------- 영상 전환 ---------- */
  // 다음 video 요소에 src를 넣고 재생 준비가 되면 화면을 교체한다.
  // loop=false면 영상이 끝날 때 resolve 되는 Promise를 돌려준다.
  function playVideo(src, { loop = false } = {}) {
    const token = ++playToken;
    const next = vids[1 - cur];
    const prev = vids[cur];

    return new Promise((resolve) => {
      next.loop = loop;
      next.muted = false;
      next.onended = null;
      next.src = src;
      next.currentTime = 0;

      const start = () => {
        if (token !== playToken) return;
        next.play().catch(() => {
          // 소리 때문에 막히면 음소거로라도 재생
          next.muted = true;
          next.play().catch(() => {});
        });
        next.classList.add("active");
        prev.classList.remove("active");
        setTimeout(() => { if (token === playToken) prev.pause(); }, 400);
        cur = 1 - cur;
        if (loop) resolve();
      };

      next.oncanplay = () => { next.oncanplay = null; start(); };
      next.onerror = () => {
        console.warn("영상을 불러오지 못했습니다:", src);
        if (token === playToken) resolve();
      };
      if (!loop) {
        next.onended = () => { if (token === playToken) resolve(); };
      }
      next.load();
    });
  }

  // 다른 영상 파일을 미리 받아두기 (전환 시 끊김 줄이기)
  function preloadAll() {
    Object.values(CFG.VIDEOS).forEach((src) => {
      const link = document.createElement("link");
      link.rel = "preload"; link.as = "video"; link.href = src;
      document.head.appendChild(link);
    });
  }

  /* ---------- 화면 패널 ---------- */
  const show = (el) => el.classList.add("show");
  const hide = (el) => el.classList.remove("show");

  async function playOpeningThenAsk() {
    hide($("answerPanel"));
    hide($("resultPanel"));
    await playVideo(CFG.VIDEOS.opening);
    goIdle();
  }

  function goIdle() {
    playVideo(CFG.VIDEOS.idle, { loop: true });
    hide($("resultPanel"));
    show($("answerPanel"));
    setTimeout(() => $("answerInput").focus(), 300);
  }

  /* ---------- 채점 ---------- */
  async function grade(answer) {
    if (CFG.GAS_URL) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 25000);
        const res = await fetch(CFG.GAS_URL, {
          method: "POST",
          // text/plain 으로 보내야 Apps Script에서 CORS 사전요청 없이 받을 수 있음
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ answer, name: studentName }),
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        const data = await res.json();
        if (data && LABELS[data.grade]) return data;
        throw new Error("응답 형식 오류");
      } catch (e) {
        console.warn("AI 채점 실패 → 키워드 채점으로 대체:", e);
      }
    }
    return localGrade(answer);
  }

  // Apps Script가 없거나 실패했을 때 쓰는 간이 키워드 채점
  function localGrade(text) {
    const t = text.replace(/\s+/g, "");
    const has = (arr) => arr.some((k) => t.includes(k));

    const problem = has(["공납", "특산물", "토산물", "공물"]);
    const bangnap = has(["방납", "대신납부", "대신내", "중간에서", "몇배", "비싸게"]);
    const land = has(["토지", "땅", "결수", "1결", "농토", "토지기준", "토지의크기", "땅의크기"]);
    const rice = has(["쌀", "미곡", "베", "포", "동전", "12두"]);
    const relief = has(["백성", "농민", "부담", "고통", "줄", "덜", "가벼"]);

    const score = [problem, bangnap, land, rice, relief].filter(Boolean).length;

    if (t.length < 4 || /^[ㄱ-ㅎㅏ-ㅣ]+$/.test(t)) {
      return { grade: "terrible", comment: "네 이놈! 감히 과인 앞에서 장난을 치느냐!", tip: "대동법이 무엇을 바꾸려 했는지 생각해 보세요." };
    }
    if ((problem || bangnap) && land && (rice || relief) && score >= 4) {
      return { grade: "perfect", comment: "옳도다! 공납의 폐단과 그 해법을 꾰뚫고 있구나.", tip: "" };
    }
    if (score >= 2) {
      return { grade: "good", comment: "제법이구나. 하나 조금 더 정확히 아뢰어 보거라.", tip: "공납이 어떤 문제가 있었는지, 대동법은 무엇을 기준으로 걷었는지 함께 말해 보세요." };
    }
    if (score === 1) {
      return { grade: "poor", comment: "흠… 그것만으로는 과인을 설득할 수 없다.", tip: "‘공납(특산물)’과 ‘방납’, 그리고 ‘토지’라는 말을 떠올려 보세요." };
    }
    return { grade: "terrible", comment: "무엄하도다! 저자를 당장 끌어내라!", tip: "대동법은 백성이 내던 어떤 세금을 고친 법일까요?" };
  }

  /* ---------- 이벤트 ---------- */
  $("startBtn").addEventListener("click", () => {
    studentName = $("nameInput").value.trim();
    hide($("startScreen"));
    // 사용자 클릭 직후 소리 재생 권한 확보
    vids.forEach((v) => { v.muted = false; });
    preloadAll();
    playOpeningThenAsk();
  });

  $("nameInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("startBtn").click();
  });

  $("answerInput").addEventListener("input", (e) => {
    $("charCount").textContent = `${e.target.value.length} / 600`;
  });

  $("answerInput").addEventListener("keydown", (e) => {
    // Ctrl/Cmd + Enter 로 제출
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) $("submitBtn").click();
  });

  $("replayBtn").addEventListener("click", playOpeningThenAsk);

  $("submitBtn").addEventListener("click", async () => {
    const answer = $("answerInput").value.trim();
    if (!answer) { $("answerInput").focus(); return; }

    $("submitBtn").disabled = true;
    hide($("answerPanel"));
    show($("loading")); // 대기 영상은 계속 반복 재생 중

    const result = await grade(answer);

    hide($("loading"));
    $("submitBtn").disabled = false;

    await playVideo(CFG.VIDEOS[result.grade]);

    // 결과 영상이 끝나면 마지막 장면 위에 결과 표시
    const badge = $("resultBadge");
    badge.className = "badge " + result.grade;
    badge.textContent = LABELS[result.grade];
    $("resultComment").textContent = `"${result.comment || ""}"`;
    $("resultTip").textContent = result.tip ? "💡 " + result.tip : "";
    $("retryBtn").textContent = result.grade === "perfect" ? "처음부터 다시" : "다시 아뢰기";
    $("retryBtn").dataset.grade = result.grade;
    show($("resultPanel"));
  });

  $("retryBtn").addEventListener("click", (e) => {
    if (e.target.dataset.grade === "perfect") {
      $("answerInput").value = "";
      $("charCount").textContent = "0 / 600";
      playOpeningThenAsk();
    } else {
      goIdle(); // 앞서 쓴 답은 남겨 두어 고쳐 쓰게 함
    }
  });
})();
