/**
 * Helper định dạng tiền tệ chuẩn VNĐ cho No Offside
 * - formatCurrency(1234567) => "1.234.567 đ"
 * - formatCompactCurrency(5850000) => "5.85M"
 * - formatCompactCurrency(300000) => "300k"
 */

export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '0 đ';
  }
  const num = Number(amount);
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  
  // Định dạng với dấu chấm ngăn cách hàng nghìn theo chuẩn Việt Nam
  const formatted = absNum.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${isNegative ? '-' : ''}${formatted} đ`;
}

export function formatCompactCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '0 đ';
  }
  const num = Number(amount);
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  let result = '';
  if (absNum >= 1_000_000_000) {
    const val = absNum / 1_000_000_000;
    result = `${val % 1 === 0 ? val : val.toFixed(1).replace('.0', '')}B`;
  } else if (absNum >= 1_000_000) {
    const val = absNum / 1_000_000;
    result = `${val % 1 === 0 ? val : val.toFixed(2).replace(/\.?0+$/, '')}M`;
  } else if (absNum >= 1_000) {
    const val = absNum / 1_000;
    result = `${val % 1 === 0 ? val : val.toFixed(1).replace('.0', '')}k`;
  } else {
    result = `${absNum} đ`;
  }

  return `${isNegative ? '-' : ''}${result}`;
}
