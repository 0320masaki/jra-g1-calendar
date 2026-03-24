/**
 * 2026 JRA G1 Schedule -> Google Calendar
 * Start: 15:10 / Color: Basil (10) / Lottery: Tue 18:00 - Thu 13:00 (1 week prior)
 */

var CALENDAR_ID = 'de5893d84b93f0ff8895765e3a714793e664c94b376c452bea62a04d807f429d@group.calendar.google.com';
var COLOR_BASIL = '10';

function getG1Races2026() {
  return [
    { name: 'フェブラリーステークス', date: '2026-02-22', venue: '東京競馬場' },
    { name: '高松宮記念', date: '2026-03-29', venue: '中京競馬場' },
    { name: '大阪杯', date: '2026-04-05', venue: '阪神競馬場' },
    { name: '桜花賞', date: '2026-04-12', venue: '阪神競馬場' },
    { name: '皐月賞', date: '2026-04-19', venue: '中山競馬場' },
    { name: '天皇賞（春）', date: '2026-05-03', venue: '京都競馬場' },
    { name: 'NHKマイルカップ', date: '2026-05-10', venue: '東京競馬場' },
    { name: 'ヴィクトリアマイル', date: '2026-05-17', venue: '東京競馬場' },
    { name: '優駿牝馬（オークス）', date: '2026-05-24', venue: '東京競馬場' },
    { name: '東京優駿（日本ダービー）', date: '2026-05-31', venue: '東京競馬場' },
    { name: '安田記念', date: '2026-06-07', venue: '東京競馬場' },
    { name: '宝塚記念', date: '2026-06-14', venue: '阪神競馬場' },
    { name: 'スプリンターズステークス', date: '2026-09-27', venue: '中山競馬場' },
    { name: '秋華賞', date: '2026-10-18', venue: '京都競馬場' },
    { name: '菊花賞', date: '2026-10-25', venue: '京都競馬場' },
    { name: '天皇賞（秋）', date: '2026-11-01', venue: '東京競馬場' },
    { name: 'エリザベス女王杯', date: '2026-11-15', venue: '京都競馬場' },
    { name: 'マイルチャンピオンシップ', date: '2026-11-22', venue: '京都競馬場' },
    { name: 'ジャパンカップ', date: '2026-11-29', venue: '東京競馬場' },
    { name: 'チャンピオンズカップ', date: '2026-12-06', venue: '中京競馬場' },
    { name: '阪神ジュベナイルフィリーズ', date: '2026-12-13', venue: '阪神競馬場' },
    { name: '朝日杯フューチュリティステークス', date: '2026-12-20', venue: '阪神競馬場' },
    { name: 'ホープフルステークス', date: '2026-12-26', venue: '中山競馬場' },
    { name: '有馬記念', date: '2026-12-27', venue: '中山競馬場' }
  ];
}

function parseDate(dateStr) {
  var parts = dateStr.split('-');
  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
}

/**
 * getLotterySchedule: raceDate から前週の火曜・木曜を特定
 * @param {Date} raceDate
 * @return {{ start: Date, end: Date }} 火曜 18:00 〜 木曜 13:00
 */
function getLotterySchedule(raceDate) {
  // レース日から過去方向に探索し、前週の木曜日を見つける
  var thu = new Date(raceDate.getTime());
  thu.setDate(thu.getDate() - 1); // レース当日を除外
  while (thu.getDay() !== 4) {    // 4 = Thursday
    thu.setDate(thu.getDate() - 1);
  }
  // その木曜の2日前 = 火曜日
  var tue = new Date(thu.getTime());
  tue.setDate(tue.getDate() - 2);
  // 安全確認: whileループで火曜を再確認
  while (tue.getDay() !== 2) {    // 2 = Tuesday
    tue.setDate(tue.getDate() - 1);
  }

  var start = new Date(tue.getFullYear(), tue.getMonth(), tue.getDate(), 18, 0, 0);
  var end   = new Date(thu.getFullYear(), thu.getMonth(), thu.getDate(), 13, 0, 0);
  return { start: start, end: end };
}

