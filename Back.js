let debts = [];
let calcResult = null;

// ============ DEBT MANAGEMENT ============
function addDebt() {
  const name = document.getElementById('debt-name').value.trim();
  const value = parseFloat(document.getElementById('debt-value').value);
  const months = parseInt(document.getElementById('debt-months').value);
  const category = document.getElementById('debt-category').value;

  if (!name || isNaN(value) || value <= 0 || isNaN(months) || months <= 0) {
    shakeInput();
    return;
  }

  const debt = { id: Date.now(), name, value, months, category, remaining: months };
  debts.push(debt);
  renderDebts();
  clearDebtForm();
}

function removeDebt(id) {
  debts = debts.filter(d => d.id !== id);
  renderDebts();
}

function categoryIcon(cat) {
  const icons = { divida: '💳', fixo: '🏠', financiamento: '🚗', emprestimo: '🏦', outro: '📌' };
  return icons[cat] || '📌';
}

function categoryLabel(cat) {
  const labels = { divida: 'Dívida', fixo: 'Despesa Fixa', financiamento: 'Financiamento', emprestimo: 'Empréstimo', outro: 'Outro' };
  return labels[cat] || cat;
}

function renderDebts() {
  const list = document.getElementById('debt-list');
  const empty = document.getElementById('debt-empty');

  // Remove old items
  list.querySelectorAll('.debt-item').forEach(e => e.remove());

  if (debts.length === 0) {
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';

  debts.forEach(debt => {
    const el = document.createElement('div');
    el.className = 'debt-item';
    el.id = 'debt-' + debt.id;
    el.innerHTML = `
      <div class="debt-info">
        <div class="debt-name">${categoryIcon(debt.category)} ${debt.name}</div>
        <div class="debt-meta">
          <span>${categoryLabel(debt.category)}</span>
          <span>•</span>
          <span>${debt.months} ${debt.months === 1 ? 'parcela' : 'parcelas'} restantes</span>
          <span>•</span>
          <span>Total: ${fmt(debt.value * debt.months)}</span>
        </div>
      </div>
      <div class="debt-value">${fmt(debt.value)}/mês</div>
      <button class="btn btn-danger" onclick="removeDebt(${debt.id})">✕</button>
    `;
    list.appendChild(el);
  });
}

function clearDebtForm() {
  document.getElementById('debt-name').value = '';
  document.getElementById('debt-value').value = '';
  document.getElementById('debt-months').value = '';
}

function shakeInput() {
  const btn = document.querySelector('.debt-form-grid .btn');
  btn.style.animation = 'none';
  btn.offsetHeight;
  btn.style.animation = 'shake 0.4s ease';
}

// ============ FORMATTING ============
function fmt(n) {
  if (isNaN(n) || n === null) return 'R$ 0,00';
  return 'R$ ' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function fmtMonths(n) {
  if (n < 12) return `${n} ${n === 1 ? 'mês' : 'meses'}`;
  const y = Math.floor(n / 12);
  const m = n % 12;
  return m > 0 ? `${y}a ${m}m` : `${y} ${y === 1 ? 'ano' : 'anos'}`;
}

function getMonthName(date) {
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return months[date.getMonth()] + '/' + String(date.getFullYear()).slice(2);
}

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

// ============ MAIN CALCULATION ============
function calcular() {
  const salario = parseFloat(document.getElementById('salario').value) || 0;
  const rendaExtra = parseFloat(document.getElementById('renda-extra').value) || 0;
  const totalRenda = salario + rendaExtra;

  const goalName = document.getElementById('goal-name').value.trim() || 'Meu Objetivo';
  const goalTotal = parseFloat(document.getElementById('goal-total').value) || 0;
  const goalSaved = parseFloat(document.getElementById('goal-saved').value) || 0;
  const goalMonthly = parseFloat(document.getElementById('goal-monthly').value) || 0;
  const goalStartVal = document.getElementById('goal-start').value;

  if (totalRenda <= 0) {
    alert('Informe seu salário mensal!');
    document.getElementById('salario').focus();
    return;
  }

  // Total dívidas mês atual
  const totalDebtsMonthly = debts.reduce((s, d) => s + d.value, 0);
  const saldoLivre = totalRenda - totalDebtsMonthly - goalMonthly;
  const totalDebtsBruto = debts.reduce((s, d) => s + d.value * d.months, 0);

  // Objetivo
  const goalNeeded = Math.max(0, goalTotal - goalSaved);
  let goalMonths = 0;
  if (goalMonthly > 0 && goalNeeded > 0) {
    goalMonths = Math.ceil(goalNeeded / goalMonthly);
  }

  // Start date
  const startDate = goalStartVal ? new Date(goalStartVal + '-01') : new Date();

  // Cronograma mensal (até concluir objetivo ou 36 meses, o que for maior)
  const horizonte = Math.max(goalMonths, 24);
  let acumulado = goalSaved;
  const rows = [];

  for (let i = 0; i < horizonte; i++) {
    const dt = addMonths(startDate, i);

    // Calcular dívidas ativas neste mês
    const debtThisMonth = debts.reduce((s, d) => {
      return i < d.months ? s + d.value : s;
    }, 0);

    const saving = (i < goalMonths || goalMonths === 0) ? goalMonthly : 0;
    const livre = totalRenda - debtThisMonth - saving;
    acumulado = Math.min(acumulado + saving, goalTotal);

    rows.push({
      mes: getMonthName(dt),
      renda: totalRenda,
      dividas: debtThisMonth,
      guardado: saving,
      livre,
      acumulado
    });
  }

  calcResult = {
    salario, rendaExtra, totalRenda,
    totalDebtsMonthly, totalDebtsBruto,
    saldoLivre,
    goalName, goalTotal, goalSaved, goalNeeded, goalMonthly, goalMonths,
    startDate, rows, debts: JSON.parse(JSON.stringify(debts))
  };

  renderResults(calcResult);
  document.getElementById('results-section').classList.remove('hidden');
  document.getElementById('results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderResults(r) {
  // STATS GRID
  const sg = document.getElementById('stats-grid');
  sg.innerHTML = `
    <div class="stat-card orange">
      <div class="stat-label">Renda Total</div>
      <div class="stat-value">${fmtShort(r.totalRenda)}</div>
      <div class="stat-sub">por mês</div>
    </div>
    <div class="stat-card red">
      <div class="stat-label">Total Dívidas/Mês</div>
      <div class="stat-value">${fmtShort(r.totalDebtsMonthly)}</div>
      <div class="stat-sub">${r.debts.length} compromisso(s)</div>
    </div>
    <div class="stat-card ${r.saldoLivre >= 0 ? 'green' : 'red'}">
      <div class="stat-label">Saldo Livre</div>
      <div class="stat-value">${fmtShort(r.saldoLivre)}</div>
      <div class="stat-sub">após dívidas e objetivo</div>
    </div>
  `;

  // BALANÇO
  const bc = document.getElementById('balanco-content');
  const pctDividas = r.totalRenda > 0 ? (r.totalDebtsMonthly / r.totalRenda * 100) : 0;
  const pctGuardado = r.totalRenda > 0 ? (r.goalMonthly / r.totalRenda * 100) : 0;
  const pctLivre = 100 - pctDividas - pctGuardado;

  let statusMsg = '';
  if (r.saldoLivre < 0) {
    statusMsg = `<div class="msg danger">⚠️ Atenção! Seu saldo mensal está <strong>negativo</strong>. Você está gastando mais do que recebe. Revise suas dívidas ou reduza o valor guardado para o objetivo.</div>`;
  } else if (pctDividas > 50) {
    statusMsg = `<div class="msg warn">💡 Suas dívidas representam mais de 50% da sua renda. Considere renegociar alguns valores.</div>`;
  } else if (r.saldoLivre > 0) {
    statusMsg = `<div class="msg success">✅ Boa saúde financeira! Você tem saldo positivo após todas as despesas.</div>`;
  }

  bc.innerHTML = `
    <div class="grid-3">
      <div class="field" style="gap:6px;">
        <div style="display:flex;justify-content:space-between;font-size:0.82rem;">
          <span style="color:var(--text-dim)">Dívidas</span>
          <span style="color:var(--red);font-family:'JetBrains Mono',monospace">${pctDividas.toFixed(1)}%</span>
        </div>
        <div class="progress-wrapper"><div class="progress-fill" style="width:${Math.min(pctDividas,100)}%;background:linear-gradient(to right,var(--red),#FF6B6B)"></div></div>
        <div style="font-size:0.85rem;color:var(--red);font-weight:600">${fmt(r.totalDebtsMonthly)}</div>
      </div>
      <div class="field" style="gap:6px;">
        <div style="display:flex;justify-content:space-between;font-size:0.82rem;">
          <span style="color:var(--text-dim)">Objetivo</span>
          <span style="color:var(--orange);font-family:'JetBrains Mono',monospace">${pctGuardado.toFixed(1)}%</span>
        </div>
        <div class="progress-wrapper"><div class="progress-fill" style="width:${Math.min(pctGuardado,100)}%"></div></div>
        <div style="font-size:0.85rem;color:var(--orange);font-weight:600">${fmt(r.goalMonthly)}</div>
      </div>
      <div class="field" style="gap:6px;">
        <div style="display:flex;justify-content:space-between;font-size:0.82rem;">
          <span style="color:var(--text-dim)">Saldo Livre</span>
          <span style="color:${r.saldoLivre >= 0 ? 'var(--green)' : 'var(--red)'};font-family:'JetBrains Mono',monospace">${Math.max(0,pctLivre).toFixed(1)}%</span>
        </div>
        <div class="progress-wrapper"><div class="progress-fill" style="width:${Math.max(0,Math.min(pctLivre,100))}%;background:linear-gradient(to right,var(--green),#69F0AE)"></div></div>
        <div style="font-size:0.85rem;color:${r.saldoLivre >= 0 ? 'var(--green)' : 'var(--red)'};font-weight:600">${fmt(r.saldoLivre)}</div>
      </div>
    </div>
    ${statusMsg}
  `;

  // OBJETIVO
  const gc = document.getElementById('goal-content');
  const pctObj = r.goalTotal > 0 ? Math.min((r.goalSaved / r.goalTotal) * 100, 100) : 0;
  const conclusaoDate = r.goalMonths > 0 ? addMonths(r.startDate, r.goalMonths) : null;
  const conclusaoStr = conclusaoDate ? conclusaoDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : '—';

  gc.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
      <div>
        <div style="font-size:1.3rem;font-weight:700;margin-bottom:4px;">🎯 ${r.goalName}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <span class="chip">Meta: ${fmt(r.goalTotal)}</span>
          <span class="chip green">Guardado: ${fmt(r.goalSaved)}</span>
          <span class="chip red">Falta: ${fmt(r.goalNeeded)}</span>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:2.4rem;color:var(--orange);line-height:1">${pctObj.toFixed(1)}%</div>
        <div style="font-size:0.75rem;color:var(--text-dim)">concluído</div>
      </div>
    </div>
    <div class="objetivo-labels">
      <span>${fmt(r.goalSaved)} guardado</span>
      <span>${fmt(r.goalTotal)} total</span>
    </div>
    <div class="progress-wrapper" style="height:14px;">
      <div class="progress-fill" style="width:${pctObj}%;height:100%"></div>
    </div>
    <div class="sep"></div>
    <div class="grid-3">
      <div class="stat-card orange">
        <div class="stat-label">Guardar p/ Mês</div>
        <div class="stat-value" style="font-size:1.5rem">${fmtShort(r.goalMonthly)}</div>
      </div>
      <div class="stat-card yellow">
        <div class="stat-label">Prazo Estimado</div>
        <div class="stat-value" style="font-size:1.5rem">${r.goalMonths > 0 ? fmtMonths(r.goalMonths) : '—'}</div>
        <div class="stat-sub">${conclusaoStr}</div>
      </div>
      <div class="stat-card green">
        <div class="stat-label">Falta Acumular</div>
        <div class="stat-value" style="font-size:1.5rem">${fmtShort(r.goalNeeded)}</div>
      </div>
    </div>
  `;

  // CRONOGRAMA TABLE
  const tbody = document.getElementById('month-tbody');
  tbody.innerHTML = '';
  r.rows.forEach((row, i) => {
    const tr = document.createElement('tr');
    const objCompleto = row.acumulado >= r.goalTotal && r.goalTotal > 0;
    tr.innerHTML = `
      <td>${row.mes} ${objCompleto ? '🎉' : ''}</td>
      <td class="td-money td-orange">${fmt(row.renda)}</td>
      <td class="td-money td-red">${fmt(row.dividas)}</td>
      <td class="td-money" style="color:var(--orange-light)">${fmt(row.guardado)}</td>
      <td class="td-money ${row.livre >= 0 ? 'td-green' : 'td-red'}">${fmt(row.livre)}</td>
      <td class="td-money td-orange">${fmt(row.acumulado)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function fmtShort(n) {
  if (isNaN(n)) return '0';
  if (Math.abs(n) >= 1000) return 'R$' + (n/1000).toFixed(1).replace('.',',') + 'k';
  return 'R$' + n.toFixed(0);
}

// ============ EXPORT EXCEL ============
function exportarExcel() {
  if (!calcResult) return;
  const r = calcResult;

  const wb = XLSX.utils.book_new();

  // ---- ABA 1: RESUMO ----
  const resumoData = [
    ['FinanceFlow — Relatório Financeiro', '', '', ''],
    ['Gerado em:', new Date().toLocaleDateString('pt-BR'), '', ''],
    ['', '', '', ''],
    ['RENDA', '', '', ''],
    ['Salário', r.salario, '', ''],
    ['Renda Extra', r.rendaExtra, '', ''],
    ['Total Renda', r.totalRenda, '', ''],
    ['', '', '', ''],
    ['DÍVIDAS', '', '', ''],
    ['Nome', 'Valor Mensal', 'Parcelas', 'Total'],
    ...r.debts.map(d => [d.name + ' (' + categoryLabel(d.category) + ')', d.value, d.months, d.value * d.months]),
    ['', '', '', ''],
    ['TOTAL DÍVIDAS/MÊS', r.totalDebtsMonthly, '', ''],
    ['TOTAL DÍVIDAS (BRUTO)', r.totalDebtsBruto, '', ''],
    ['', '', '', ''],
    ['BALANÇO MENSAL', '', '', ''],
    ['Renda Total', r.totalRenda, '', ''],
    ['(-) Dívidas', r.totalDebtsMonthly, '', ''],
    ['(-) Reserva Objetivo', r.goalMonthly, '', ''],
    ['(=) Saldo Livre', r.saldoLivre, '', ''],
    ['', '', '', ''],
    ['OBJETIVO', '', '', ''],
    ['Nome', r.goalName, '', ''],
    ['Meta Total', r.goalTotal, '', ''],
    ['Já Guardado', r.goalSaved, '', ''],
    ['Falta Guardar', r.goalNeeded, '', ''],
    ['Guardar por Mês', r.goalMonthly, '', ''],
    ['Meses para Concluir', r.goalMonths, '', ''],
    ['Estimativa de Conclusão', r.goalMonths > 0 ? addMonths(r.startDate, r.goalMonths).toLocaleDateString('pt-BR') : 'Não definido', '', ''],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(resumoData);
  ws1['!cols'] = [{wch:30},{wch:18},{wch:15},{wch:18}];
  XLSX.utils.book_append_sheet(wb, ws1, 'Resumo');

  // ---- ABA 2: CRONOGRAMA ----
  const cronoHeader = ['Mês', 'Renda (R$)', 'Dívidas (R$)', 'Guardado Obj. (R$)', 'Saldo Livre (R$)', 'Acumulado Obj. (R$)'];
  const cronoRows = r.rows.map(row => [
    row.mes,
    row.renda,
    row.dividas,
    row.guardado,
    row.livre,
    row.acumulado
  ]);

  const ws2 = XLSX.utils.aoa_to_sheet([cronoHeader, ...cronoRows]);
  ws2['!cols'] = [{wch:10},{wch:14},{wch:14},{wch:18},{wch:16},{wch:18}];
  XLSX.utils.book_append_sheet(wb, ws2, 'Cronograma Mensal');

  // ---- ABA 3: DÍVIDAS ----
  const debtHeader = ['Nome', 'Categoria', 'Valor Mensal (R$)', 'Parcelas Restantes', 'Total a Pagar (R$)'];
  const debtRows = r.debts.map(d => [d.name, categoryLabel(d.category), d.value, d.months, d.value * d.months]);

  const ws3 = XLSX.utils.aoa_to_sheet([debtHeader, ...debtRows, ['', '', '', 'TOTAL:', r.totalDebtsBruto]]);
  ws3['!cols'] = [{wch:25},{wch:18},{wch:18},{wch:20},{wch:18}];
  XLSX.utils.book_append_sheet(wb, ws3, 'Dívidas');

  XLSX.writeFile(wb, `FinanceFlow_${new Date().toISOString().slice(0,10)}.xlsx`);
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Set default month to current
document.getElementById('goal-start').value = new Date().toISOString().slice(0,7);