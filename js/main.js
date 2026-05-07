// js/main.js

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize App & Check Session
    AuthManager.checkSession();

    // 2. Setup Event Listeners (Ganti onlick="..." dalam HTML)
    document.getElementById('btnLogin').addEventListener('click', AuthManager.doLogin);
    document.getElementById('btnLogout').addEventListener('click', AuthManager.doLogout);
    document.getElementById('btnShowDaftar').addEventListener('click', AuthManager.toggleDaftar);
    document.getElementById('btnLupaPwd').addEventListener('click', AuthManager.lupaKatalaluan);
    
    // Menu Navigation System
    document.querySelectorAll('[data-view]').forEach(item => {
        item.addEventListener('click', function() {
            ViewManager.switchTab(this.getAttribute('data-view'), this);
        });
    });

    // Dashboard Buttons
    document.getElementById('btnRefreshDash').addEventListener('click', DashboardManager.initDash);
    document.getElementById('btnDlExcel').addEventListener('click', ExportManager.downloadDualExcel);
    document.getElementById('btnDlPDF').addEventListener('click', ExportManager.dlPDF);
    document.getElementById('btnDlGeoJSON').addEventListener('click', ExportManager.downloadGeoJSON);
    document.getElementById('btnDlKML').addEventListener('click', ExportManager.downloadKML);
    
    // Pagination
    document.getElementById('btnPrevPg').addEventListener('click', () => DashboardManager.movePg(-1));
    document.getElementById('btnNextPg').addEventListener('click', () => DashboardManager.movePg(1));
    
    // External Links
    document.getElementById('btnOpenRPW').addEventListener('click', () => window.open(CONFIG.RPW_URL, '_blank'));
    
    // Filtering
    document.querySelectorAll('.filter-input').forEach(el => {
        el.addEventListener('change', () => FilterManager.runFilter());
    });
    document.getElementById('btnResetFilter').addEventListener('click', FilterManager.resetFilter);
});

const ViewManager = {
    switchTab: function(targetId, element) {
        // Logik tukar skrin dan warna butang (sama macam `switchTab` lama, 
        // tapi diasingkan ke dalam Objek supaya tidak bersepah)
        // ...
    }
};

const DashboardManager = {
    initDash: async function() {
       // Logik initDash lama dimasukkan sini
    },
    // ...
};
// Dan seterusnya untuk FilterManager...
