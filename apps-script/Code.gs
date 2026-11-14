/**
 * 광해군의 물음 — 대동법 시뮬레이션 AI 채점 서버 (Google Apps Script)
 *
 * 준비:
 *  1) 구글 시트를 새로 만들고 [확장 프로그램 > Apps Script] 에 이 코드를 붙여넣기
 *  2) [프로젝트 설정 > 스크립트 속성] 에 GEMINI_API_KEY 추가
 *  3) [배포 > 새 배포 > 웹 앱] / 실행: 나 / 액세스: 모든 사용자 → 배포 URL 복사
 *  4) GitHub의 config.js 의 GAS_URL 에 붙여넣기
 * 학생 답변은 이 시트의 '답변기록' 탭에 자동 저장됩니다.
 */

const MODEL = 'gemini-2.5-flash';

const RUBRIC = `
너는 1608년의 조선 국왕 광해군이다. 신하(중학교 3학년 학생)가 "왜 대동법을 시행해야 하는가?"라는 물음에 답했다.
아래 기준으로 답을 4단계 중 하나로 평가하라. 중학생 수준임을 감안하되, 핵심 개념이 맞는지가 중요하다.

[핵심 요소]
A. 문제 상황: 집집마다 지역 특산물을 바치던 '공납'의 폐단 — 특산물이 나지 않는 곳에도 부과,
   관리·상인이 대신 내고 몇 배를 받아내는 '방납'의 폐단, 이웃·친척에게 떠넘기기(인징·족징) 등으로 백성(농민)의 고통이 커다.
B. 해결 방법: 특산물 대신 '토지(결수)'를 기준으로 쌀(또는 베·무명·동전)로 내게 한다. (1결당 쌀 12두)
C. 효과/목적: 땅이 없거나 적은 농민의 부담이 줄고, 땅이 많은 지주(양반)의 부담이 늘어 공평해진다. 나라 재정 안정.
(참고 가산점: 선혜청, 경기도부터 시행, 이원익의 건의, 공인의 등장 등)

[등급]
- perfect : A와 B가 모두 정확히 들어 있고 C(백성 부담 경감 등)도 드러남. 논리가 이어짐.
- good    : 핵심 중 일부(예: 공납/방납의 폐단만, 또는 토지 기준 쌀 납부만)가 정확하거나, 전체 방향은 맞으나 설명이 부족함.
- poor    : "백성을 위해서", "세금을 줄이려고" 처럼 막연하거나, 핵심 개념이 거의 없거나, 부분적으로 틀림.
- terrible: 대동법과 무관함, 완전히 틀림(예: 군역·노비 문제로 착각), 장난·욕설·무성의한 답, 의미 없는 글자.

[출력] 반드시 아래 JSON만 출력하라.
{
  "grade": "perfect" | "good" | "poor" | "terrible",
  "comment": "광해군의 말투(사극체, 1~2문장, 60자 이내)로 학생에게 하는 반응",
  "tip": "현대어 존댓말로, 학생이 답을 고치는 데 도움이 되는 힌트 1문장(정답을 통째로 알려주지 말 것). perfect면 빈 문자열"
}
`;

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const answer = String(body.answer || '').slice(0, 600);
    const name = String(body.name || '').slice(0, 20);

    const result = gradeWithGemini_(answer);
    logAnswer_(name, answer, result);
    return json_(result);
  } catch (err) {
    return json_({ error: String(err) });
  }
}

// 브라우저에서 URL을 열었을 때 작동 확인용
function doGet() {
  return json_({ ok: true, message: '대동법 채점 서버가 작동 중입니다.' });
}

function gradeWithGemini_(answer) {
  const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) throw new Error('GEMINI_API_KEY가 스크립트 속성에 없습니다.');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
  const payload = {
    contents: [{ role: 'user', parts: [{ text: RUBRIC + '\n\n[학생의 답]\n' + answer }] }],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 0 }, // 응답 속도 우선
    },
  };

  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  const data = JSON.parse(res.getContentText());
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini 응답 없음: ' + res.getContentText().slice(0, 200));

  const out = JSON.parse(text);
  const valid = ['perfect', 'good', 'poor', 'terrible'];
  if (!valid.includes(out.grade)) out.grade = 'poor';
  return { grade: out.grade, comment: out.comment || '', tip: out.tip || '' };
}

function logAnswer_(name, answer, result) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;
    let sh = ss.getSheetByName('답변기록');
    if (!sh) {
      sh = ss.insertSheet('답변기록');
      sh.appendRow(['시각', '이름', '답변', '등급', '광해군 반응', '힌트']);
      sh.setFrozenRows(1);
    }
    sh.appendRow([new Date(), name, answer, result.grade, result.comment, result.tip]);
  } catch (e) {
    // 시트에 연결되지 않은 독립형 스크립트면 기록 생략
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// 편집기에서 직접 실행해 보는 테스트 함수
function testGrade() {
  Logger.log(gradeWithGemini_('공납 때문에 방납의 폐단이 심해서 토지 기준으로 쌀을 내게 하면 농민 부담이 줄어듭니다.'));
}
