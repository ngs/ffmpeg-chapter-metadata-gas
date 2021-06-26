function writeData() {
  const sheetName = 'Output';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName) || ss.insertSheet();
  const data = getData();
  Logger.log(data);
  sheet.setName(sheetName);
  sheet.getRange(1, 1).setValue(data);
}

function doGet() {
  return ContentService.createTextOutput(getData());
}

function getData() {
  const metadata = getMetadata(true);
  delete metadata.duration;
  const chapters = getChapters();
  return [
    ';FFMETADATA1',
    ';Usage: ffmpeg -i source.mp4 -i ffmpeg-metadata.txt -map_metadata 1 -codec copy out.mp4',
    '',
    ...Object.keys(metadata).map(k => `${k}=${escapeString(metadata[k])}`),
    ...chapters.map(({ start, end, title }) => [
      '',
      '[CHAPTER]',
      'TIMEBASE=1/1000',
      `START=${start}`,
      `END=${end}`,
      `title=${escapeString(title)}`
    ]).flat()
  ].join('\n');
}

function getChapters() {
  let baseTime;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Chapters');
  const { duration } = getMetadata();
  const res = [];
  for (let n = 2; ; n++) {
    const [[time, title]] = sheet.getRange(n, 1, 1, 2).getValues();
    if (!(time instanceof Date)) {
      if (res.length > 0) {
        res[res.length - 1].end = duration - baseTime;
      }
      return res;
    }
    baseTime = baseTime || time;
    prevTime = time;
    const start = time - baseTime;
    if (res.length > 0) {
      res[res.length - 1].end = start - 1;
    }
    res.push({
      start,
      title,
      end: -1
    });
  }
}

function getMetadata(displayValue = false) {
  const data = {};
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Metadata');
  for (let i = 1; ; i++) {
    const range = sheet.getRange(i, 1, 1, 2);
    const [[key, value]] = displayValue ? range.getDisplayValues() : range.getValues();
    if (!key) return data;
    data[key] = value;
  }
}

function escapeString(str) {
  return `${str}`.replace(/(\s|#)/g, '\\$1');
}