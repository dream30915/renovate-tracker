/* ============================================
   Workflow Module
   ============================================ */

function renderWorkflow() {
    const container = document.getElementById('page-workflow');
    const properties = DB.getAll('properties');
    const workflows = DB.getAll('workflows');

    container.innerHTML = `
        <div class="section-header">
            <h3><i class="fas fa-tasks" style="color:var(--emerald-400)"></i> ขั้นตอนการทำงาน</h3>
            <select id="wf-property-select" class="btn btn-secondary" style="appearance:auto; min-width:200px">
                <option value="">-- เลือกทรัพย์สิน --</option>
                ${properties.map(p => `<option value="${p.id}">${p.name} ${getStatusBadgeText(p.status)}</option>`).join('')}
            </select>
        </div>

        <div id="wf-content">
            ${properties.length === 0
                ? `<div class="empty-state"><i class="fas fa-tasks"></i><p>เพิ่มทรัพย์สินก่อนเพื่อดูขั้นตอนการทำงาน</p>
                    <button class="btn btn-primary btn-sm" onclick="navigateTo('properties')">เพิ่มทรัพย์สิน</button></div>`
                : `<div class="card"><div class="card-body">
                    <div class="empty-state"><i class="fas fa-hand-pointer"></i><p>เลือกทรัพย์สินเพื่อดูขั้นตอน</p></div>
                    </div></div>`
            }
        </div>

        <div class="card mt-4">
            <div class="card-header">
                <h3><i class="fas fa-lightbulb"></i> คำแนะนำทั่วไปสำหรับธุรกิจรีโนเวทบ้าน</h3>
            </div>
            <div class="card-body">
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
                    ${renderTipCard('💡', 'กฎ 70% Rule', 'ราคาขาย × 70% - ค่ารีโนเวท = ราคาซื้อสูงสุด<br>เช่น ขายได้ 3 ล้าน → 3M × 70% - 500K รีโนเวท = ซื้อไม่เกิน 1.6M')}
                    ${renderTipCard('📊', 'งบประมาณรีโนเวท', 'เผื่องบ 15-20% เสมอ สำหรับค่าใช้จ่ายที่ไม่คาดคิด<br>แยกงบ: โครงสร้าง 30%, สถาปัตย์ 40%, งานระบบ 20%, เบ็ดเตล็ด 10%')}
                    ${renderTipCard('⏰', 'ระยะเวลาโปรเจกต์', 'ควบคุมให้เสร็จภายใน 3-6 เดือน ยิ่งนานค่าใช้จ่ายยิ่งเพิ่ม<br>ค่าดอกเบี้ย + ค่าเสียโอกาส = ต้นทุนแฝง')}
                    ${renderTipCard('📋', 'เอกสารสำคัญ', 'เก็บใบเสร็จทุกรายการ ถ่ายรูป Before/After<br>ทำสัญญาจ้างเป็นลายลักษณ์อักษร จ่ายเงินตามงวดงาน')}
                    ${renderTipCard('🏠', 'เลือกทำเลที่ดี', 'ใกล้โรงเรียน/ห้าง/รถไฟฟ้า ซอยไม่ลึก<br>ตรวจสอบราคาเปรียบเทียบในย่านเดียวกัน')}
                    ${renderTipCard('💰', 'ภาษีที่ต้องรู้', 'ถือไม่ถึง 5 ปี: ภาษีธุรกิจเฉพาะ 3.3%<br>ภาษีเงินได้หัก ณ ที่จ่าย ตามขั้นบันได<br>ค่าธรรมเนียมโอน 2% + อากร 0.5%')}
                </div>
            </div>
        </div>
    `;

    // Property select handler
    document.getElementById('wf-property-select').addEventListener('change', (e) => {
        if (e.target.value) {
            renderWorkflowForProperty(e.target.value);
        }
    });
}

