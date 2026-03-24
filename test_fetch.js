const https = require('https');
https.get('https://www.jra.go.jp/datafile/seiseki/replay/2026/g1.html', (resp) => {
  let data = '';
  resp.on('data', (chunk) => data += chunk);
  resp.on('end', () => console.log(data.substring(0, 2000)));
}).on("error", (err) => console.log("Error: " + err.message));