function findExistingEvent(cal, title, start, end) {
  var events = cal.getEvents(start, end);
  for (var i = 0; i < events.length; i++) {
    if (events[i].getTitle() === title) {
      return events[i];
    }
  }
  return null;
}

function createRaceEvent(cal, race) {
  var d = parseDate(race.date);
  var start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 15, 10, 0);
  var end   = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 16, 0, 0);
  var title = 'G1 ' + race.name;

  var ev = cal.createEvent(title, start, end, {
    location: race.venue,
    description: '2026 JRA G1\n' + race.venue
  });
  ev.setColor(COLOR_BASIL);
  Logger.log('Race: ' + title + ' ' + race.date + ' @ ' + race.venue);
  return ev;
}

function createLotteryEvent(cal, race) {
  var d = parseDate(race.date);
  var sched = getLotterySchedule(d);
  var today = new Date();
  if (sched.end < today) {
    Logger.log('Lottery skip (past): ' + race.name);
    return null;
  }
  var title = '\uD83C\uDFAB ' + race.name + ' \u4e00\u822c\u62bd\u9078 (\u6728\u66DC13\u6642\u7de0\u5207)';
  var startStr = Utilities.formatDate(sched.start, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');
  var endStr   = Utilities.formatDate(sched.end,   'Asia/Tokyo', 'yyyy/MM/dd HH:mm');

  var ev = cal.createEvent(title, sched.start, sched.end, {
    location: race.venue,
    description: race.name + ' \u4e00\u822c\u62bd\u9078\n'
      + '\u7533\u8fbc\u958b\u59cb: ' + startStr + '\n'
      + '\u7de0\u5207: ' + endStr + '\n'
      + '\u30ec\u30fc\u30b9\u65e5: ' + race.date + '\n'
      + '\u4f1a\u5834: ' + race.venue
  });
  ev.setColor(COLOR_BASIL);
  Logger.log('Lottery: ' + title + ' ' + startStr + ' ~ ' + endStr);
  return ev;
}

function registerG1Races() {
  var cal = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!cal) {
    Logger.log('ERROR: Calendar not found: ' + CALENDAR_ID);
    return;
  }
  Logger.log('=== 2026 JRA G1 Registration Start ===');
  var races = getG1Races2026();
  var rc = 0, sc = 0, lc = 0;

  for (var i = 0; i < races.length; i++) {
    var race = races[i];
    var d = parseDate(race.date);
    var start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 15, 10, 0);
    var end   = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 16, 0, 0);
    var rTitle = 'G1 ' + race.name;

    if (findExistingEvent(cal, rTitle, start, end)) {
      Logger.log('Skip (exists): ' + rTitle);
      sc++;
    } else {
      createRaceEvent(cal, race);
      rc++;
    }

    var sched = getLotterySchedule(d);
    var lTitle = '\uD83C\uDFAB ' + race.name + ' \u4e00\u822c\u62bd\u9078 (\u6728\u66DC13\u6642\u7de0\u5207)';

    if (findExistingEvent(cal, lTitle, sched.start, sched.end)) {
      Logger.log('Skip (lottery exists): ' + lTitle);
    } else {
      if (createLotteryEvent(cal, race)) lc++;
    }
  }

  Logger.log('=== Done: Races=' + rc + ' Skipped=' + sc + ' Lottery=' + lc + ' ===');
}

function deleteAllG1Events() {
  var cal = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!cal) { Logger.log('Calendar not found'); return; }
  var events = cal.getEvents(new Date(2026, 0, 1), new Date(2027, 0, 1));
  var del = 0;
  for (var i = 0; i < events.length; i++) {
    var t = events[i].getTitle();
    if (t.indexOf('G1 ') === 0 || t.indexOf('一般抽選') > -1) {
      events[i].deleteEvent();
      del++;
      Logger.log('Deleted: ' + t);
    }
  }
  Logger.log('Total deleted: ' + del);
}
