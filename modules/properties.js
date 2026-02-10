/* ============================================
   Properties Module
   ============================================ */

let currentPropertyView = null; // 'list' or property id

function renderProperties() {
    currentPropertyView = null;
    renderPropertyList();
}

function renderPropertyList() {
    const container = document.getElementById('page-properties');
    const properties = DB.getAll('properties');

    container.innerHTML = `
        <div class="section-header">
            <h3><i class="fas fa-home" style="color:var(--emerald-400)"></i> ทรัพย์สินทั้งหมด (${properties.length})</h3>
            <div style="display:flex; gap:8px">
                <select id="property-filter-status" class="btn btn-secondary btn-sm" style="appearance:auto;">
                    <option value="">ทุกสถานะ</option>
                    <option value="surveying">🔍 สำรวจ</option>
                    <option value="purchased">💰 ซื้อแล้ว</option>
                    <option value="renovating">🔨 กำลังรีโนเวท</option>
                    <option value="listing">📸 ลงประกาศ</option>
                    <option value="sold">✅ ขายแล้ว</option>
                </select>
                ${Auth.isManager() ? '<button class="btn btn-primary btn-sm" onclick="showAddPropertyForm()"><i class="fas fa-plus"></i> เพิ่มทรัพย์สิน</button>' : ''}
            </div>
        </div>
        <div class="property-grid" id="property-grid"></div>
    `;

    renderPropertyCards(properties);

    // Filter
    document.getElementById('property-filter-status').addEventListener('change', (e) => {
        const filtered = e.target.value
            ? properties.filter(p => p.status === e.target.value)
            : properties;
        renderPropertyCards(filtered);
    });
}

