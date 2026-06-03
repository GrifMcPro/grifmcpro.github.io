const firebaseConfig = {
    apiKey: "AIzaSyCDHaYgSlhr-fvv8kPysZtfMWsXLHIfh48",
    authDomain: "griflaunc.firebaseapp.com",
    projectId: "griflaunc",
    storageBucket: "griflaunc.firebasestorage.app",
    messagingSenderId: "946120100074",
    appId: "1:946120100074:web:b672de237e7101b5a9ef93"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
const products = [
    { id: 'vip', name: 'VIP Стандарт', icon: 'fa-crown', price: 150, days: '10 дней', features: ['Цветной ник', '/kit', '/fly'] },
    { id: 'vip_plus', name: 'VIP+ Продвинутый', icon: 'fa-gem', price: 350, days: '30 дней', features: ['Всё из VIP', 'VIP-чат', '/heal'] },
    { id: 'mvp', name: 'MVP Вечный', icon: 'fa-star', price: 1000, days: 'Навсегда', features: ['Всё из VIP+', 'Префикс [KING]', '/god'] }
];

function updateAuthUI() {
    const authDiv = document.getElementById('authStatus');
    if (authDiv) authDiv.innerHTML = currentUser ? `<span>👤 ${currentUser.email}</span>` : `<span>👤 Не авторизован</span>`;
}

function showPurchaseModal(productName, price) {
    const modal = document.getElementById('purchaseModal');
    const msg = document.getElementById('purchaseMessage');
    if (modal && msg) {
        msg.innerHTML = `Вы купили <strong>${productName}</strong> за <strong>${price} ₽</strong><br><br>Это тестовая покупка. Спасибо!`;
        modal.style.display = 'flex';
    }
}

function loadShop() {
    const container = document.getElementById('shopGrid');
    if (!container) return;
    container.innerHTML = products.map(p => `
        <div class="product-card">
            <div class="product-icon"><i class="fas ${p.icon}"></i></div>
            <h3>${p.name}</h3>
            <div class="price">${p.price} ₽</div>
            <div>${p.days}</div>
            <ul>${p.features.map(f => `<li><i class="fas fa-check-circle"></i> ${f}</li>`).join('')}</ul>
            <button class="buy-btn" onclick="showPurchaseModal('${p.name}', ${p.price})">Купить</button>
        </div>
    `).join('');
}

async function loadMessages() {
    const container = document.getElementById('messages');
    if (!container) return;
    const snapshot = await db.collection('globalChat').orderBy('timestamp').limit(50).get();
    container.innerHTML = snapshot.docs.map(doc => {
        let m = doc.data();
        return `<div class="message"><b>${m.userEmail}:</b> ${m.text}<br><small>${new Date(m.timestamp).toLocaleTimeString()}</small></div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    if (!input || !currentUser || !input.value.trim()) return;
    await db.collection('globalChat').add({ userEmail: currentUser.email, text: input.value, timestamp: Date.now() });
    input.value = '';
    loadMessages();
}

// Конструктор аватаров
let currentAvatar = { hair: 'hair1', eyes: 'eyes1', outfit: 'outfit1' };
function updateAvatarPreview() {
    const preview = document.getElementById('avatarPreview');
    if (preview) preview.innerHTML = `<i class="fas fa-user-circle" style="color:#ff6b6b;"></i><div style="font-size:12px;">${currentAvatar.hair}|${currentAvatar.eyes}</div>`;
}
document.querySelectorAll('.part-btn')?.forEach(btn => {
    btn.addEventListener('click', () => {
        const part = btn.dataset.part;
        if (part.includes('hair')) currentAvatar.hair = part;
        if (part.includes('eyes')) currentAvatar.eyes = part;
        if (part.includes('outfit')) currentAvatar.outfit = part;
        updateAvatarPreview();
    });
});
document.getElementById('saveAvatarBtn')?.addEventListener('click', () => {
    if (currentUser) {
        db.collection('profiles').doc(currentUser.uid).update({ avatar: currentAvatar });
        alert('Аватар сохранён!');
    } else alert('Войдите в аккаунт');
});

// Галерея — лайтбокс
document.querySelectorAll('.gallery-item')?.forEach(item => {
    item.addEventListener('click', () => {
        const images = JSON.parse(item.dataset.images);
        const lightbox = document.getElementById('lightbox');
        const img = document.getElementById('lightboxImg');
        let currentIndex = 0;
        img.src = images[0];
        lightbox.style.display = 'flex';
        document.querySelector('.lightbox-next').onclick = () => {
            currentIndex = (currentIndex + 1) % images.length;
            img.src = images[currentIndex];
        };
        document.querySelector('.lightbox-prev').onclick = () => {
            currentIndex = (currentIndex - 1 + images.length) % images.length;
            img.src = images[currentIndex];
        };
    });
});
document.querySelector('.lightbox-close')?.addEventListener('click', () => {
    document.getElementById('lightbox').style.display = 'none';
});

// Система тикетов
async function loadTickets() {
    const container = document.getElementById('ticketsList');
    if (!container || !currentUser) return;
    const snapshot = await db.collection('tickets').where('userId', '==', currentUser.uid).orderBy('createdAt', 'desc').get();
    container.innerHTML = snapshot.docs.map(doc => {
        let t = doc.data();
        return `<div class="ticket-item"><b>${t.title}</b><br>${t.message}<br><small>Статус: ${t.status} | ${new Date(t.createdAt).toLocaleString()}</small></div>`;
    }).join('');
}
document.getElementById('createTicketBtn')?.addEventListener('click', async () => {
    if (!currentUser) { alert('Войдите в аккаунт'); return; }
    const title = document.getElementById('ticketTitle').value;
    const message = document.getElementById('ticketMessage').value;
    if (!title || !message) { alert('Заполните все поля'); return; }
    await db.collection('tickets').add({ userId: currentUser.uid, title, message, status: 'Новое', createdAt: Date.now() });
    alert('Обращение отправлено!');
    document.getElementById('ticketTitle').value = '';
    document.getElementById('ticketMessage').value = '';
    loadTickets();
});

// История покупок и профиль
async function loadProfile() {
    const container = document.getElementById('profileCard');
    if (!container) return;
    if (!currentUser) { container.innerHTML = '<p>Войдите, чтобы увидеть профиль</p>'; return; }
    const doc = await db.collection('profiles').doc(currentUser.uid).get();
    const avatarData = doc.data()?.avatar || { hair: 'hair1', eyes: 'eyes1', outfit: 'outfit1' };
    container.innerHTML = `<h2>${currentUser.email}</h2><p>Аватар: ${avatarData.hair}, ${avatarData.eyes}</p><p>Дата регистрации: ${currentUser.metadata.creationTime}</p>`;
}
async function loadOrders() {
    const container = document.getElementById('tabContent');
    if (!container) return;
    if (!currentUser) { container.innerHTML = '<p>Войдите, чтобы увидеть историю</p>'; return; }
    const snapshot = await db.collection('orders').where('userId', '==', currentUser.uid).get();
    container.innerHTML = snapshot.docs.map(doc => `<div class="order-item">${doc.data().productId} - ${doc.data().price} ₽ - ${doc.data().status}</div>`).join('') || '<p>Нет покупок</p>';
}
function loadThemes() {
    const container = document.getElementById('tabContent');
    if (!container) return;
    container.innerHTML = `<div class="themes-grid"><button class="theme-btn" data-theme="dark">Тёмная</button><button class="theme-btn" data-theme="light">Светлая</button><button class="theme-btn" data-theme="gamer">Геймерская</button></div>`;
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            document.body.className = theme;
            localStorage.setItem('theme', theme);
        });
    });
}

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        if (tab === 'active') loadOrders();
        if (tab === 'history') loadOrders();
        if (tab === 'themes') loadThemes();
    });
});

// Авторизация
function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    auth.onAuthStateChanged(async (user) => {
        currentUser = user;
        updateAuthUI();
        if (path.includes('shop.html')) loadShop();
        if (path.includes('chat.html')) { loadMessages(); setInterval(loadMessages, 3000); }
        if (path.includes('profile.html')) { loadProfile(); loadOrders(); }
        if (path.includes('support.html')) loadTickets();
    });
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.onclick = () => auth.signOut();
    const userInfo = document.getElementById('userInfo');
    if (userInfo) userInfo.onclick = () => { if (!currentUser) showLoginModal(); };
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) sendBtn.onclick = sendMessage;
    const closeBtns = document.querySelectorAll('.close, .close-purchase');
    closeBtns.forEach(btn => btn.onclick = () => document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'));
    const doLogin = document.getElementById('doLogin');
    if (doLogin) {
        doLogin.onclick = async () => {
            const email = document.getElementById('loginEmail').value;
            const pass = document.getElementById('loginPassword').value;
            try {
                await auth.signInWithEmailAndPassword(email, pass);
                document.getElementById('loginModal').style.display = 'none';
                location.reload();
            } catch(e) { alert(e.message); }
        };
    }
    const doRegister = document.getElementById('doRegister');
    if (doRegister) {
        doRegister.onclick = async () => {
            const email = document.getElementById('loginEmail').value;
            const pass = document.getElementById('loginPassword').value;
            try {
                await auth.createUserWithEmailAndPassword(email, pass);
                await db.collection('profiles').doc(auth.currentUser.uid).set({ email, avatar: { hair: 'hair1', eyes: 'eyes1', outfit: 'outfit1' } });
                document.getElementById('loginModal').style.display = 'none';
                alert('Регистрация успешна!');
            } catch(e) { alert(e.message); }
        };
    }
});
