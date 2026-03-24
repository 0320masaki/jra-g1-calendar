const https = require('https');
const iconv = require('iconv-lite'); // assuming node modules if any? Actually let's just use regex on raw buffer

https.get('https://www.jra.go.jp/datafile/seiseki/replay/2026/g1.html', (res) => {
  let chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => {
    let buffer = Buffer.concat(chunks);
    // basic ascii/utf8 for logging 
    // to avoid shift_jis issues in terminal, let's just dump matches
    let html = buffer.toString('binary'); 
    let trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let match;
    let count = 0;
    while((match = trRegex.exec(html)) !== null && count < 5) {
      console.log('--- TR ---');
      let row = match[1];
      let tdRegex = /<td[ \S]*?>([\s\S]*?)<\/td>/gi;
      let tdMatch;
      while((tdMatch = tdRegex.exec(row)) !== null) {
        console.log('TD:', tdMatch[1].replace(/<[^>]+>/g, '').trim());
      }
      count++;
    }
  });
});
