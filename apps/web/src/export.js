import { state } from './config.js';
import { extractBaseText } from './lib/mora-counter.js';
import JSZip from 'jszip';

export function setupExportEvents() {
  const exportAllBtn = document.getElementById('export-all-csv');
  if (!exportAllBtn) return;

  exportAllBtn.onclick = async () => {
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

    // 3. ZIPの作成
    const zip = new JSZip();
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // UTF-8 with BOM for Excel

    const addCsvToZip = (filename, content) => {
      const blob = new Blob([bom, content], { type: 'text/csv;charset=utf-8;' });
      zip.file(filename, blob);
    };

    // タイムライン設計を追加
    addCsvToZip('gj_timeline_design.csv', timelineCsv);

    // グループごとの台本を追加
    Object.keys(groups).forEach((groupName) => {
      const filename = groupName ? `gj_script_${groupName}.csv` : 'gj_script.csv';
      addCsvToZip(filename, groups[groupName]);
    });

    // ZIPの生成とダウンロード実行
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    
    // ダウンロードするZIPファイル名に日時をつける (例: gj_export_20260613_120000.zip)
    const now = new Date();
    const dateStr = now.getFullYear().toString() + 
                    String(now.getMonth() + 1).padStart(2, '0') + 
                    String(now.getDate()).padStart(2, '0') + '_' + 
                    String(now.getHours()).padStart(2, '0') + 
                    String(now.getMinutes()).padStart(2, '0') + 
                    String(now.getSeconds()).padStart(2, '0');
    
    link.setAttribute('download', `gj_export_${dateStr}.zip`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
}
