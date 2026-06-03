import { state } from './config.js';
import { extractBaseText } from './lib/mora-counter.js';

export function setupExportEvents() {
  const exportAllBtn = document.getElementById('export-all-csv');
  if (!exportAllBtn) return;

  exportAllBtn.onclick = () => {
    // 1. タイムライン設計CSVの生成
    let timelineCsv = '開始時間(秒),レイヤー,キャラクター名,セリフ\n';
    const sortedSubs = [...state.subtitles].sort((a, b) => a.startTime - b.startTime);
    
    sortedSubs.forEach(sub => {
      const cleanText = extractBaseText(sub.text).replace(/"/g, '""');
      timelineCsv += `${sub.startTime.toFixed(3)},${sub.layer},${sub.charName},"${cleanText}"\n`;
    });

    // 2. 台本CSVのグループ化生成
    const scriptSubs = sortedSubs.filter(sub => !sub.isPin);
    const groups = {};

    scriptSubs.forEach(sub => {
      const char = state.characters.find(c => c.name === sub.charName);
      const groupName = char?.outputGroup || '';
      if (!groups[groupName]) {
        groups[groupName] = 'キャラクター名,セリフ\n';
      }
      const escapedText = sub.text.replace(/"/g, '""');
      groups[groupName] += `${sub.charName},"${escapedText}"\n`;
    });

    // 順次ダウンロード実行
    // タイムライン設計を最初に
    downloadCSV(timelineCsv, 'gj_timeline_design.csv');

    // グループごとの台本をダウンロード（少し時間をずらす）
    Object.keys(groups).forEach((groupName, index) => {
      const filename = groupName ? `gj_script_${groupName}.csv` : 'gj_script.csv';
      setTimeout(() => {
        downloadCSV(groups[groupName], filename);
      }, (index + 1) * 300);
    });
  };
}

function downloadCSV(csvContent, filename) {
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // UTF-8 with BOM for Excel
  const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
