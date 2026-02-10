/* ============================================
   Team Module
   ============================================ */

function renderTeam() {
    const container = document.getElementById('page-team');
    const users = DB.getAll('users');

    container.innerHTML = `
        <div class="section-header">
            <h3><i class="fas fa-users" style="color:var(--emerald-400)"></i> ทีมงาน (${users.length} คน)</h3>
            ${Auth.isOwner() ? `
            <button class="btn btn-primary btn-sm" onclick="showAddTeamForm()">
                <i class="fas fa-user-plus"></i> เพิ่มสมาชิก
            </button>` : ''}
        </div>

        <div class="team-grid">
            ${users.map(u => {
                const isCurrentUser = u.id === Auth.currentUser.id;
                return `
                <div class="team-card">
                    <div class="team-avatar ${u.role}">${u.emoji || '👤'}</div>
                    <div class="team-name">${u.name} ${isCurrentUser ? '<span style="color:var(--emerald-400); font-size:0.8rem">(คุณ)</span>' : ''}</div>
                    <div class="team-role">${getRoleBadge(u.role)}</div>
                    ${Auth.isOwner() && !isCurrentUser ? `
                    <div class="team-card-actions">
                        <button class="btn btn-ghost btn-xs" onclick="showEditTeamForm('${u.id}')">
                            <i class="fas fa-edit"></i> แก้ไข
                        </button>
                        <button class="btn btn-ghost btn-xs" onclick="deleteTeamMember('${u.id}')" style="color:var(--danger)">
                            <i class="fas fa-trash"></i> ลบ
                        </button>
                    </div>` : ''}
                    ${isCurrentUser ? `
                    <div class="team-card-actions">
                        <button class="btn btn-ghost btn-xs" onclick="showChangePinForm()">
                            <i class="fas fa-key"></i> เปลี่ยน PIN
                        </button>
                    </div>` : ''}
                </div>`;
            }).join('')}
        </div>

        <!-- Roles Description -->
        <div class="card mt-4">
            <div class="card-header">
                <h3><i class="fas fa-shield-alt"></i> สิทธิ์ตามบทบาท</h3>
            </div>
            <div class="card-body">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ฟีเจอร์</th>
                            <th>👑 เจ้าของ</th>
                            <th>📋 ผู้จัดการ</th>
                            <th>🔧 ช่าง</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>ดู Dashboard</td>
                            <td class="text-success">✓</td>
                            <td class="text-success">✓</td>
                            <td class="text-success">✓</td>
                        </tr>
                        <tr>
                            <td>เพิ่ม/แก้ไขทรัพย์สิน</td>
                            <td class="text-success">✓</td>
                            <td class="text-success">✓</td>
                            <td class="text-danger">✗</td>
                        </tr>
                        <tr>
                            <td>บันทึกรายรับ-รายจ่าย</td>
                            <td class="text-success">✓</td>
                            <td class="text-success">✓</td>
                            <td class="text-danger">✗</td>
                        </tr>
                        <tr>
                            <td>อัปเดต Workflow</td>
                            <td class="text-success">✓</td>
                            <td class="text-success">✓</td>
                            <td class="text-danger">✗</td>
                        </tr>
                        <tr>
                            <td>ดูรายงาน</td>
                            <td class="text-success">✓</td>
                            <td class="text-success">✓</td>
                            <td class="text-success">✓</td>
                        </tr>
                        <tr>
                            <td>จัดการทีมงาน</td>
                            <td class="text-success">✓</td>
                            <td class="text-danger">✗</td>
                            <td class="text-danger">✗</td>
                        </tr>
                        <tr>
                            <td>Export/Import ข้อมูล</td>
                            <td class="text-success">✓</td>
                            <td class="text-success">✓</td>
                            <td class="text-danger">✗</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function showAddTeamForm() {
    const emojis = ['👷', '👨‍🔧', '👩‍💼', '🧑‍💻', '👨‍🏭', '👩‍🔬', '🧑‍🏫', '👨‍✈️', '👩‍🎨', '🧑‍🍳'];
    const html = `
        <div class="form-group">
            <label>ชื่อ *</label>
            <input type="text" id="team-name" placeholder="ชื่อสมาชิก">
        </div>
        <div class="form-group">
            <label>บทบาท *</label>
            <select id="team-role">
                <option value="manager">📋 ผู้จัดการ</option>
                <option value="worker">🔧 ช่าง</option>
            </select>
        </div>
        <div class="form-group">
            <label>ไอคอน</label>
            <div style="display:flex; gap:8px; flex-wrap:wrap">
                ${emojis.map((e, i) => `
                    <label style="cursor:pointer">
                        <input type="radio" name="team-emoji" value="${e}" ${i === 0 ? 'checked' : ''} style="display:none">
                        <span style="font-size:1.8rem; padding:4px; border-radius:8px; border:2px solid transparent; display:inline-block; transition:all 0.2s" class="emoji-pick">${e}</span>
                    </label>`).join('')}
            </div>
        </div>
        <div class="form-group">
            <label>PIN (4 หลัก) *</label>
            <input type="password" id="team-pin" maxlength="4" placeholder="ตั้ง PIN" inputmode="numeric">
        </div>
        <div class="modal-actions">
            <button class="btn btn-ghost" onclick="closeModal()">ยกเลิก</button>
            <button class="btn btn-primary" onclick="saveTeamMember()">
                <i class="fas fa-user-plus"></i> เพิ่มสมาชิก
            </button>
        </div>
    `;

    showModal('<i class="fas fa-user-plus"></i> เพิ่มสมาชิกทีม', html);

    // Emoji selection styling
    setTimeout(() => {
        document.querySelectorAll('.emoji-pick').forEach(span => {
            const radio = span.parentElement.querySelector('input[type="radio"]');
            if (radio.checked) span.style.borderColor = 'var(--emerald-500)';
            span.addEventListener('click', () => {
                document.querySelectorAll('.emoji-pick').forEach(s => s.style.borderColor = 'transparent');
                span.style.borderColor = 'var(--emerald-500)';
            });
        });
    }, 50);
}

function showEditTeamForm(userId) {
    const user = DB.getById('users', userId);
    if (!user) return;

    const html = `
        <div class="form-group">
            <label>ชื่อ *</label>
            <input type="text" id="team-edit-name" value="${user.name}">
        </div>
        <div class="form-group">
            <label>บทบาท *</label>
            <select id="team-edit-role">
                <option value="manager" ${user.role === 'manager' ? 'selected' : ''}>📋 ผู้จัดการ</option>
                <option value="worker" ${user.role === 'worker' ? 'selected' : ''}>🔧 ช่าง</option>
            </select>
        </div>
        <div class="form-group">
            <label>PIN ใหม่ (เว้นว่างถ้าไม่เปลี่ยน)</label>
            <input type="password" id="team-edit-pin" maxlength="4" placeholder="PIN ใหม่ (ถ้าต้องการเปลี่ยน)" inputmode="numeric">
        </div>
        <input type="hidden" id="team-edit-id" value="${userId}">
        <div class="modal-actions">
            <button class="btn btn-ghost" onclick="closeModal()">ยกเลิก</button>
            <button class="btn btn-primary" onclick="updateTeamMember()">
                <i class="fas fa-save"></i> บันทึก
            </button>
        </div>
    `;

    showModal('<i class="fas fa-edit"></i> แก้ไขสมาชิก', html);
}

function saveTeamMember() {
    const name = document.getElementById('team-name').value.trim();
    const role = document.getElementById('team-role').value;
    const pin = document.getElementById('team-pin').value;
    const emoji = document.querySelector('input[name="team-emoji"]:checked')?.value || '👤';

    if (!name) { showToast('กรุณากรอกชื่อ', 'error'); return; }
    if (!/^\d{4}$/.test(pin)) { showToast('PIN ต้องเป็นตัวเลข 4 หลัก', 'error'); return; }

    DB.add('users', { name, role, pin, emoji });
    showToast(`เพิ่ม ${name} เข้าทีมสำเร็จ! 🎉`);
    closeModal();
    renderTeam();
}

function updateTeamMember() {
    const id = document.getElementById('team-edit-id').value;
    const name = document.getElementById('team-edit-name').value.trim();
    const role = document.getElementById('team-edit-role').value;
    const pin = document.getElementById('team-edit-pin').value;

    if (!name) { showToast('กรุณากรอกชื่อ', 'error'); return; }

    const updates = { name, role };
    if (pin) {
        if (!/^\d{4}$/.test(pin)) { showToast('PIN ต้องเป็นตัวเลข 4 หลัก', 'error'); return; }
        updates.pin = pin;
    }

    DB.update('users', id, updates);
    showToast('แก้ไขข้อมูลสำเร็จ! ✏️');
    closeModal();
    renderTeam();
}

async function deleteTeamMember(userId) {
    const user = DB.getById('users', userId);
    if (!user) return;

    const confirmed = await showConfirm('ลบสมาชิก', `ต้องการลบ "${user.name}" ออกจากทีมหรือไม่?`);
    if (!confirmed) return;

    DB.remove('users', userId);
    showToast(`ลบ ${user.name} ออกจากทีมแล้ว`, 'info');
    renderTeam();
}

function showChangePinForm() {
    const html = `
        <div class="form-group">
            <label>PIN เดิม</label>
            <input type="password" id="change-old-pin" maxlength="4" placeholder="PIN เดิม" inputmode="numeric">
        </div>
        <div class="form-group">
            <label>PIN ใหม่</label>
            <input type="password" id="change-new-pin" maxlength="4" placeholder="PIN ใหม่" inputmode="numeric">
        </div>
        <div class="form-group">
            <label>ยืนยัน PIN ใหม่</label>
            <input type="password" id="change-confirm-pin" maxlength="4" placeholder="ยืนยัน PIN ใหม่" inputmode="numeric">
        </div>
        <div class="modal-actions">
            <button class="btn btn-ghost" onclick="closeModal()">ยกเลิก</button>
            <button class="btn btn-primary" onclick="changePin()">
                <i class="fas fa-key"></i> เปลี่ยน PIN
            </button>
        </div>
    `;

    showModal('<i class="fas fa-key"></i> เปลี่ยน PIN', html);
}

function changePin() {
    const oldPin = document.getElementById('change-old-pin').value;
    const newPin = document.getElementById('change-new-pin').value;
    const confirmPin = document.getElementById('change-confirm-pin').value;

    if (oldPin !== Auth.currentUser.pin) {
        showToast('PIN เดิมไม่ถูกต้อง', 'error');
        return;
    }
    if (!/^\d{4}$/.test(newPin)) {
        showToast('PIN ใหม่ต้องเป็นตัวเลข 4 หลัก', 'error');
        return;
    }
    if (newPin !== confirmPin) {
        showToast('PIN ใหม่ไม่ตรงกัน', 'error');
        return;
    }

    DB.update('users', Auth.currentUser.id, { pin: newPin });
    Auth.currentUser.pin = newPin;
    showToast('เปลี่ยน PIN สำเร็จ! 🔑');
    closeModal();
}

function getRoleBadge(role) {
    const map = {
        'owner': '<span class="badge badge-success">👑 เจ้าของ</span>',
        'manager': '<span class="badge badge-warning">📋 ผู้จัดการ</span>',
        'worker': '<span class="badge badge-info">🔧 ช่าง</span>'
    };
    return map[role] || role;
}
