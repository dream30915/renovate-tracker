/* ============================================
   RenovateTrack - Core Application
   ============================================ */

// ===== DATA LAYER =====
const DB = {
    _store: {},

    init() {
        const keys = ['users', 'properties', 'transactions', 'workflows', 'settings'];
        keys.forEach(key => {
            const raw = localStorage.getItem('rt_' + key);
            this._store[key] = raw ? JSON.parse(raw) : [];
        });
        if (!this._store.settings.length) {
            this._store.settings = { currentUser: null };
        } else if (Array.isArray(this._store.settings)) {
            this._store.settings = { currentUser: null };
        }
    },

    save(key) {
        localStorage.setItem('rt_' + key, JSON.stringify(this._store[key]));
    },

    get(key) {
        return this._store[key];
    },

    set(key, value) {
        this._store[key] = value;
        this.save(key);
    },

    // CRUD helpers
    getAll(collection) {
        return this._store[collection] || [];
    },

    getById(collection, id) {
        return (this._store[collection] || []).find(item => item.id === id);
    },

    add(collection, item) {
        item.id = this.generateId();
        item.createdAt = new Date().toISOString();
        item.updatedAt = new Date().toISOString();
        this._store[collection].push(item);
        this.save(collection);
        return item;
    },

    update(collection, id, updates) {
        const idx = this._store[collection].findIndex(item => item.id === id);
        if (idx !== -1) {
            this._store[collection][idx] = { ...this._store[collection][idx], ...updates, updatedAt: new Date().toISOString() };
            this.save(collection);
            return this._store[collection][idx];
        }
        return null;
    },

    remove(collection, id) {
        this._store[collection] = this._store[collection].filter(item => item.id !== id);
        this.save(collection);
    },

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    },

    // Export/Import
    exportAll() {
        const data = {};
        const keys = ['users', 'properties', 'transactions', 'workflows'];
        keys.forEach(key => {
            data[key] = this._store[key];
        });
        data.exportedAt = new Date().toISOString();
        data.appVersion = '1.0.0';
        return JSON.stringify(data, null, 2);
    },

    importAll(jsonStr) {
        try {
            const data = JSON.parse(jsonStr);
            const keys = ['users', 'properties', 'transactions', 'workflows'];
            keys.forEach(key => {
                if (data[key]) {
                    this._store[key] = data[key];
                    this.save(key);
                }
            });
            return true;
        } catch (e) {
            return false;
        }
    }
};

// ===== AUTH =====
const Auth = {
    currentUser: null,

    login(userId, pin) {
        const user = DB.getById('users', userId);
        if (!user) return { success: false, error: 'ไม่พบผู้ใช้' };
        if (user.pin !== pin) return { success: false, error: 'PIN ไม่ถูกต้อง' };
        this.currentUser = user;
        DB._store.settings.currentUser = userId;
        DB.save('settings');
        return { success: true, user };
    },

    logout() {
        this.currentUser = null;
        DB._store.settings.currentUser = null;
        DB.save('settings');
    },

    isOwner() {
        return this.currentUser && this.currentUser.role === 'owner';
    },

    isManager() {
        return this.currentUser && (this.currentUser.role === 'owner' || this.currentUser.role === 'manager');
    },

    setupFirstUser(name, pin) {
        if (DB.getAll('users').length > 0) {
            return { success: false, error: 'มีผู้ใช้อยู่แล้ว' };
        }
        const user = DB.add('users', {
            name,
            pin,
            role: 'owner',
            emoji: '👑'
        });
        return this.login(user.id, pin);
    }
};

// ===== ROUTER =====
let currentPage = 'dashboard';

function navigateTo(page) {
    currentPage = page;

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.page === page);
    });

    // Update pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.toggle('active', p.id === 'page-' + page);
    });

    // Update title
    const titles = {
        dashboard: 'Dashboard',
        properties: 'ทรัพย์สิน',
        transactions: 'รายรับ-รายจ่าย',
        workflow: 'ขั้นตอนการทำงาน',
        reports: 'รายงาน',
        team: 'ทีมงาน'
    };
    document.getElementById('page-title').textContent = titles[page] || 'Dashboard';

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');

    // Render page content
    switch (page) {
        case 'dashboard': if (typeof renderDashboard === 'function') renderDashboard(); break;
        case 'properties': if (typeof renderProperties === 'function') renderProperties(); break;
        case 'transactions': if (typeof renderTransactions === 'function') renderTransactions(); break;
        case 'workflow': if (typeof renderWorkflow === 'function') renderWorkflow(); break;
        case 'reports': if (typeof renderReports === 'function') renderReports(); break;
        case 'team': if (typeof renderTeam === 'function') renderTeam(); break;
    }
}

