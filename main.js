function main() {
  const year = new Date().getFullYear();
  // 指定されたURL
  const url = `https://www.jra.go.jp/datafile/seiseki/replay/${year}/g1.html`;

  try {
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) {
      Logger.log("HTTP Error Ocurred: " + response.getResponseCode());
      return;
    }
    // 文字コード指定で取得
    const html = response.getContentText('Shift_JIS');

    // HTMLの一部を出力（デバッグ用）
    Logger.log("===== HTML Source (First 500 chars) =====");
    Logger.log(html.substring(0, 500));
    Logger.log("=========================================");

    const g1Races = [];

    // tableごとに分割して解析
    const tables = html.split(/<table/i);
    for (let i = 1; i < tables.length; i++) {
      const tableHtml = tables[i];

      // captionタグの抽出 (もしテーブルごとにcaptionがある場合)
      let captionRaceName = null;
      const captionMatch = tableHtml.match(/<caption[^>]*>([\s\S]*?)<\/caption>/i);
      if (captionMatch) {
        let raw = captionMatch[1].replace(/<[^>]+>/g, "").trim();
        raw = raw.replace(/^第\d+回\s*/, "").replace(/（.*GⅠ.*）|（.*J・GⅠ.*）/g, "").trim();
        // 「一覧」などのページタイトルでない場合のみ採用
        if (raw.length > 0 && raw.length < 30 && !raw.includes("一覧")) {
          captionRaceName = raw;
        }
      }

      // tr (行) ごとに td タグをパース
      const rows = tableHtml.split(/<tr/i);
      for (let j = 1; j < rows.length; j++) {
        const rowHtml = rows[j];
        let rowRaceName = null;
        let dateStr = null;

        // 開催日の抽出 (\d月\d日 のパターン)
        const dateMatch = rowHtml.match(/<td[^>]*>(?:[\s\S]*?)?(\d{1,2}月\d{1,2}日)(?:[\s\S]*?)?<\/td>/i);
        if (dateMatch) {
          dateStr = dateMatch[1];
        }

        // レース名の抽出 (aタグや、直接テキストから)
        const aMatch = rowHtml.match(/<a[^>]*>([^<]+)<\/a>/i);
        if (aMatch) {
          let aText = aMatch[1].trim();
          // 余計な改行やタグを除去
          aText = aText.replace(/<[^>]+>/g, "").trim();
          // ある程度レース名っぽいものを抽出（関係ないリンクを弾くため）
          if (rowHtml.includes('GⅠ') || rowHtml.includes('J・GⅠ') || aText.match(/記念|杯|賞|ステークス|オークス|ダービー|チャンピオンシップ|マイル|スプリント|ジュベナイル|フューチュリティ|ホープフル/)) {
            rowRaceName = aText;
          }
        }

        // aタグがなくても GⅠ というテキストがあるtdを探す
        if (!rowRaceName && (rowHtml.includes('GⅠ') || rowHtml.includes('J・GⅠ'))) {
          // thやtdの中身をさらって一番長いテキストをレース名とみなすなどの汎用処理
          const tdMatch = rowHtml.match(/<t[dh][^>]*>([\s\S]*?(?:GⅠ|J・GⅠ)[\s\S]*?)<\/t[dh]>/i);
          if (tdMatch) {
            let text = tdMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
            let splitG1 = text.split(/GⅠ|J・GⅠ/);
            if (splitG1.length > 1 && splitG1[1].trim() !== "") {
              rowRaceName = splitG1[1].trim().split(" ")[0]; // 最初の単語
            }
          }
        }

        // captionとrowで見つかった名前を統合
        let finalName = rowRaceName || captionRaceName;
        if (finalName && dateStr) {
          finalName = finalName.replace(/<[^>]+>/g, "").replace(/^第\d+回\s*/, "").replace(/（.*GⅠ.*）|（.*J・GⅠ.*）/g, "").trim();

          const month = parseInt(dateStr.split("月")[0], 10);
          const day = parseInt(dateStr.split("月")[1].split("日")[0], 10);

          if (!g1Races.find(r => r.name === finalName)) {
            g1Races.push({
              name: finalName,
              date: new Date(year, month - 1, day)
            });
            Logger.log(`[抽出成功] レース名: ${finalName}, 開催日: ${dateStr}`);
          }
        }
      }
    }

    Logger.log(`合計 ${g1Races.length} 件のG1レースが見つかりました。`);
    if (g1Races.length === 0) {
      Logger.log("抽出件数が0件です。対象ページのHTML構造が変わった可能性があります。");
      return;
    }

    const calendar = CalendarApp.getDefaultCalendar();

    g1Races.forEach(race => {
      // 1. レース当日（終日予定）
      const raceDayTitle = race.name;
      createAllDayEventIfNotExists(calendar, raceDayTitle, race.date);

      // 2. 2週前の金曜 12:00（先行抽選） - コメントアウト
      /*
      const advanceLotteryDate = new Date(race.date);
      advanceLotteryDate.setDate(advanceLotteryDate.getDate() - 14); // 2週間前
      while(advanceLotteryDate.getDay() !== 5) { // 金曜日
        advanceLotteryDate.setDate(advanceLotteryDate.getDate() - 1);
      }
      advanceLotteryDate.setHours(12, 0, 0, 0);
      const advanceTitle = `[先行抽選] ${race.name}`;
      createEventIfNotExists(calendar, advanceTitle, advanceLotteryDate);
      */

      // 3. 1週前の火曜 18:00（一般抽選）
      const generalLotteryDate = new Date(race.date);
      generalLotteryDate.setDate(generalLotteryDate.getDate() - 7); // 1週間前
      while (generalLotteryDate.getDay() !== 2) { // 火曜日
        generalLotteryDate.setDate(generalLotteryDate.getDate() - 1);
      }
      generalLotteryDate.setHours(18, 0, 0, 0);
      const generalTitle = `一般抽選：${race.name}`;
      createEventIfNotExists(calendar, generalTitle, generalLotteryDate);
    });

  } catch (e) {
    Logger.log("Error Ocurred: " + e.message);
  }
}

