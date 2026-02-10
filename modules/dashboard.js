/* ============================================
   Dashboard Module
   ============================================ */

let incomeExpenseChart = null;

function renderDashboard() {
    const properties = DB.getAll('properties');
    const transactions = DB.getAll('transactions');

    // Calculate stats
    const totalProperties = properties.length;
    const activeProperties = properties.filter(p => p.status !== 'sold' && p.status !== 'cancelled').length;

    let totalIncome = 0;
    let totalExpense = 0;
    transactions.forEach(t => {
        if (t.type === 'income') totalIncome += parseFloat(t.amount) || 0;
        else totalExpense += parseFloat(t.amount) || 0;
    });

    const totalProfit = totalIncome - totalExpense;

    // Update stat cards
    document.getElementById('stat-total-properties').textContent = totalProperties;
    document.getElementById('stat-active-properties').textContent = activeProperties;
    document.getElementById('stat-total-income').textContent = formatMoney(totalIncome);
    document.getElementById('stat-total-expense').textContent = formatMoney(totalExpense);

    const profitEl = document.getElementById('stat-total-profit');
    profitEl.textContent = formatMoney(totalProfit);
    profitEl.style.color = totalProfit >= 0 ? 'var(--emerald-400)' : 'var(--danger)';

    // Render chart
    renderIncomeExpenseChart(properties, transactions);

    // Render recent properties
    renderRecentProperties(properties);

    // Render recent transactions
    renderRecentTransactions(transactions);
}

function renderIncomeExpenseChart(properties, transactions) {
    const canvas = document.getElementById('chart-income-expense');
    const ctx = canvas.getContext('2d');

    // Group by property
    const labels = [];
    const incomeData = [];
    const expenseData = [];

    if (properties.length === 0) {
        labels.push('ยังไม่มีข้อมูล');
        incomeData.push(0);
        expenseData.push(0);
    } else {
        properties.forEach(p => {
            labels.push(p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name);
            const propTx = transactions.filter(t => t.propertyId === p.id);
            let inc = 0, exp = 0;
            propTx.forEach(t => {
                if (t.type === 'income') inc += parseFloat(t.amount) || 0;
                else exp += parseFloat(t.amount) || 0;
            });
            incomeData.push(inc);
            expenseData.push(exp);
        });
    }

    if (incomeExpenseChart) {
        incomeExpenseChart.destroy();
    }

    incomeExpenseChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'รายรับ',
                    data: incomeData,
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 1,
                    borderRadius: 6,
                },
                {
                    label: 'รายจ่าย',
                    data: expenseData,
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 1,
                    borderRadius: 6,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#94a3b8',
                        font: { family: "'Inter', 'Noto Sans Thai', sans-serif" }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            return ctx.dataset.label + ': ' + formatMoney(ctx.raw);
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#64748b', font: { size: 11 } },
                    grid: { color: 'rgba(255,255,255,0.03)' }
                },
                y: {
                    ticks: {
                        color: '#64748b',
                        callback: val => formatMoney(val)
                    },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                }
            }
        }
    });
}

function renderRecentProperties(properties) {
    const container = document.getElementById('recent-properties');
    if (properties.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-home"></i>
                <p>ยังไม่มีทรัพย์สิน</p>
                <button class="btn btn-primary btn-sm" onclick="navigateTo('properties')">เพิ่มทรัพย์สิน</button>
            </div>`;
        return;
    }

    const recent = [...properties].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5);
    container.innerHTML = recent.map(p => {
        const transactions = DB.getAll('transactions').filter(t => t.propertyId === p.id);
        let expense = 0;
        transactions.forEach(t => { if (t.type === 'expense') expense += parseFloat(t.amount) || 0; });
        return `
            <div class="transaction-item" style="cursor:pointer" onclick="navigateTo('properties'); setTimeout(() => { if(typeof showPropertyDetail === 'function') showPropertyDetail('${p.id}'); }, 100);">
                <div class="transaction-icon" style="background: var(--info-bg); color: var(--info); font-size: 1.2rem;">🏠</div>
                <div class="transaction-info">
                    <div class="transaction-desc">${p.name}</div>
                    <div class="transaction-meta">${getStatusBadge(p.status)}</div>
                </div>
                <div class="transaction-amount expense">${formatMoney(expense)}</div>
            </div>`;
    }).join('');
}

function renderRecentTransactions(transactions) {
    const container = document.getElementById('recent-transactions');
    if (transactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <p>ยังไม่มีรายการ</p>
            </div>`;
        return;
    }

    const recent = [...transactions].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)).slice(0, 8);
    container.innerHTML = recent.map(t => {
        const isIncome = t.type === 'income';
        const property = DB.getById('properties', t.propertyId);
        return `
            <div class="transaction-item">
                <div class="transaction-icon ${isIncome ? 'income' : 'expense'}">
                    <i class="fas ${isIncome ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                </div>
                <div class="transaction-info">
                    <div class="transaction-desc">${t.description || getCategoryLabel(t.category)}</div>
                    <div class="transaction-meta">
                        <span>${property ? property.name : '-'}</span>
                        <span>${formatDateShort(t.date)}</span>
                    </div>
                </div>
                <div class="transaction-amount ${isIncome ? 'income' : 'expense'}">
                    ${isIncome ? '+' : '-'}${formatMoney(t.amount)}
                </div>
            </div>`;
    }).join('');
}
