/* ============================================
   Reports Module
   ============================================ */

function renderReports() {
    const container = document.getElementById('page-reports');
    const properties = DB.getAll('properties');
    const transactions = DB.getAll('transactions');

    // Overall stats
    let totalIncome = 0, totalExpense = 0;
    transactions.forEach(t => {
        if (t.type === 'income') totalIncome += parseFloat(t.amount) || 0;
        else totalExpense += parseFloat(t.amount) || 0;
    });
    const totalProfit = totalIncome - totalExpense;

    // Per-property data
    const propertyData = properties.map(p => {
        const propTx = transactions.filter(t => t.propertyId === p.id);
        let income = 0, expense = 0;
        const categories = {};
        propTx.forEach(t => {
            const amt = parseFloat(t.amount) || 0;
            if (t.type === 'income') income += amt;
            else {
                expense += amt;
                categories[t.category] = (categories[t.category] || 0) + amt;
            }
        });
        return {
            ...p,
            income,
            expense,
            profit: income - expense,
            roi: expense > 0 ? ((income - expense) / expense * 100).toFixed(1) : 0,
            categories
        };
    });

    // Category totals
    const categoryTotals = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
        const amt = parseFloat(t.amount) || 0;
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amt;
    });

    container.innerHTML = `
        <div class="section-header">
            <h3><i class="fas fa-chart-bar" style="color:var(--emerald-400)"></i> รายงานสรุป</h3>
            <div style="display:flex; gap:8px">
                <button class="btn btn-secondary btn-sm" onclick="exportCSV()">
                    <i class="fas fa-file-csv"></i> Export CSV
                </button>
                <button class="btn btn-secondary btn-sm" onclick="document.getElementById('export-btn').click()">
                    <i class="fas fa-download"></i> Export JSON
                </button>
            </div>
        </div>

        <!-- Overall Summary -->
        <div class="report-summary">
            <div class="report-metric">
                <div class="report-metric-value">${properties.length}</div>
                <div class="report-metric-label">ทรัพย์สินทั้งหมด</div>
            </div>
            <div class="report-metric">
                <div class="report-metric-value text-success">${formatMoney(totalIncome)}</div>
                <div class="report-metric-label">รายรับรวม</div>
            </div>
            <div class="report-metric">
                <div class="report-metric-value text-danger">${formatMoney(totalExpense)}</div>
                <div class="report-metric-label">รายจ่ายรวม</div>
            </div>
            <div class="report-metric">
                <div class="report-metric-value" style="color: ${totalProfit >= 0 ? 'var(--emerald-400)' : 'var(--danger)'}">
                    ${formatMoney(totalProfit)}
                </div>
                <div class="report-metric-label">กำไร/ขาดทุนรวม</div>
            </div>
        </div>

        <!-- Charts Row -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:24px">
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-chart-pie"></i> สัดส่วนค่าใช้จ่าย</h3></div>
                <div class="card-body" style="height:300px"><canvas id="report-pie-chart"></canvas></div>
            </div>
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-chart-bar"></i> กำไร/ขาดทุน ต่อทรัพย์</h3></div>
                <div class="card-body" style="height:300px"><canvas id="report-profit-chart"></canvas></div>
            </div>
        </div>

        <!-- Property Table -->
        <div class="card">
            <div class="card-header">
                <h3><i class="fas fa-table"></i> สรุปทรัพย์สินทั้งหมด</h3>
            </div>
            <div class="card-body" style="overflow-x:auto">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ทรัพย์สิน</th>
                            <th>สถานะ</th>
                            <th>ราคาซื้อ</th>
                            <th>งบรีโนเวท</th>
                            <th>จ่ายจริง</th>
                            <th>รายรับ</th>
                            <th>กำไร/ขาดทุน</th>
                            <th>ROI</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${propertyData.length === 0
                            ? '<tr><td colspan="8" class="text-center text-muted" style="padding:30px">ยังไม่มีข้อมูล</td></tr>'
                            : propertyData.map(p => `
                            <tr>
                                <td><strong>${p.name}</strong></td>
                                <td>${getStatusBadge(p.status)}</td>
                                <td>${formatMoney(p.buyPrice)}</td>
                                <td>${formatMoney(p.budget)}</td>
                                <td class="text-danger">${formatMoney(p.expense)}</td>
                                <td class="text-success">${formatMoney(p.income)}</td>
                                <td style="color: ${p.profit >= 0 ? 'var(--emerald-400)' : 'var(--danger)'}; font-weight:700">
                                    ${formatMoney(p.profit)}
                                </td>
                                <td>
                                    <span class="badge ${parseFloat(p.roi) > 0 ? 'badge-success' : parseFloat(p.roi) < 0 ? 'badge-danger' : 'badge-default'}">
                                        ${p.roi}%
                                    </span>
                                </td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Category Breakdown -->
        <div class="card mt-4">
            <div class="card-header">
                <h3><i class="fas fa-list"></i> ค่าใช้จ่ายตามหมวดหมู่</h3>
            </div>
            <div class="card-body">
                ${Object.keys(categoryTotals).length === 0
                    ? '<div class="text-center text-muted" style="padding:20px">ยังไม่มีข้อมูล</div>'
                    : Object.entries(categoryTotals)
                        .sort((a, b) => b[1] - a[1])
                        .map(([cat, amount]) => {
                            const pct = totalExpense > 0 ? (amount / totalExpense * 100).toFixed(1) : 0;
                            return `
                            <div style="display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--border-color)">
                                <div class="transaction-icon expense" style="width:36px; height:36px">
                                    <i class="fas ${getCategoryIcon(cat)}" style="font-size:0.85rem"></i>
                                </div>
                                <div style="flex:1">
                                    <div style="font-weight:500; font-size:0.9rem">${getCategoryLabel(cat)}</div>
                                    <div style="background:var(--bg-input); height:6px; border-radius:3px; margin-top:4px; overflow:hidden">
                                        <div style="background: var(--danger); height:100%; width:${pct}%; border-radius:3px; transition:width 0.5s"></div>
                                    </div>
                                </div>
                                <div style="text-align:right">
                                    <div style="font-weight:700; color:var(--danger)">${formatMoney(amount)}</div>
                                    <div style="font-size:0.75rem; color:var(--text-muted)">${pct}%</div>
                                </div>
                            </div>`;
                        }).join('')}
            </div>
        </div>

        <!-- Budget vs Actual (per property) -->
        <div class="card mt-4">
            <div class="card-header">
                <h3><i class="fas fa-balance-scale"></i> งบประมาณ vs จ่ายจริง</h3>
            </div>
            <div class="card-body">
                ${propertyData.filter(p => p.budget > 0).length === 0
                    ? '<div class="text-center text-muted" style="padding:20px">ยังไม่มีข้อมูลงบประมาณ</div>'
                    : propertyData.filter(p => p.budget > 0).map(p => {
                        const pct = (p.expense / p.budget * 100).toFixed(0);
                        const overBudget = p.expense > p.budget;
                        return `
                        <div style="padding:12px 0; border-bottom:1px solid var(--border-color)">
                            <div class="flex-between mb-2">
                                <span style="font-weight:600">${p.name}</span>
                                <span class="badge ${overBudget ? 'badge-danger' : 'badge-success'}">
                                    ${overBudget ? '⚠️ เกินงบ' : '✅ ในงบ'} (${pct}%)
                                </span>
                            </div>
                            <div style="display:flex; gap:20px; font-size:0.85rem; color:var(--text-secondary)">
                                <span>งบ: ${formatMoney(p.budget)}</span>
                                <span>จ่าย: <span style="color:${overBudget ? 'var(--danger)' : 'var(--emerald-400)'}">${formatMoney(p.expense)}</span></span>
                                <span>เหลือ: ${formatMoney(p.budget - p.expense)}</span>
                            </div>
                            <div style="background:var(--bg-input); height:8px; border-radius:4px; margin-top:8px; overflow:hidden">
                                <div style="background: ${overBudget ? 'var(--danger)' : 'var(--gradient-primary)'}; height:100%; width:${Math.min(pct, 100)}%; border-radius:4px; transition:width 0.5s"></div>
                            </div>
                        </div>`;
                    }).join('')}
            </div>
        </div>
    `;

    // Render charts
    renderPieChart(categoryTotals);
    renderProfitChart(propertyData);
}

let pieChartInstance = null;
let profitChartInstance = null;

function renderPieChart(categoryTotals) {
    const canvas = document.getElementById('report-pie-chart');
    if (!canvas) return;

    if (pieChartInstance) pieChartInstance.destroy();

    const labels = Object.keys(categoryTotals).map(c => getCategoryLabel(c));
    const data = Object.values(categoryTotals);
    const colors = [
        '#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6',
        '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#6366f1'
    ];

    if (labels.length === 0) {
        labels.push('ยังไม่มีข้อมูล');
        data.push(1);
    }

    pieChartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors.slice(0, data.length),
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#94a3b8',
                        font: { size: 11, family: "'Inter', 'Noto Sans Thai', sans-serif" },
                        padding: 10,
                        usePointStyle: true,
                        pointStyleWidth: 10
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((ctx.raw / total) * 100).toFixed(1);
                            return `${ctx.label}: ${formatMoney(ctx.raw)} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

