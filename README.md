# 광해군의 물음 — 대동법 시뮬레이션

광해군이 "왜 대동법을 시행해야 하는가?"를 묻고, 학생의 답을 AI가 채점해 4가지 반응 영상 중 하나를 보여주는 수업용 웹앱입니다.

## 폴더 구조
```
index.html / style.css / app.js
config.js          ← GAS_URL, 영상 파일 이름 설정
videos/            ← 영상 6개
apps-script/Code.gs ← AI 채점 서버(구글 Apps Script에 붙여넣기)
```

## 영상 파일 이름
| 파일 | 내용 |
|---|---|
| opening.mp4 | 광해군이 질문하는 오프닝 |
| idle.mp4 | 답 입력 중 반복되는 대기 영상 |
| perfect.mp4 | 완벽한 답 — 웃으며 칭찬 |
| good.mp4 | 괜찮은 답 — 살짝 칭찬 |
| poor.mp4 | 아쉬운 답 — 불쾌해함 |
| terrible.mp4 | 완전 별로인 답 — 호통 |

`GAS_URL`이 비어 있으면 키워드 채점(테스트 모드)으로 동작합니다.

역사교사 최경환
