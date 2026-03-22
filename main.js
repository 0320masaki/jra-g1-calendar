function main() {
  const year = new Date().getFullYear();
  const url = `https://www.jra.go.jp/datafile/seiseki/replay/${year}/g1.html`;
  
  try {
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) {
      Logger.log("HTTP Error Ocurred: " + response.getResponseCode());
      return;
    }
    const html = response.getContentText('Shift_JIS'); // JRA HTML corresponds to Shift_JIS
    
    const rowRegex = /<tr>([\s\S]*?)<\/tr>/g;
    let match;
    const g1Races = [];
    
    while ((match = rowRegex.exec(html)) !== null) {
      const rowHtml = match[1];
      if (rowHtml.includes('GⅠ') || rowHtml.includes('J・GⅠ')) {
        // Extract date
        const dateMatch = rowHtml.match(/<td[^>]*>\s*(\d{1,2}月\d{1,2}日)[\s\S]*?<\/td>/) || rowHtml.match(/<td[^>]*date[^>]*>([\s\S]*?)<\/td>/);
        let dateStr = "";
        if (dateMatch) {
            dateStr = dateMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, "");
            const extracted = dateStr.match(/\d{1,2}月\d{1,2}日/);
            if (extracted) {
              dateStr = extracted[0];
            } else {
              dateStr = "";
            }
        }
        
        // Extract race name
        const raceMatch = rowHtml.match(/<a[^>]*>(.*?)<\/a>/);
        let raceName = "";
        if (raceMatch) {
            raceName = raceMatch[1].trim();
        }
        
        if (dateStr && raceName) {
            const month = parseInt(dateStr.match(/(\d+)月/)[1], 10);
            const day = parseInt(dateStr.match(/(\d+)日/)[1], 10);
            const raceDate = new Date(year, month - 1, day);
            
            g1Races.push({ name: raceName, date: raceDate });
        }
      }
    }
    
    Logger.log("Found " + g1Races.length + " G1 races.");
    if (g1Races.length === 0) {
      Logger.log("No races found. The layout may have changed.");
      return;
    }
    
    const calendar = CalendarApp.getDefaultCalendar();
    
    g1Races.forEach(race => {
      // Advance Lottery (先行抽選): 2 weeks before the race, Friday 12:00.
      const advanceLotteryDate = new Date(race.date);
      advanceLotteryDate.setDate(advanceLotteryDate.getDate() - 14); // 2 weeks back
      while(advanceLotteryDate.getDay() !== 5) {
        advanceLotteryDate.setDate(advanceLotteryDate.getDate() - 1);
      }
      advanceLotteryDate.setHours(12, 0, 0, 0);
      
      // General Lottery (一般抽選): 1 week before the race, Tuesday 18:00.
      const generalLotteryDate = new Date(race.date);
      generalLotteryDate.setDate(generalLotteryDate.getDate() - 7); // 1 week back
      while(generalLotteryDate.getDay() !== 2) {
        generalLotteryDate.setDate(generalLotteryDate.getDate() - 1);
      }
      generalLotteryDate.setHours(18, 0, 0, 0);
      
      createEventIfNotExists(calendar, `[先行抽選] ${race.name}`, advanceLotteryDate);
      createEventIfNotExists(calendar, `[一般抽選] ${race.name}`, generalLotteryDate);
    });
    
  } catch(e) {
    Logger.log("Error: " + e.message);
  }
}

function createEventIfNotExists(calendar, title, startTime) {
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration
  const events = calendar.getEvents(startTime, endTime, {search: title});
  if (events.length === 0) {
    calendar.createEvent(title, startTime, endTime);
    // Logger.log("Created event: " + title + " at " + startTime);
  }
}
