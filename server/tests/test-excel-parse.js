/**
 * 测试 TT记账表.xlsx 解析逻辑
 * 使用与 transactionController.js 完全相同的 parseExcelSheet 函数
 */
const XLSX = require('xlsx');
const path = require('path');

const filePath = path.resolve(__dirname, '../../TT记账表.xlsx');

// 与 transactionController.js 中的 parseExcelSheet 完全一致
const parseExcelSheet = (ws, sheetName) => {
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (raw.length < 2) return [];

  const header = raw[0];
  const rows = [];

  const isSimple = String(header[1] || '').includes('客户');

  if (isSimple) {
    for (let i = 1; i < raw.length; i++) {
      const r = raw[i];
      const nickname = String(r[1] || '').trim();
      const plan = String(r[2] || '').trim();
      const amount = parseFloat(r[3]);
      if (nickname && amount > 0) {
        rows.push({ nickname, amount, plan });
      }
    }
  } else {
    const groups = [];
    for (let c = 0; c < header.length; c++) {
      if (String(header[c]).includes('客户')) {
        groups.push({ nameCol: c, planCol: c + 1, amountCol: c + 2 });
      }
    }

    for (let i = 1; i < raw.length; i++) {
      const r = raw[i];
      for (const g of groups) {
        const nickname = String(r[g.nameCol] || '').trim();
        const plan = String(r[g.planCol] || '').trim();
        const amount = parseFloat(r[g.amountCol]);
        if (nickname && amount > 0) {
          rows.push({ nickname, amount, plan });
        }
      }
    }
  }

  return rows;
};

// ========== 执行测试 ==========
console.log('=== 解析 TT记账表.xlsx ===\n');
console.log('文件路径:', filePath);

const wb = XLSX.readFile(filePath);
console.log('工作表列表:', wb.SheetNames);
console.log('');

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  
  console.log(`\n========== 工作表: ${name} ==========`);
  console.log(`原始行数: ${raw.length}`);
  
  if (raw.length > 0) {
    console.log('表头:', JSON.stringify(raw[0]));
    const isSimple = String(raw[0][1] || '').includes('客户');
    console.log('格式检测:', isSimple ? '简单格式' : '复杂格式（多轮分组）');
    
    if (!isSimple) {
      // 显示列组检测
      const groups = [];
      for (let c = 0; c < raw[0].length; c++) {
        if (String(raw[0][c]).includes('客户')) {
          groups.push({ nameCol: c, planCol: c + 1, amountCol: c + 2 });
        }
      }
      console.log('检测到的列组:', JSON.stringify(groups));
    }
    
    // 显示前3行原始数据
    console.log('前3行原始数据:');
    for (let i = 1; i <= Math.min(3, raw.length - 1); i++) {
      console.log(`  行${i}:`, JSON.stringify(raw[i]));
    }
  }
  
  const rows = parseExcelSheet(ws, name);
  console.log(`\n解析结果: ${rows.length} 条有效记录`);
  
  if (rows.length > 0) {
    console.log('前10条记录:');
    rows.slice(0, 10).forEach((r, i) => {
      console.log(`  ${i + 1}. 客户=${r.nickname}, 金额=${r.amount}, 方案=${r.plan}`);
    });
    if (rows.length > 10) {
      console.log(`  ... 还有 ${rows.length - 10} 条`);
    }
    
    // 统计
    const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);
    const uniqueCustomers = new Set(rows.map(r => r.nickname));
    console.log(`\n统计: ${uniqueCustomers.size} 个客户, 总金额 ¥${totalAmount.toFixed(2)}`);
  }
}

console.log('\n=== 解析完成 ===');
