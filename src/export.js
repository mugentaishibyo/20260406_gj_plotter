import { state } from './config.js';

export function setupExportEvents() {
  const exportTimelineBtn = document.getElementById('export-timeline');
  const exportScriptBtn = document.getElementById('export-script');

  exportTimelineBtn.onclick = () => {
    let csv = '開始時間(秒),レイヤー,キャラクター名,セリフ\n';
    state.subtitles.sort((a, b) => a.startTime - b.startTime).forEach(sub => {
      // レイヤー情報も合わせて書き出すように拡張
      csv += `${sub.startTime.toFixed(3)},${sub.layer},${sub.charName},"${sub.text.replace(/"/g, '""')}"\n`;
    });
    downloadCSV(csv, 'ymm_timeline_design.csv');
  };

  exportScriptBtn.onclick = () => {
    let csv = 'キャラクター名,セリフ\n';
    state.subtitles.sort((a, b) => a.startTime - b.startTime).forEach(sub => {
      csv += `${sub.charName},"${sub.text.replace(/"/g, '""')}"\n`;
    });
    downloadCSV(csv, 'ymm_script.csv');
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