function renderProfitChart(propertyData) {
    const canvas = document.getElementById('report-profit-chart');
    if (!canvas) return;

    if (profitChartInstance) profitChartInstance.destroy();

    const labels = propertyData.map(p => p.name.length > 12 ? p.name.substring(0, 12) + '...' : p.name);
    const data = propertyData.map(p => p.profit);

    if (labels.length === 0) {
        labels.push('ยังไม่มีข้อมูล');
        data.push(0);
    }

    profitChartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'กำไร/ขาดทุน',
                data,
                backgroundColor: data.map(v => v >= 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)'),
                borderColor: data.map(v => v >= 0 ? '#10b981' : '#ef4444'),
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => formatMoney(ctx.raw)
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#64748b', callback: val => formatMoney(val) },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                y: {
                    ticks: { color: '#94a3b8', font: { size: 11 } },
                    grid: { display: false }
                }
            }
        }
    });
}

function exportCSV() {
    const transactions = DB.getAll('transactions');
    const properties = DB.getAll('properties');

    if (transactions.length === 0) {
        showToast('ไม่มีข้อมูลสำหรับ Export', 'error');
        return;
    }

    // BOM for UTF-8
    let csv = '\uFEFF';
    csv += 'วันที่,ทรัพย์สิน,ประเภท,หมวดหมู่,รายละเอียด,จำนวนเงิน\n';

    transactions
        .sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt))
        .forEach(t => {
            const property = properties.find(p => p.id === t.propertyId);
            const row = [
                t.date || '',
                property ? `"${property.name}"` : '',
                t.type === 'income' ? 'รายรับ' : 'รายจ่าย',
                `"${getCategoryLabel(t.category)}"`,
                `"${t.description || ''}"`,
                t.type === 'income' ? t.amount : -t.amount
            ];
            csv += row.join(',') + '\n';
        });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `renovatetrack_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export CSV สำเร็จ! 📊');
}