function renderWorkflowForProperty(propertyId) {
    const property = DB.getById('properties', propertyId);
    let workflow = DB.getAll('workflows').find(w => w.propertyId === propertyId);

    if (!workflow) {
        workflow = DB.add('workflows', {
            propertyId,
            steps: getDefaultWorkflowSteps()
        });
    }

    const completedCount = workflow.steps.filter(s => s.completed).length;
    const totalSteps = workflow.steps.length;
    const progress = Math.round((completedCount / totalSteps) * 100);

    const container = document.getElementById('wf-content');
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3><i class="fas fa-home"></i> ${property.name}</h3>
                <span class="badge ${progress === 100 ? 'badge-success' : 'badge-warning'}">${progress}% เสร็จ (${completedCount}/${totalSteps})</span>
            </div>
            <div class="card-body">
                <div style="background:var(--bg-input); border-radius:20px; height:8px; margin-bottom:20px; overflow:hidden">
                    <div style="background:var(--gradient-primary); height:100%; width:${progress}%; border-radius:20px; transition: width 0.5s ease"></div>
                </div>

                <div class="workflow-list">
                    ${workflow.steps.map((step, idx) => {
                        const status = step.completed ? 'completed' : (step.inProgress ? 'active' : 'pending');
                        return `
                        <div class="workflow-step ${status}">
                            <div class="workflow-step-icon">
                                ${step.completed ? '<i class="fas fa-check"></i>' : step.inProgress ? '<i class="fas fa-spinner fa-spin"></i>' : '<span style="font-size:0.8rem">' + (idx + 1) + '</span>'}
                            </div>
                            <div class="workflow-step-content">
                                <div class="workflow-step-title">
                                    ${step.icon} ${step.title}
                                    ${Auth.isManager() ? `
                                    <label style="margin-left:auto; display:flex; align-items:center; gap:4px; font-size:0.8rem; color:var(--text-muted); cursor:pointer">
                                        <input type="checkbox" ${step.completed ? 'checked' : ''} onchange="toggleGlobalWorkflowStep('${workflow.id}', ${idx}, this.checked)" style="accent-color:var(--emerald-500)">
                                        เสร็จ
                                    </label>` : ''}
                                </div>
                                <div class="workflow-step-desc">${step.description}</div>
                                ${step.tips ? `<div class="workflow-step-tips"><strong>💡 คำแนะนำ</strong>${step.tips}</div>` : ''}
                                ${step.documents ? `<div class="workflow-step-tips" style="border-color: rgba(59, 130, 246, 0.15); background: rgba(59, 130, 246, 0.06); color: #93c5fd"><strong>📄 เอกสารที่ต้องเตรียม</strong>${step.documents}</div>` : ''}
                                ${step.costs ? `<div class="workflow-step-tips" style="border-color: rgba(245, 158, 11, 0.15); background: rgba(245, 158, 11, 0.06); color: #fcd34d"><strong>💰 ค่าใช้จ่ายที่ต้องระวัง</strong>${step.costs}</div>` : ''}
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        </div>
    `;
}

function toggleGlobalWorkflowStep(workflowId, stepIdx, completed) {
    const workflow = DB.getById('workflows', workflowId);
    if (!workflow) return;

    workflow.steps[stepIdx].completed = completed;
    workflow.steps[stepIdx].inProgress = false;

    if (completed && stepIdx + 1 < workflow.steps.length && !workflow.steps[stepIdx + 1].completed) {
        workflow.steps[stepIdx + 1].inProgress = true;
    }

    DB.update('workflows', workflowId, { steps: workflow.steps });
    renderWorkflowForProperty(workflow.propertyId);
}

function getStatusBadgeText(status) {
    const map = {
        'surveying': '🔍',
        'purchased': '💰',
        'renovating': '🔨',
        'listing': '📸',
        'sold': '✅',
        'cancelled': '❌'
    };
    return map[status] || '';
}

function renderTipCard(icon, title, content) {
    return `
        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px;">
            <div style="font-size:1.5rem; margin-bottom:8px">${icon}</div>
            <div style="font-weight:700; margin-bottom:6px">${title}</div>
            <div style="font-size:0.85rem; color:var(--text-secondary); line-height:1.6">${content}</div>
        </div>
    `;
}
