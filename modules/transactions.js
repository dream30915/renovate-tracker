/* ============================================
   Transactions Module
   ============================================ */

function renderTransactions() {
    const container = document.getElementById('page-transactions');
    const transactions = DB.getAll('transactions');
    const properties = DB.getAll('properties');

    container.innerHTML = `
        <div class="section-header">
            <h3><i class="fas fa-exchange-alt" style="color:var(--emerald-400)"></i> รายรับ-รายจ่ายทั้งหมด</h3>
            <div style="display:flex; gap:8px">
                <button class="btn btn-primary btn-sm" onclick="showAddTransactionForm('expense')">
                    <i class="fas fa-minus"></i> เพิ่มรายจ่าย
                </button>
                <button class="btn btn-secondary btn-sm" onclick="showAddTransactionForm('income')">
                    <i class="fas fa-plus"></i> เพิ่มรายรับ
                </button>
            </div>
        </div>

        <div class="filters-bar">
            <select id="tx-filter-property">
                <option value="">ทุกทรัพย์</option>
                ${properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
            </select>
            <select id="tx-filter-type">
                <option value="">ทุกประเภท</option>
                <option value="income">รายรับ</option>
                <option value="expense">รายจ่าย</option>
            </select>
            <select id="tx-filter-category">
                <option value="">ทุกหมวดหมู่</option>
                <optgroup label="รายจ่าย">
                    <option value="purchase">ค่าซื้อทรัพย์</option>
                    <option value="material">ค่าวัสดุ</option>
                    <option value="labor">ค่าแรง</option>
                    <option value="utility">ค่าน้ำ/ไฟ</option>
                    <option value="transfer">ค่าโอน/ค่าธรรมเนียม</option>
                    <option value="commission">ค่านายหน้า</option>
                    <option value="tax">ภาษี</option>
                    <option value="other_expense">อื่นๆ</option>
                </optgroup>
                <optgroup label="รายรับ">
                    <option value="sale">ขายทรัพย์</option>
                    <option value="rental">ค่าเช่า</option>
                    <option value="other_income">อื่นๆ</option>
                </optgroup>
            </select>
            <input type="date" id="tx-filter-from" title="จากวันที่">
            <input type="date" id="tx-filter-to" title="ถึงวันที่">
        </div>

        <div class="card">
            <div class="card-body" id="tx-list"></div>
        </div>

        <div id="tx-summary" style="margin-top:16px"></div>
    `;

    renderTransactionList();

    // Filters
    ['tx-filter-property', 'tx-filter-type', 'tx-filter-category', 'tx-filter-from', 'tx-filter-to'].forEach(id => {
        document.getElementById(id).addEventListener('change', renderTransactionList);
    });
}

function renderTransactionList() {
    let transactions = DB.getAll('transactions');

    // Apply filters
    const filterProp = document.getElementById('tx-filter-property')?.value;
    const filterType = document.getElementById('tx-filter-type')?.value;
    const filterCat = document.getElementById('tx-filter-category')?.value;
    const filterFrom = document.getElementById('tx-filter-from')?.value;
    const filterTo = document.getElementById('tx-filter-to')?.value;

    if (filterProp) transactions = transactions.filter(t => t.propertyId === filterProp);
    if (filterType) transactions = transactions.filter(t => t.type === filterType);
    if (filterCat) transactions = transactions.filter(t => t.category === filterCat);
    if (filterFrom) transactions = transactions.filter(t => t.date >= filterFrom);
    if (filterTo) transactions = transactions.filter(t => t.date <= filterTo);

    // Sort by date desc
    transactions.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    const container = document.getElementById('tx-list');

    if (transactions.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-receipt"></i><p>ไม่พบรายการ</p></div>';
        document.getElementById('tx-summary').innerHTML = '';
        return;
    }

    container.innerHTML = transactions.map(t => {
        const isIncome = t.type === 'income';
        const property = DB.getById('properties', t.propertyId);
        return `
        <div class="transaction-item">
            <div class="transaction-icon ${isIncome ? 'income' : 'expense'}">
                <i class="fas ${getCategoryIcon(t.category)}"></i>
            </div>
            <div class="transaction-info">
                <div class="transaction-desc">${t.description || getCategoryLabel(t.category)}</div>
                <div class="transaction-meta">
                    <span>${property ? property.name : 'ไม่ระบุ'}</span>
                    <span>${getCategoryLabel(t.category)}</span>
                    <span>${formatDateShort(t.date)}</span>
                </div>
            </div>
            <div class="transaction-amount ${isIncome ? 'income' : 'expense'}">
                ${isIncome ? '+' : '-'}${formatMoney(t.amount)}
            </div>
            ${Auth.isManager() ? `
            <div style="display:flex; gap:2px">
                <button class="btn-icon" onclick="showEditTransactionForm('${t.id}')" title="แก้ไข">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon" onclick="deleteTransactionGlobal('${t.id}')" title="ลบ">
                    <i class="fas fa-trash" style="color:var(--danger)"></i>
                </button>
            </div>` : ''}
        </div>`;
    }).join('');

    // Summary
    let totalIncome = 0, totalExpense = 0;
    transactions.forEach(t => {
        if (t.type === 'income') totalIncome += parseFloat(t.amount) || 0;
        else totalExpense += parseFloat(t.amount) || 0;
    });

    document.getElementById('tx-summary').innerHTML = `
        <div class="report-summary">
            <div class="report-metric">
                <div class="report-metric-value text-success">${formatMoney(totalIncome)}</div>
                <div class="report-metric-label">รายรับ (${transactions.filter(t => t.type === 'income').length} รายการ)</div>
            </div>
            <div class="report-metric">
                <div class="report-metric-value text-danger">${formatMoney(totalExpense)}</div>
                <div class="report-metric-label">รายจ่าย (${transactions.filter(t => t.type === 'expense').length} รายการ)</div>
            </div>
            <div class="report-metric">
                <div class="report-metric-value" style="color: ${totalIncome - totalExpense >= 0 ? 'var(--emerald-400)' : 'var(--danger)'}">${formatMoney(totalIncome - totalExpense)}</div>
                <div class="report-metric-label">สุทธิ (${transactions.length} รายการ)</div>
            </div>
        </div>
    `;
}