function renderPropertyCards(properties) {
    const grid = document.getElementById('property-grid');

    if (properties.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1">
                <i class="fas fa-home"></i>
                <p>ยังไม่มีทรัพย์สิน</p>
                ${Auth.isManager() ? '<button class="btn btn-primary btn-sm" onclick="showAddPropertyForm()">เพิ่มทรัพย์สินแรก</button>' : ''}
            </div>`;
        return;
    }

    grid.innerHTML = properties.map(p => {
        const transactions = DB.getAll('transactions').filter(t => t.propertyId === p.id);
        let income = 0, expense = 0;
        transactions.forEach(t => {
            if (t.type === 'income') income += parseFloat(t.amount) || 0;
            else expense += parseFloat(t.amount) || 0;
        });
        const profit = income - expense;

        return `
            <div class="property-card" onclick="showPropertyDetail('${p.id}')">
                <div class="property-card-img">
                    ${p.image ? `<img src="${p.image}" alt="${p.name}">` : '<i class="fas fa-home"></i>'}
                    <div class="property-card-status">${getStatusBadge(p.status)}</div>
                </div>
                <div class="property-card-body">
                    <div class="property-card-title">${p.name}</div>
                    <div class="property-card-address"><i class="fas fa-map-marker-alt"></i> ${p.address || 'ไม่ระบุที่อยู่'}</div>
                    <div class="property-card-stats">
                        <div class="property-stat">
                            <div class="property-stat-value income">${formatMoney(income)}</div>
                            <div class="property-stat-label">รายรับ</div>
                        </div>
                        <div class="property-stat">
                            <div class="property-stat-value expense">${formatMoney(expense)}</div>
                            <div class="property-stat-label">รายจ่าย</div>
                        </div>
                        <div class="property-stat" style="grid-column: span 2">
                            <div class="property-stat-value" style="color: ${profit >= 0 ? 'var(--emerald-400)' : 'var(--danger)'}">${formatMoney(profit)}</div>
                            <div class="property-stat-label">กำไร/ขาดทุน</div>
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

function showAddPropertyForm(editId) {
    const existing = editId ? DB.getById('properties', editId) : null;
    const title = existing ? '<i class="fas fa-edit"></i> แก้ไขทรัพย์สิน' : '<i class="fas fa-plus-circle"></i> เพิ่มทรัพย์สิน';

    const html = `
        <div class="form-group">
            <label>ชื่อทรัพย์สิน *</label>
            <input type="text" id="prop-name" value="${existing ? existing.name : ''}" placeholder="เช่น บ้าน ซ.รามคำแหง 24">
        </div>
        <div class="form-group">
            <label>ที่อยู่</label>
            <textarea id="prop-address" placeholder="ที่อยู่ทรัพย์สิน">${existing ? existing.address || '' : ''}</textarea>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>สถานะ</label>
                <select id="prop-status">
                    <option value="surveying" ${existing?.status === 'surveying' ? 'selected' : ''}>🔍 สำรวจ</option>
                    <option value="purchased" ${existing?.status === 'purchased' ? 'selected' : ''}>💰 ซื้อแล้ว</option>
                    <option value="renovating" ${existing?.status === 'renovating' ? 'selected' : ''}>🔨 กำลังรีโนเวท</option>
                    <option value="listing" ${existing?.status === 'listing' ? 'selected' : ''}>📸 ลงประกาศ</option>
                    <option value="sold" ${existing?.status === 'sold' ? 'selected' : ''}>✅ ขายแล้ว</option>
                    <option value="cancelled" ${existing?.status === 'cancelled' ? 'selected' : ''}>❌ ยกเลิก</option>
                </select>
            </div>
            <div class="form-group">
                <label>ประเภท</label>
                <select id="prop-type">
                    <option value="house" ${existing?.type === 'house' ? 'selected' : ''}>🏠 บ้านเดี่ยว</option>
                    <option value="townhouse" ${existing?.type === 'townhouse' ? 'selected' : ''}>🏘️ ทาวน์เฮาส์</option>
                    <option value="condo" ${existing?.type === 'condo' ? 'selected' : ''}>🏢 คอนโด</option>
                    <option value="land" ${existing?.type === 'land' ? 'selected' : ''}>🌿 ที่ดิน</option>
                    <option value="commercial" ${existing?.type === 'commercial' ? 'selected' : ''}>🏪 อาคารพาณิชย์</option>
                    <option value="other" ${existing?.type === 'other' ? 'selected' : ''}>📦 อื่นๆ</option>
                </select>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>ราคาซื้อ (บาท)</label>
                <input type="number" id="prop-buy-price" value="${existing ? existing.buyPrice || '' : ''}" placeholder="0">
            </div>
            <div class="form-group">
                <label>ราคาขาย/ตั้งราคา (บาท)</label>
                <input type="number" id="prop-sell-price" value="${existing ? existing.sellPrice || '' : ''}" placeholder="0">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>วันที่ซื้อ</label>
                <input type="date" id="prop-buy-date" value="${existing ? existing.buyDate || '' : ''}">
            </div>
            <div class="form-group">
                <label>วันที่ขาย</label>
                <input type="date" id="prop-sell-date" value="${existing ? existing.sellDate || '' : ''}">
            </div>
        </div>
        <div class="form-group">
            <label>งบประมาณรีโนเวท (บาท)</label>
            <input type="number" id="prop-budget" value="${existing ? existing.budget || '' : ''}" placeholder="0">
        </div>
        <div class="form-group">
            <label>หมายเหตุ</label>
            <textarea id="prop-notes" placeholder="บันทึกเพิ่มเติม">${existing ? existing.notes || '' : ''}</textarea>
        </div>
        <div class="form-group">
            <label>URL รูปภาพ</label>
            <input type="url" id="prop-image" value="${existing ? existing.image || '' : ''}" placeholder="https://example.com/image.jpg">
        </div>
        <div class="modal-actions">
            <button class="btn btn-ghost" onclick="closeModal()">ยกเลิก</button>
            <button class="btn btn-primary" onclick="saveProperty('${editId || ''}')">
                <i class="fas fa-save"></i> บันทึก
            </button>
        </div>
    `;

    showModal(title, html);
}

function saveProperty(editId) {
    const name = document.getElementById('prop-name').value.trim();
    if (!name) {
        showToast('กรุณากรอกชื่อทรัพย์สิน', 'error');
        return;
    }

    const data = {
        name,
        address: document.getElementById('prop-address').value.trim(),
        status: document.getElementById('prop-status').value,
        type: document.getElementById('prop-type').value,
        buyPrice: parseFloat(document.getElementById('prop-buy-price').value) || 0,
        sellPrice: parseFloat(document.getElementById('prop-sell-price').value) || 0,
        buyDate: document.getElementById('prop-buy-date').value,
        sellDate: document.getElementById('prop-sell-date').value,
        budget: parseFloat(document.getElementById('prop-budget').value) || 0,
        notes: document.getElementById('prop-notes').value.trim(),
        image: document.getElementById('prop-image').value.trim(),
    };

    if (editId) {
        DB.update('properties', editId, data);
        showToast('แก้ไขทรัพย์สินสำเร็จ! ✏️');

        // Auto-create purchase transaction if buy price > 0 and status changed to purchased
        if (data.buyPrice > 0 && data.status === 'purchased') {
            const existing = DB.getAll('transactions').find(t => t.propertyId === editId && t.category === 'purchase');
            if (!existing) {
                DB.add('transactions', {
                    propertyId: editId,
                    type: 'expense',
                    category: 'purchase',
                    amount: data.buyPrice,
                    description: 'ค่าซื้อทรัพย์ - ' + name,
                    date: data.buyDate || new Date().toISOString().slice(0, 10),
                    createdBy: Auth.currentUser.id
                });
            }
        }
    } else {
        const newProp = DB.add('properties', data);

        // Auto-create workflow checklist
        DB.add('workflows', {
            propertyId: newProp.id,
            steps: getDefaultWorkflowSteps()
        });

        // Auto-create purchase transaction if buy price > 0
        if (data.buyPrice > 0) {
            DB.add('transactions', {
                propertyId: newProp.id,
                type: 'expense',
                category: 'purchase',
                amount: data.buyPrice,
                description: 'ค่าซื้อทรัพย์ - ' + name,
                date: data.buyDate || new Date().toISOString().slice(0, 10),
                createdBy: Auth.currentUser.id
            });
        }

        showToast('เพิ่มทรัพย์สินสำเร็จ! 🏠');
    }

    closeModal();
    renderPropertyList();
}

function showPropertyDetail(propertyId) {
    currentPropertyView = propertyId;
    const property = DB.getById('properties', propertyId);
    if (!property) return;

    const container = document.getElementById('page-properties');
    const transactions = DB.getAll('transactions').filter(t => t.propertyId === propertyId);
    const workflow = DB.getAll('workflows').find(w => w.propertyId === propertyId);

    let income = 0, expense = 0;
    transactions.forEach(t => {
        if (t.type === 'income') income += parseFloat(t.amount) || 0;
        else expense += parseFloat(t.amount) || 0;
    });
    const profit = income - expense;

    container.innerHTML = `
        <div style="margin-bottom:16px">
            <button class="btn btn-ghost" onclick="renderPropertyList()">
                <i class="fas fa-arrow-left"></i> กลับ
            </button>
        </div>

        <div class="property-detail-header">
            <div class="property-detail-info">
                <div class="property-detail-title">${property.name}</div>
                <div class="property-detail-address">
                    <i class="fas fa-map-marker-alt" style="color:var(--emerald-400)"></i> ${property.address || 'ไม่ระบุที่อยู่'}
                </div>
                <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap">
                    ${getStatusBadge(property.status)}
                    <span class="badge badge-default">${getPropertyTypeLabel(property.type)}</span>
                    ${property.buyDate ? `<span class="text-muted" style="font-size:0.8rem">ซื้อ: ${formatDate(property.buyDate)}</span>` : ''}
                </div>
            </div>
            <div class="property-detail-actions">
                ${Auth.isManager() ? `
                    <button class="btn btn-secondary btn-sm" onclick="showAddPropertyForm('${propertyId}')">
                        <i class="fas fa-edit"></i> แก้ไข
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteProperty('${propertyId}')">
                        <i class="fas fa-trash"></i> ลบ
                    </button>
                ` : ''}
            </div>
        </div>

        <div class="dashboard-stats" style="margin-bottom:20px">
            <div class="stat-card stat-income" style="flex:1">
                <div class="stat-icon"><i class="fas fa-arrow-up"></i></div>
                <div class="stat-info">
                    <span class="stat-value">${formatMoney(income)}</span>
                    <span class="stat-label">รายรับ</span>
                </div>
            </div>
            <div class="stat-card stat-expense" style="flex:1">
                <div class="stat-icon"><i class="fas fa-arrow-down"></i></div>
                <div class="stat-info">
                    <span class="stat-value">${formatMoney(expense)}</span>
                    <span class="stat-label">รายจ่าย</span>
                </div>
            </div>
            <div class="stat-card stat-profit" style="flex:1">
                <div class="stat-icon"><i class="fas fa-chart-line"></i></div>
                <div class="stat-info">
                    <span class="stat-value" style="color: ${profit >= 0 ? 'var(--emerald-400)' : 'var(--danger)'}">${formatMoney(profit)}</span>
                    <span class="stat-label">กำไร/ขาดทุน</span>
                </div>
            </div>
            ${property.budget ? `
            <div class="stat-card" style="flex:1">
                <div class="stat-icon" style="background:var(--warning-bg); color:var(--warning)"><i class="fas fa-coins"></i></div>
                <div class="stat-info">
                    <span class="stat-value">${formatMoney(property.budget)}</span>
                    <span class="stat-label">งบประมาณ (เหลือ ${formatMoney(property.budget - expense)})</span>
                </div>
            </div>` : ''}
        </div>

        <div class="property-tabs" id="prop-tabs">
            <div class="property-tab active" data-tab="transactions" onclick="switchPropertyTab('transactions')">
                <i class="fas fa-exchange-alt"></i> รายรับ-รายจ่าย (${transactions.length})
            </div>
            <div class="property-tab" data-tab="workflow" onclick="switchPropertyTab('workflow')">
                <i class="fas fa-tasks"></i> ขั้นตอน
            </div>
            <div class="property-tab" data-tab="info" onclick="switchPropertyTab('info')">
                <i class="fas fa-info-circle"></i> รายละเอียด
            </div>
        </div>

        <div id="prop-tab-transactions" class="tab-content active"></div>
        <div id="prop-tab-workflow" class="tab-content"></div>
        <div id="prop-tab-info" class="tab-content"></div>
    `;

    renderPropertyTransactionsTab(propertyId, transactions);
    renderPropertyWorkflowTab(propertyId, workflow);
    renderPropertyInfoTab(property);
}

function switchPropertyTab(tab) {
    document.querySelectorAll('#prop-tabs .property-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
    });
    document.querySelectorAll('[id^="prop-tab-"]').forEach(c => {
        c.classList.toggle('active', c.id === 'prop-tab-' + tab);
    });
}

function renderPropertyTransactionsTab(propertyId, transactions) {
    const container = document.getElementById('prop-tab-transactions');
    const sorted = [...transactions].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    container.innerHTML = `
        <div class="section-header">
            <span></span>
            <div style="display:flex; gap:8px">
                <button class="btn btn-primary btn-sm" onclick="showAddTransactionForm('expense', '${propertyId}')">
                    <i class="fas fa-minus"></i> เพิ่มรายจ่าย
                </button>
                <button class="btn btn-secondary btn-sm" onclick="showAddTransactionForm('income', '${propertyId}')">
                    <i class="fas fa-plus"></i> เพิ่มรายรับ
                </button>
            </div>
        </div>
        ${sorted.length === 0 ? '<div class="empty-state"><i class="fas fa-receipt"></i><p>ยังไม่มีรายการ</p></div>' : ''}
        ${sorted.map(t => {
            const isIncome = t.type === 'income';
            return `
            <div class="transaction-item">
                <div class="transaction-icon ${isIncome ? 'income' : 'expense'}">
                    <i class="fas ${getCategoryIcon(t.category)}"></i>
                </div>
                <div class="transaction-info">
                    <div class="transaction-desc">${t.description || getCategoryLabel(t.category)}</div>
                    <div class="transaction-meta">
                        <span>${getCategoryLabel(t.category)}</span>
                        <span>${formatDateShort(t.date)}</span>
                    </div>
                </div>
                <div class="transaction-amount ${isIncome ? 'income' : 'expense'}">
                    ${isIncome ? '+' : '-'}${formatMoney(t.amount)}
                </div>
                ${Auth.isManager() ? `
                <button class="btn-icon" onclick="event.stopPropagation(); deleteTransaction('${t.id}', '${propertyId}')">
                    <i class="fas fa-trash" style="color:var(--danger)"></i>
                </button>` : ''}
            </div>`;
        }).join('')}
    `;
}

function renderPropertyWorkflowTab(propertyId, workflow) {
    const container = document.getElementById('prop-tab-workflow');
    if (!workflow) {
        workflow = DB.add('workflows', {
            propertyId,
            steps: getDefaultWorkflowSteps()
        });
    }

    container.innerHTML = `
        <div class="workflow-list">
            ${workflow.steps.map((step, idx) => {
                const status = step.completed ? 'completed' : (step.inProgress ? 'active' : 'pending');
                return `
                <div class="workflow-step ${status}">
                    <div class="workflow-step-icon">
                        ${step.completed ? '<i class="fas fa-check"></i>' : step.inProgress ? '<i class="fas fa-spinner fa-spin"></i>' : '<span style="font-size:0.8rem">${idx + 1}</span>'}
                    </div>
                    <div class="workflow-step-content">
                        <div class="workflow-step-title">
                            ${step.icon} ${step.title}
                            ${Auth.isManager() ? `
                            <label style="margin-left:auto; display:flex; align-items:center; gap:4px; font-size:0.8rem; color:var(--text-muted); cursor:pointer">
                                <input type="checkbox" ${step.completed ? 'checked' : ''} onchange="toggleWorkflowStep('${workflow.id}', ${idx}, this.checked)" style="accent-color:var(--emerald-500)">
                                เสร็จ
                            </label>` : ''}
                        </div>
                        <div class="workflow-step-desc">${step.description}</div>
                        ${step.tips ? `
                        <div class="workflow-step-tips">
                            <strong>💡 คำแนะนำ</strong>
                            ${step.tips}
                        </div>` : ''}
                        ${step.documents ? `
                        <div class="workflow-step-tips" style="border-color: rgba(59, 130, 246, 0.15); background: rgba(59, 130, 246, 0.06); color: #93c5fd">
                            <strong>📄 เอกสารที่ต้องเตรียม</strong>
                            ${step.documents}
                        </div>` : ''}
                        ${step.costs ? `
                        <div class="workflow-step-tips" style="border-color: rgba(245, 158, 11, 0.15); background: rgba(245, 158, 11, 0.06); color: #fcd34d">
                            <strong>💰 ค่าใช้จ่ายที่ต้องระวัง</strong>
                            ${step.costs}
                        </div>` : ''}
                    </div>
                </div>`;
            }).join('')}
        </div>
    `;
}

function toggleWorkflowStep(workflowId, stepIdx, completed) {
    const workflow = DB.getById('workflows', workflowId);
    if (!workflow) return;

    workflow.steps[stepIdx].completed = completed;
    workflow.steps[stepIdx].inProgress = false;

    // Auto-set next step as in-progress
    if (completed && stepIdx + 1 < workflow.steps.length && !workflow.steps[stepIdx + 1].completed) {
        workflow.steps[stepIdx + 1].inProgress = true;
    }

    DB.update('workflows', workflowId, { steps: workflow.steps });
    showPropertyDetail(workflow.propertyId);
}

function renderPropertyInfoTab(property) {
    const container = document.getElementById('prop-tab-info');
    container.innerHTML = `
        <div class="card" style="margin-bottom:16px">
            <div class="card-body">
                <table class="data-table">
                    <tr><td style="color:var(--text-muted); width:150px">ประเภท</td><td>${getPropertyTypeLabel(property.type)}</td></tr>
                    <tr><td style="color:var(--text-muted)">ราคาซื้อ</td><td>${formatMoney(property.buyPrice)}</td></tr>
                    <tr><td style="color:var(--text-muted)">ราคาขาย/ตั้งราคา</td><td>${formatMoney(property.sellPrice)}</td></tr>
                    <tr><td style="color:var(--text-muted)">งบประมาณรีโนเวท</td><td>${formatMoney(property.budget)}</td></tr>
                    <tr><td style="color:var(--text-muted)">วันที่ซื้อ</td><td>${formatDate(property.buyDate)}</td></tr>
                    <tr><td style="color:var(--text-muted)">วันที่ขาย</td><td>${formatDate(property.sellDate)}</td></tr>
                    <tr><td style="color:var(--text-muted)">สร้างเมื่อ</td><td>${formatDate(property.createdAt)}</td></tr>
                    ${property.notes ? `<tr><td style="color:var(--text-muted)">หมายเหตุ</td><td>${property.notes}</td></tr>` : ''}
                </table>
            </div>
        </div>
    `;
}

async function deleteProperty(propertyId) {
    const confirmed = await showConfirm('ลบทรัพย์สิน', 'รายการรายรับรายจ่ายที่เกี่ยวข้องจะถูกลบด้วย คุณแน่ใจหรือไม่?');
    if (!confirmed) return;

    // Delete associated transactions
    const transactions = DB.getAll('transactions').filter(t => t.propertyId === propertyId);
    transactions.forEach(t => DB.remove('transactions', t.id));

    // Delete associated workflow
    const workflows = DB.getAll('workflows').filter(w => w.propertyId === propertyId);
    workflows.forEach(w => DB.remove('workflows', w.id));

    DB.remove('properties', propertyId);
    showToast('ลบทรัพย์สินสำเร็จ', 'info');
    renderPropertyList();
}

async function deleteTransaction(txId, propertyId) {
    const confirmed = await showConfirm('ลบรายการ', 'คุณแน่ใจหรือไม่ที่จะลบรายการนี้?');
    if (!confirmed) return;

    DB.remove('transactions', txId);
    showToast('ลบรายการสำเร็จ', 'info');
    showPropertyDetail(propertyId);
}

function getPropertyTypeLabel(type) {
    const map = {
        'house': '🏠 บ้านเดี่ยว',
        'townhouse': '🏘️ ทาวน์เฮาส์',
        'condo': '🏢 คอนโด',
        'land': '🌿 ที่ดิน',
        'commercial': '🏪 อาคารพาณิชย์',
        'other': '📦 อื่นๆ'
    };
    return map[type] || type;
}

function getDefaultWorkflowSteps() {
    return [
        {
            icon: '🔍', title: 'สำรวจทรัพย์ & ประเมินราคา',
            description: 'ตรวจสอบทำเลที่ตั้ง สภาพทรัพย์ ราคาตลาด และศักยภาพในการทำกำไร',
            tips: 'ตรวจสอบราคาตลาดจากเว็บไซต์ อสังหาฯ เช่น DDproperty, Hipflat เปรียบเทียบราคาในซอยเดียวกัน',
            documents: 'โฉนดที่ดิน, แผนที่, รูปถ่ายทรัพย์',
            costs: 'ค่าเดินทางสำรวจ, ค่าประเมินราคา (ถ้ามี)',
            completed: false, inProgress: true
        },
        {
            icon: '📋', title: 'ตรวจสอบเอกสารสิทธิ์',
            description: 'ตรวจโฉนด สอบถามข้อมูลที่กรมที่ดิน ตรวจภาระผูกพัน',
            tips: 'ต้องตรวจว่าไม่มีภาระจำนอง ไม่อยู่ในเขตเวนคืน ชื่อเจ้าของตรงกัน',
            documents: 'โฉนดที่ดิน, บัตรประชาชนเจ้าของ, หนังสือให้ความยินยอม (ถ้ามีคู่สมรส)',
            costs: 'ค่าตรวจสอบเอกสาร, ค่าเดินทางไปกรมที่ดิน',
            completed: false, inProgress: false
        },
        {
            icon: '💰', title: 'ซื้อทรัพย์ & โอนกรรมสิทธิ์',
            description: 'ทำสัญญาจะซื้อจะขาย วางเงินมัดจำ และโอนกรรมสิทธิ์ที่กรมที่ดิน',
            tips: 'ทำสัญญาจะซื้อจะขายให้ชัดเจน ระบุเงื่อนไขการคืนเงินมัดจำ เอาทนายตรวจสัญญา',
            documents: 'สัญญาจะซื้อจะขาย, โฉนดที่ดิน, บัตรประชาชน, ทะเบียนบ้าน, หลักฐานการโอนเงิน',
            costs: 'ค่าธรรมเนียมโอน 2%, ค่าอากร 0.5%, ภาษีธุรกิจเฉพาะ 3.3% (ถือไม่ถึง 5 ปี), ค่าจดจำนอง 1%',
            completed: false, inProgress: false
        },
        {
            icon: '📐', title: 'วางแผนรีโนเวท & ประมาณการ',
            description: 'ออกแบบ วางแปลน จัดทำ BOQ (Bill of Quantities) ประมาณการค่าใช้จ่าย',
            tips: 'ทำ BOQ ให้ละเอียด แยกเป็นงานโครงสร้าง งานสถาปัตย์ งานระบบ เผื่องบ 10-15%',
            documents: 'แบบแปลน, BOQ, ใบเสนอราคาจากช่าง',
            costs: 'ค่าออกแบบ, ค่าสำรวจสภาพทรัพย์, ค่าจ้างวิศวกร (ถ้าจำเป็น)',
            completed: false, inProgress: false
        },
        {
            icon: '👷', title: 'จ้างช่าง & เริ่มรีโนเวท',
            description: 'คัดเลือกช่าง/ผู้รับเหมา ทำสัญญาจ้าง เริ่มงานรีโนเวท',
            tips: 'ขอดูผลงานเก่าของช่าง ทำสัญญาจ้างชัดเจน จ่ายเป็นงวดตามผลงาน อย่าจ่ายเงินล่วงหน้าเยอะ',
            documents: 'สัญญาจ้าง, ตารางงาน (Gantt Chart), ใบเสนอราคา',
            costs: 'ค่าแรง (แบ่งจ่ายตามงวด), ค่าวัสดุ',
            completed: false, inProgress: false
        },
        {
            icon: '🔨', title: 'ติดตามงานรีโนเวท',
            description: 'ตรวจสอบความคืบหน้า ตรวจคุณภาพงาน แก้ไขปัญหาที่เกิดขึ้น',
            tips: 'เข้าตรวจงานอย่างน้อยสัปดาห์ละ 2 ครั้ง ถ่ายรูป Before/After ทุกจุด เก็บใบเสร็จทุกรายการ',
            documents: 'รายงานความคืบหน้า, ภาพถ่ายงาน, ใบเสร็จค่าวัสดุ',
            costs: 'ค่าวัสดุเพิ่มเติม, ค่าแก้ไขงาน',
            completed: false, inProgress: false
        },
        {
            icon: '✅', title: 'ตรวจรับงาน',
            description: 'ตรวจรับงานทั้งหมด ทำ Punch List (รายการที่ต้องแก้ไข) ก่อนจ่ายงวดสุดท้าย',
            tips: 'ทำ Checklist ตรวจรับทุกจุด: ไฟฟ้า, ประปา, ผนัง, พื้น, ฝ้า, ประตู/หน้าต่าง, สี',
            documents: 'Punch List, รายงานตรวจรับ, ใบรับรองการติดตั้ง',
            costs: 'ค่าแก้ไข (ถ้ามี)',
            completed: false, inProgress: false
        },
        {
            icon: '📸', title: 'ถ่ายรูป & ลงประกาศขาย',
            description: 'ถ่ายรูปทรัพย์หลังรีโนเวท ลงประกาศขายในช่องทางต่างๆ',
            tips: 'จ้างช่างภาพมืออาชีพ ถ่ายตอนแดดดี ตกแต่ง staging เฟอร์นิเจอร์ ลง DDproperty, Kaidee, Facebook Marketplace',
            documents: 'รูปถ่าย Hi-Res, รายละเอียดทรัพย์, แผนผัง',
            costs: 'ค่าถ่ายภาพ, ค่า staging, ค่าโฆษณาออนไลน์',
            completed: false, inProgress: false
        },
        {
            icon: '🤝', title: 'เจรจาขาย & โอนกรรมสิทธิ์',
            description: 'รับ offer เจรจาราคา ทำสัญญาซื้อขาย โอนกรรมสิทธิ์',
            tips: 'เตรียมข้อมูลราคาตลาดไว้ต่อรอง ตั้งราคาสูงกว่าที่ต้องการ 5-10% เผื่อเจรจา',
            documents: 'สัญญาซื้อขาย, โฉนด, บัตรประชาชน, ทะเบียนบ้าน',
            costs: 'ค่าธรรมเนียมโอน, ค่านายหน้า 2-3%, ภาษี',
            completed: false, inProgress: false
        },
        {
            icon: '📊', title: 'สรุปกำไร/ขาดทุน',
            description: 'รวบรวมค่าใช้จ่ายทั้งหมด คำนวณกำไร/ขาดทุน สรุปบทเรียน',
            tips: 'คำนวณ ROI (Return on Investment) เปรียบเทียบกับแผนที่วางไว้ จดบทเรียนสำหรับทรัพย์ถัดไป',
            documents: 'สรุปรายรับรายจ่าย, รายงาน ROI, บทเรียนที่ได้',
            costs: 'ค่าบัญชี/ค่าทำภาษี',
            completed: false, inProgress: false
        }
    ];
}
