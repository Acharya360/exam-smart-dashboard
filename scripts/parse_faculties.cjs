const fs = require('fs');

const content = fs.readFileSync('D:/SSPU_Exam_Performance_Dashboard/Database/ImportCSV/FacultyDetails.csv', 'utf8');
const lines = content.split('\n').filter(Boolean);
console.log('Total lines in FacultyDetails:', lines.length);

// Use a simple CSV parser to handle quotes
function parseCsvLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

const headers = parseCsvLine(lines[0]);
console.log('Headers:', headers);

const programs = {};
const validRows = [];
for (let i = 1; i < lines.length; i++) {
  const row = parseCsvLine(lines[i]);
  const subCode = row[2];
  const subName = row[3];
  const staffCode = row[4];
  const staffName = row[5];
  const addStaff = row[6];
  const sec = row[7] || 'A';
  const sem = row[8] || 'I';
  const prog = row[9] || 'General';

  if (subCode && staffCode && staffName) {
    if (!programs[prog]) programs[prog] = 0;
    programs[prog]++;
    validRows.push({ subCode, subName, staffCode, staffName, addStaff, sec, sem, prog });
  }
}

console.log('\nValid rows count:', validRows.length);
console.log('\nPrograms breakdown:');
for (const [p, c] of Object.entries(programs).sort((a,b) => b[1] - a[1])) {
  console.log(`- ${p}: ${c} records`);
}

console.log('\nSample rows from top programs:');
console.log(validRows.slice(0, 5));