// 終日予定作成 (重複防止)
function createAllDayEventIfNotExists(calendar, title, raceDate) {
  const events = calendar.getEventsForDay(raceDate, { search: title });
  if (events.length === 0) {
    const event = calendar.createAllDayEvent(title, raceDate);
    event.setColor('10');
    Logger.log(`  [登録] 終日予定: ${title} (${Utilities.formatDate(raceDate, "Asia/Tokyo", "yyyy/MM/dd")})`);
  } else {
    events[0].setColor('10');
    Logger.log(`  [スキップ・色更新] 終日予定済: ${title}`);
  }
}

// 時間指定予定作成 (重複防止)
function createEventIfNotExists(calendar, title, startTime) {
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1時間
  const events = calendar.getEvents(startTime, endTime, { search: title });
  if (events.length === 0) {
    const event = calendar.createEvent(title, startTime, endTime);
    event.setColor('10');
    Logger.log(`  [登録] 予定: ${title} (${Utilities.formatDate(startTime, "Asia/Tokyo", "MM/dd HH:mm")})`);
  } else {
    events[0].setColor('10');
    Logger.log(`  [スキップ・色更新] 登録済: ${title}`);
  }
}

function deleteJraEvents() {
  const calendar = CalendarApp.getDefaultCalendar();
  const startTime = new Date('2026/03/01');
  const endTime = new Date('2026/12/31');

  // 削除対象のキーワードリスト
  const keywords = ['[一般抽選]', '[競馬G1]', '[先行抽選]'];

  keywords.forEach(keyword => {
    const events = calendar.getEvents(startTime, endTime, { search: keyword });
    events.forEach(event => {
      // 念のため、タイトルにキーワードが含まれているか再確認して削除
      if (event.getTitle().includes(keyword)) {
        console.log('削除中: ' + event.getTitle());
        event.deleteEvent();
      }
    });
  });
  console.log('競馬関連の古い予定の削除が完了しました。');
}