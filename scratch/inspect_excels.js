import * as XLSX from 'xlsx';

const files = [
  'docs/Sample Templete.xlsx',
  'docs/Course_Master_LTPS_Template.xlsx',
  'C:/Users/janka/.gemini/antigravity/brain/1e772245-01c3-4995-b19e-9ee8351dafe5/.user_uploaded/media_1792097505119_051f7dc0.xlsx'
];

import fs from 'fs';

for (const f of files) {
  try {
    const buf = fs.readFileSync(f);
    const wb = XLSX.read(buf, { type: 'buffer' });
    console.log('=== FILE:', f, '===');
    console.log('Sheets:', wb.SheetNames);
    for (const s of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1 });
      console.log(`Sheet "${s}": ${rows.length} rows`);
      if (rows.length > 0) {
        console.log('   Header:', rows[0]);
        if (rows.length > 1) {
          console.log('   Sample row 1:', rows[1]);
        }
      }
    }
  } catch (e) {
    console.log('Error reading', f, e.message);
  }
}
