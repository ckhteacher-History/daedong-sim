// ===== 설정 파일: 선생님이 고칠 곳은 여기뿐입니다 =====
window.APP_CONFIG = {
  // Apps Script 웹 앱 배포 URL (…/exec 로 끝나는 주소)
  // 비워두면 '키워드 채점(오프라인 테스트 모드)'으로 동작합니다.
  GAS_URL: "",

  // 영상 파일 경로 (videos 폴더에 이 이름으로 올리세요)
  VIDEOS: {
    opening:  "videos/opening.mp4",   // 광해군이 질문하는 영상
    idle:     "videos/idle.mp4",      // 답 입력 중 반복 재생되는 대기 영상
    perfect:  "videos/perfect.mp4",   // 완벽한 답 — 웃으며 칭찬
    good:     "videos/good.mp4",      // 괜찮은 답 — 적당히 호응
    poor:     "videos/poor.mp4",      // 아쉬운 답 — 불쾌해함
    terrible: "videos/terrible.mp4",  // 완전 별로인 답 — 호통, 잡아가라
  },
};