function showAddTransactionForm(type, propertyId) {
    const properties = DB.getAll('properties');
    const isIncome = type === 'income';

    const categories = isIncome
        ? [
            { value: 'sale', label: 'ขายทรัพย์' },
            { value: 'rental', label: 'ค่าเช่า' },
            { value: 'other_income', label: 'รายรับอื่นๆ' }
        ]
        : [
            { value: 'purchase', label: 'ค่าซื้อทรัพย์' },
            { value: 'material', label: 'ค่าวัสดุ' },
            { value: 'labor', label: 'ค่าแรง' },
            { value: 'utility', label: 'ค่าน้ำ/ไฟ' },
            { value: 'transfer', label: 'ค่าโอน/ค่าธรรมเนียม' },
            { value: 'commission', label: 'ค่านายหน้า' },
            { value: 'tax', label: 'ภาษี' },
            { value: 'other_expense', label: 'ค่าใช้จ่ายอื่นๆ' }
        ];

    const title = isIncome
        ? '<i class="fas fa-arrow-up" style="color:var(--emerald-400)"></i> เพิ่มรายรับ'
        : '<i class="fas fa-arrow-down" style="color:var(--danger)"></i> เพิ่มรายจ่าย';

    const html = `
        <div class="form-group">
            <label>ทรัพย์สิน *</label>
            <select id="tx-property">
                <option value="">-- เลือกทรัพย์สิน --</option>
                ${properties.map(p => `<option value="${p.id}" ${p.id === propertyId ? 'selected' : ''}>${p.name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>หมวดหมู่ *</label>
            <select id="tx-category">
                ${categories.map(c => `<option value="${c.value}">${c.label}</option>`).join('')}
            </select>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>จำนวนเงิน (บาท) *</label>
                <input type="number" id="tx-amount" placeholder="0" min="0">
            </div>
            <div class="form-group">
                <label>วันที่</label>
                <input type="date" id="tx-date" value="${new Date().toISOString().slice(0, 10)}">
            </div>
        </div>
        <div class="form-group">
            <label>รายละเอียด</label>
            <input type="text" id="tx-description" placeholder="รายละเอียดเพิ่มเติม">
        </div>
        <div class="form-group">
            <label>หมายเหตุ</label>
            <textarea id="tx-notes" placeholder="บันทึกเพิ่มเติม"></textarea>
        </div>
        <input type="hidden" id="tx-type" value="${type}">
        <div class="modal-actions">
            <button class="btn btn-ghost" onclick="closeModal()">ยกเลิก</button>
            <button class="btn ${isIncome ? 'btn-primary' : 'btn-danger'}" onclick="saveTransaction()">
                <i class="fas fa-save"></i> บันทึก
            </button>
        </div>
    `;

    showModal(title, html);
}

function showEditTransactionForm(txId) {
    const tx = DB.getById('transactions', txId);
    if (!tx) return;

    const properties = DB.getAll('properties');
    const isIncome = tx.type === 'income';

    const allCategories = [
        { value: 'purchase', label: 'ค่าซื้อทรัพย์', type: 'expense' },
        { value: 'material', label: 'ค่าวัสดุ', type: 'expense' },
        { value: 'labor', label: 'ค่าแรง', type: 'expense' },
        { value: 'utility', label: 'ค่าน้ำ/ไฟ', type: 'expense' },
        { value: 'transfer', label: 'ค่าโอน/ค่าธรรมเนียม', type: 'expense' },
        { value: 'commission', label: 'ค่านายหน้า', type: 'expense' },
        { value: 'tax', label: 'ภาษี', type: 'expense' },
        { value: 'other_expense', label: 'ค่าใช้จ่ายอื่นๆ', type: 'expense' },
        { value: 'sale', label: 'ขายทรัพย์', type: 'income' },
        { value: 'rental', label: 'ค่าเช่า', type: 'income' },
        { value: 'other_income', label: 'รายรับอื่นๆ', type: 'income' }
    ];

    const categories = allCategories.filter(c => c.type === tx.type);

    const html = `
        <div class="form-group">
            <label>ทรัพย์สิน *</label>
            <select id="tx-property">
                <option value="">-- เลือก --</option>
                ${properties.map(p => `<option value="${p.id}" ${p.id === tx.propertyId ? 'selected' : ''}>${p.name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>หมวดหมู่ *</label>
            <select id="tx-category">
                ${categories.map(c => `<option value="${c.value}" ${c.value === tx.category ? 'selected' : ''}>${c.label}</option>`).join('')}
            </select>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>จำนวนเงิน (บาท) *</label>
                <input type="number" id="tx-amount" value="${tx.amount}" min="0">
            </div>
            <div class="form-group">
                <label>วันที่</label>
                <input type="date" id="tx-date" value="${tx.date || ''}">
            </div>
        </div>
        <div class="form-group">
            <label>รายละเอียด</label>
            <input type="text" id="tx-description" value="${tx.description || ''}">
        </div>
        <div class="form-group">
            <label>หมายเหตุ</label>
            <textarea id="tx-notes">${tx.notes || ''}</textarea>
        </div>
        <input type="hidden" id="tx-type" value="${tx.type}">
        <input type="hidden" id="tx-edit-id" value="${txId}">
        <div class="modal-actions">
            <button class="btn btn-ghost" onclick="closeModal()">ยกเลิก</button>
            <button class="btn btn-primary" onclick="saveTransaction()">
                <i class="fas fa-save"></i> บันทึก
            </button>
        </div>
    `;

    showModal('<i class="fas fa-edit"></i> แก้ไขรายการ', html);
}

function saveTransaction() {
    const propertyId = document.getElementById('tx-property').value;
    const category = document.getElementById('tx-category').value;
    const amount = parseFloat(document.getElementById('tx-amount').value);
    const date = document.getElementById('tx-date').value;
    const description = document.getElementById('tx-description').value.trim();
    const notes = document.getElementById('tx-notes').value.trim();
    const type = document.getElementById('tx-type').value;
    const editId = document.getElementById('tx-edit-id')?.value;

    if (!propertyId) {
        showToast('กรุณาเลือกทรัพย์สิน', 'error');
        return;
    }
    if (!amount || amount <= 0) {
        showToast('กรุณากรอกจำนวนเงิน', 'error');
        return;
    }

    const data = {
        propertyId,
        type,
        category,
        amount,
        date: date || new Date().toISOString().slice(0, 10),
        description,
        notes,
        createdBy: Auth.currentUser.id
    };

    if (editId) {
        DB.update('transactions', editId, data);
        showToast('แก้ไขรายการสำเร็จ! ✏️');
    } else {
        DB.add('transactions', data);
        showToast(type === 'income' ? 'เพิ่มรายรับสำเร็จ! 💰' : 'เพิ่มรายจ่ายสำเร็จ! 📝');
    }

    closeModal();

    // Refresh current view
    if (currentPage === 'transactions') renderTransactionList();
    else if (currentPage === 'properties' && currentPropertyView) showPropertyDetail(currentPropertyView);
}

async function deleteTransactionGlobal(txId) {
    const confirmed = await showConfirm('ลบรายการ', 'คุณแน่ใจหรือไม่ที่จะลบรายการนี้?');
    if (!confirmed) return;

    DB.remove('transactions', txId);
    showToast('ลบรายการสำเร็จ', 'info');
    renderTransactionList();
}