// ===== UI HELPERS =====
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: 'check-circle', error: 'exclamation-circle', info: 'info-circle' };
    toast.innerHTML = `<i class="fas fa-${icons[type] || 'info-circle'}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showConfirm(title, message) {
    return new Promise(resolve => {
        const modal = document.getElementById('confirm-modal');
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        modal.style.display = 'flex';

        const ok = document.getElementById('confirm-ok');
        const cancel = document.getElementById('confirm-cancel');

        function cleanup() {
            modal.style.display = 'none';
            ok.removeEventListener('click', onOk);
            cancel.removeEventListener('click', onCancel);
        }

        function onOk() { cleanup(); resolve(true); }
        function onCancel() { cleanup(); resolve(false); }

        ok.addEventListener('click', onOk);
        cancel.addEventListener('click', onCancel);
    });
}

function showModal(title, bodyHtml) {
    const modal = document.getElementById('quick-add-modal');
    document.getElementById('quick-add-title').innerHTML = title;
    document.getElementById('quick-add-body').innerHTML = bodyHtml;
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('quick-add-modal').style.display = 'none';
}

function formatMoney(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '฿0';
    const num = parseFloat(amount);
    return '฿' + num.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateShort(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

function getStatusBadge(status) {
    const map = {
        'surveying': { label: '🔍 สำรวจ', class: 'badge-info' },
        'purchased': { label: '💰 ซื้อแล้ว', class: 'badge-warning' },
        'renovating': { label: '🔨 กำลังรีโนเวท', class: 'badge-warning' },
        'listing': { label: '📸 ลงประกาศ', class: 'badge-info' },
        'sold': { label: '✅ ขายแล้ว', class: 'badge-success' },
        'cancelled': { label: '❌ ยกเลิก', class: 'badge-danger' }
    };
    const info = map[status] || { label: status, class: 'badge-default' };
    return `<span class="badge ${info.class}">${info.label}</span>`;
}

function getCategoryLabel(cat) {
    const map = {
        'purchase': 'ค่าซื้อทรัพย์',
        'material': 'ค่าวัสดุ',
        'labor': 'ค่าแรง',
        'utility': 'ค่าน้ำ/ไฟ',
        'transfer': 'ค่าโอน/ค่าธรรมเนียม',
        'commission': 'ค่านายหน้า',
        'tax': 'ภาษี',
        'other_expense': 'ค่าใช้จ่ายอื่นๆ',
        'sale': 'ขายทรัพย์',
        'rental': 'ค่าเช่า',
        'other_income': 'รายรับอื่นๆ'
    };
    return map[cat] || cat;
}

function getCategoryIcon(cat) {
    const map = {
        'purchase': 'fa-home',
        'material': 'fa-box',
        'labor': 'fa-hard-hat',
        'utility': 'fa-bolt',
        'transfer': 'fa-file-invoice',
        'commission': 'fa-handshake',
        'tax': 'fa-percentage',
        'other_expense': 'fa-ellipsis-h',
        'sale': 'fa-tag',
        'rental': 'fa-key',
        'other_income': 'fa-plus'
    };
    return map[cat] || 'fa-circle';
}

// ===== INITIALIZE APP =====
document.addEventListener('DOMContentLoaded', () => {
    DB.init();

    // Check for existing session
    const savedUser = DB._store.settings.currentUser;
    if (savedUser) {
        const user = DB.getById('users', savedUser);
        if (user) {
            Auth.currentUser = user;
            showApp();
            return;
        }
    }

    showLogin();
});

function showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';

    // Load user options
    const users = DB.getAll('users');
    const select = document.getElementById('login-user-select');
    select.innerHTML = '<option value="">-- เลือกชื่อ --</option>';
    users.forEach(u => {
        select.innerHTML += `<option value="${u.id}">${u.emoji || '👤'} ${u.name} (${getRoleLabel(u.role)})</option>`;
    });

    // Show/hide setup button
    document.getElementById('setup-first-user-btn').style.display = users.length === 0 ? 'flex' : 'none';
}

function showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';

    // Update sidebar user info
    document.getElementById('sidebar-username').textContent = Auth.currentUser.name;
    document.getElementById('sidebar-role').textContent = getRoleLabel(Auth.currentUser.role);
    document.getElementById('sidebar-avatar').textContent = Auth.currentUser.emoji || '👤';

    // Navigate to dashboard
    navigateTo('dashboard');
}

function getRoleLabel(role) {
    const map = {
        'owner': 'เจ้าของ',
        'manager': 'ผู้จัดการ',
        'worker': 'ช่าง'
    };
    return map[role] || role;
}

// ===== EVENT LISTENERS =====
// PIN input auto-focus
document.querySelectorAll('.pin-box').forEach((input, idx, list) => {
    input.addEventListener('input', (e) => {
        if (e.target.value && idx < list.length - 1) {
            list[idx + 1].focus();
        }
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && idx > 0) {
            list[idx - 1].focus();
        }
    });
});

// Login button
document.getElementById('login-btn').addEventListener('click', () => {
    const userId = document.getElementById('login-user-select').value;
    const pin = [1, 2, 3, 4].map(i => document.getElementById('login-pin-' + i).value).join('');

    if (!userId) {
        document.getElementById('login-error').textContent = 'กรุณาเลือกผู้ใช้';
        return;
    }
    if (pin.length !== 4) {
        document.getElementById('login-error').textContent = 'กรุณากรอก PIN 4 หลัก';
        return;
    }

    const result = Auth.login(userId, pin);
    if (result.success) {
        showApp();
    } else {
        document.getElementById('login-error').textContent = result.error;
        // Clear PIN
        [1, 2, 3, 4].forEach(i => document.getElementById('login-pin-' + i).value = '');
        document.getElementById('login-pin-1').focus();
    }
});

// Setup first user
document.getElementById('setup-first-user-btn').addEventListener('click', () => {
    document.getElementById('setup-modal').style.display = 'flex';
});

document.getElementById('setup-save-btn').addEventListener('click', () => {
    const name = document.getElementById('setup-name').value.trim();
    const pin = document.getElementById('setup-pin').value;
    const pinConfirm = document.getElementById('setup-pin-confirm').value;

    if (!name) {
        document.getElementById('setup-error').textContent = 'กรุณากรอกชื่อ';
        return;
    }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        document.getElementById('setup-error').textContent = 'PIN ต้องเป็นตัวเลข 4 หลัก';
        return;
    }
    if (pin !== pinConfirm) {
        document.getElementById('setup-error').textContent = 'PIN ไม่ตรงกัน';
        return;
    }

    const result = Auth.setupFirstUser(name, pin);
    if (result.success) {
        document.getElementById('setup-modal').style.display = 'none';
        showToast(`ยินดีต้อนรับ ${name}! 🎉`);
        showApp();
    } else {
        document.getElementById('setup-error').textContent = result.error;
    }
});

// Navigation
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(link.dataset.page);
    });
});

// Mobile menu
document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('open');
});

document.getElementById('sidebar-close').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    Auth.logout();
    showLogin();
    showToast('ออกจากระบบแล้ว', 'info');
});

// Quick add button
document.getElementById('quick-add-btn').addEventListener('click', () => {
    showQuickAddMenu();
});

function showQuickAddMenu() {
    const html = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <button class="btn btn-secondary" onclick="closeModal(); navigateTo('properties'); setTimeout(() => { if(typeof showAddPropertyForm === 'function') showAddPropertyForm(); }, 100);">
                <i class="fas fa-home"></i> เพิ่มทรัพย์สิน
            </button>
            <button class="btn btn-secondary" onclick="closeModal(); navigateTo('transactions'); setTimeout(() => { if(typeof showAddTransactionForm === 'function') showAddTransactionForm('expense'); }, 100);">
                <i class="fas fa-arrow-down text-danger"></i> เพิ่มรายจ่าย
            </button>
            <button class="btn btn-secondary" onclick="closeModal(); navigateTo('transactions'); setTimeout(() => { if(typeof showAddTransactionForm === 'function') showAddTransactionForm('income'); }, 100);">
                <i class="fas fa-arrow-up text-success"></i> เพิ่มรายรับ
            </button>
            <button class="btn btn-secondary" onclick="closeModal(); navigateTo('team'); setTimeout(() => { if(typeof showAddTeamForm === 'function') showAddTeamForm(); }, 100);">
                <i class="fas fa-user-plus"></i> เพิ่มทีมงาน
            </button>
        </div>
    `;
    showModal('<i class="fas fa-plus-circle"></i> เพิ่มรายการใหม่', html);
}

// Modal close
document.getElementById('quick-add-close').addEventListener('click', closeModal);

// Click outside modal to close
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.style.display = 'none';
        }
    });
});

// Export
document.getElementById('export-btn').addEventListener('click', () => {
    const data = DB.exportAll();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `renovatetrack_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export ข้อมูลสำเร็จ! 📦');
});

// Import
document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
});

document.getElementById('import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const confirmed = await showConfirm('Import ข้อมูล', 'ข้อมูลเดิมจะถูกแทนที่ด้วยไฟล์ที่เลือก คุณแน่ใจหรือไม่?');
    if (!confirmed) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        const success = DB.importAll(evt.target.result);
        if (success) {
            showToast('Import ข้อมูลสำเร็จ! กำลังโหลดใหม่...', 'success');
            setTimeout(() => location.reload(), 1000);
        } else {
            showToast('ไฟล์ไม่ถูกต้อง', 'error');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
});
