// ==========================================
// FAIL: js/main.js
// FUNGSI: Pengawal Utama (Controller) & Event Listeners
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize App & Check Session
    if (typeof AuthManager !== 'undefined') {
        AuthManager.checkSession();
        
        // 2. Setup Event Listeners untuk Auth
        document.getElementById('btnLogin').addEventListener('click', AuthManager.doLogin);
        document.getElementById('btnLogout').addEventListener('click', AuthManager.doLogout);
        document.getElementById('btnShowDaftar').addEventListener('click', AuthManager.toggleDaftar);
        document.getElementById('btnLupaPwd').addEventListener('click', AuthManager.lupaKatalaluan);
    }

    // 3. Menu Navigation System
    document.querySelectorAll('[data-view]').forEach(item => {
        item.addEventListener('click', function() {
            ViewManager.switchTab(this.getAttribute('data-view'), this);
        });
    });

    // 4. Dashboard Buttons
    if (typeof DashboardManager !== 'undefined') {
        document.getElementById('btnRefreshDash').addEventListener('click', () => DashboardManager.initDash());
        document.getElementById('btnPrevPg').addEventListener('click', () => DashboardManager.movePg(-1));
        document.getElementById('btnNextPg').addEventListener('click', () => DashboardManager.movePg(1));
    }

    // 5. Export Buttons
    if (typeof ExportManager !== 'undefined') {
        document.getElementById('btnDlExcel').addEventListener('click', ExportManager.downloadDualExcel);
        document.getElementById('btnDlPDF').addEventListener('click', ExportManager.dlPDF);
        document.getElementById('btnDlGeoJSON').addEventListener('click', ExportManager.downloadGeoJSON);
        document.getElementById('btnDlKML').addEventListener('click', ExportManager.downloadKML);
    }
    
    // 6. External Links
    document.getElementById('btnOpenRPW').addEventListener('click', () => window.open(CONFIG.RPW_URL, '_blank'));
    
    // 7. Filtering (Date Inputs & Reset)
    if (typeof FilterManager !== 'undefined') {
        document.querySelectorAll('.filter-input').forEach(el => {
            el.addEventListener('change', () => FilterManager.runFilter());
        });
        document.getElementById('btnResetFilter').addEventListener('click', FilterManager.resetFilter);
    }
// Butang Daftar (Dalam Borang Daftar)
    const btnDaftar = document.getElementById('btnSubmitDaftar');
    if (btnDaftar) btnDaftar.addEventListener('click', AuthManager.toggleDaftar);
    
    // Butang Kembali (Dalam Borang Daftar)
    const btnBack = document.getElementById('btnBackLogin');
    if (btnBack) btnBack.addEventListener('click', () => {
        document.getElementById('formDaftar').style.display = 'none';
        document.getElementById('formLogin').style.display = 'block';
    });

    // Menukar paparan ke Borang Daftar
    const btnShowDaftar = document.getElementById('btnShowDaftar');
    if (btnShowDaftar) btnShowDaftar.addEventListener('click', () => {
        document.getElementById('formLogin').style.display = 'none';
        document.getElementById('formDaftar').style.display = 'block';
    });

// ==========================================
// PENGURUSAN PAPARAN (UI / TABS)
// ==========================================
const ViewManager = {
    switchTab: function(t, el) {
        // Logik buang aktif untuk PC & Mobile
        document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active')); 
        document.querySelectorAll('.nav-bot-item').forEach(x => x.classList.remove('active'));
        
        // Tambah warna aktif pada butang yang ditekan
        if(el) {
            if(!el.classList.contains('bg-success') && el.classList.contains('nav-item')) el.classList.add('active');
            if(el.classList.contains('nav-bot-item')) el.classList.add('active');
        }

        // Sembunyikan semua skrin utama
        ['view-main','view-verify','view-tasks','view-form', 'view-users'].forEach(v => {
            const view = document.getElementById(v);
            if(view) view.style.display = 'none';
        });
        
        // Paparkan skrin yang ditekan
        const targetView = document.getElementById('view-'+t);
        if(targetView) targetView.style.display = 'block';

        // Panggil refresh data berdasarkan tab yang dibuka
        if(t === 'verify' && typeof VerifyManager !== 'undefined') VerifyManager.loadPend();
        if(t === 'tasks' && typeof TaskManager !== 'undefined') TaskManager.loadMyTasks();
        if(t === 'users' && typeof UserManager !== 'undefined') UserManager.loadUsers();
        
        // Betulkan saiz map Leaflet bila tab dashboard dibuka semula
        if(t === 'main' && typeof MapManager !== 'undefined' && MapManager.map) {
            setTimeout(() => MapManager.map.invalidateSize(), 300);
        }
        
        // Tutup sidebar filter di telefon (kalau tengah terbuka)
        const sidebar = document.getElementById('sidebar');
        if(sidebar) sidebar.classList.remove('active');
        const overlay = document.getElementById('mobileOverlay');
        if(overlay) overlay.classList.remove('active');
    }
};
