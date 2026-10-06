const MENU_ID = '01040100000000000001';
const DATE = '20261024';
const BOOKING_URL = 'https://reservation.everland.com/web/el.do?high_menu_id=0104&menu_id=01040100000000000001&method=getProduct&top_menu_id=01';
const STATUS_URL = new URL('https://reservation.everland.com/web/comm.do');
STATUS_URL.search = new URLSearchParams({
  cmethod: 'checkCapaWoS',
  menu_id: MENU_ID,
  visit_pl_dt: DATE,
}).toString();

async function main() {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date()).replaceAll('-', '');
  if (today >= DATE) {
    console.log('예약 전날이 지나 확인을 종료합니다.');
    return;
  }

  const response = await fetch(STATUS_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EverlandValetAvailability/1.0)' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`에버랜드 조회 실패: HTTP ${response.status}`);
  const data = await response.json();
  const code = String(data?.result?.resultCode ?? '');
  if (code === '-1') {
    console.log('2026-10-24: 잔여 없음');
    return;
  }
  if (code !== '00') throw new Error(`알 수 없는 에버랜드 응답: ${JSON.stringify(data)}`);

  console.log('2026-10-24: 예약 가능 상태 감지 (정확한 잔여 대수는 제공되지 않음)');
  if (process.env.DRY_RUN === '1') return;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error('TELEGRAM_BOT_TOKEN 또는 TELEGRAM_CHAT_ID가 없습니다.');
  const message = `🚗 에버랜드 10월 24일 발레파킹 예약 가능 표시가 나왔습니다.\n1대 이상 가능할 수 있지만 2대 가능 여부는 예약 화면에서 확인해야 합니다.\n${BOOKING_URL}\n\n2대 예약을 마치면 GitHub Actions의 Valet availability alert 워크플로를 중지하세요.`;
  const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(15000),
  });
  const result = await telegramResponse.json();
  if (!telegramResponse.ok || result.ok !== true) {
    throw new Error(`텔레그램 전송 실패: HTTP ${telegramResponse.status}, ${result.description ?? '원인 불명'}`);
  }
  console.log('텔레그램 알림 전송 완료');
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
