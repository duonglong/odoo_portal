import fs from 'fs';

const files = [
  'modules/attendance/src/screens/LeaveRequestListScreen.tsx',
  'modules/attendance/src/components/LeaveFilters.tsx',
  'modules/attendance/src/components/LeaveBalanceCards.tsx',
  'modules/attendance/src/components/LeaveRequestTable.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/dark:[a-zA-Z0-9_/\-\[\]#]+/g, '');
  fs.writeFileSync(file, content);
}
console.log("Stripped dark mode classes.");
