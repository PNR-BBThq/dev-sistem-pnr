// ==========================================
// FAIL: js/kpi.js
// FUNGSI: Menguruskan Pengiraan & Paparan KPI SKU
// ==========================================

const KPIManager = {
    targetData: null,
    targetCrops: null,

    init: async function() {
        // Papar loading
        Swal.fire({ title: 'Memuatkan Data KPI...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        
        try {
            const r = await API.postData('getKPIData', {});
            Swal.close();
            
            if(r.success) {
                this.targetData = r.dataSasaran;
                this.targetCrops = r.dataSenarai;
                this.renderDashboard();
            } else {
                alert("Gagal ambil data sasaran: " + r.message);
            }
        } catch(e) {
            Swal.close();
            console.error(e);
        }
    },

    renderDashboard: function() {
        const currentNegeri = FilterManager.v('selNegeri'); // Ambil filter negeri semasa
        this.renderLuasTable(currentNegeri);
        this.renderLiputanTable(currentNegeri);
    },

    renderLuasTable: function(filterNegeri) {
        const tbody = document.querySelector('#tableKPILuas tbody');
        tbody.innerHTML = '';
        
        // Kategori yang kita nak pantau
        const categories = ["BUAH-BUAHAN", "SAYUR-SAYURAN", "KONTAN", "KELAPA"];
        
        categories.forEach(cat => {
            let totalSasaran = 0;
            let totalActual = 0;

            // Kira Sasaran dari Sheet (ikut filter negeri)
            Object.keys(this.targetData).forEach(neg => {
                if(filterNegeri.length === 0 || filterNegeri.includes(neg)) {
                    totalSasaran += (this.targetData[neg][cat] || 0);
                }
            });

            // Kira Pencapaian dari Data Bancian (AppState.mData)
            AppState.mData.forEach(d => {
                if((filterNegeri.length === 0 || filterNegeri.includes(d.n)) && d.kt === cat) {
                    totalActual += (parseFloat(d.lt) || 0);
                }
            });

            const peratus = totalSasaran > 0 ? Math.min(100, (totalActual / totalSasaran) * 100).toFixed(1) : 0;
            const barColor = peratus >= 80 ? 'bg-success' : (peratus >= 50 ? 'bg-warning' : 'bg-danger');

            tbody.innerHTML += `
                <tr>
                    <td class="fw-bold">${cat}</td>
                    <td class="text-center">${totalSasaran.toLocaleString()} Ha</td>
                    <td class="text-center text-primary fw-bold">${totalActual.toLocaleString()} Ha</td>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="progress flex-grow-1" style="height: 10px;">
                                <div class="progress-bar ${barColor}" style="width: ${peratus}%"></div>
                            </div>
                            <span class="ms-2 fw-bold small">${peratus}%</span>
                        </div>
                    </td>
                </tr>`;
        });
    },

    renderLiputanTable: function(filterNegeri) {
        const tbody = document.querySelector('#tableKPILiputan tbody');
        tbody.innerHTML = '';

        // Jika tiada filter, kita tunjuk semua negeri yang ada dalam sasaran
        const listNegeri = filterNegeri.length > 0 ? filterNegeri : Object.keys(this.targetCrops).sort();

        listNegeri.forEach(neg => {
            const sasaranTanaman = this.targetCrops[neg] || [];
            if(sasaranTanaman.length === 0) return;

            // Cari apa yang pegawai DAH banci untuk negeri ini
            const tanamanDahBanci = [...new Set(AppState.mData
                .filter(d => d.n === neg)
                .map(d => (d.tn || "").toUpperCase())
            )];

            // Pecahkan kepada kategori (untuk visual lebih kemas)
            // Di sini kita buat satu baris setiap negeri
            
            // 1. Semak Tick ✅
            const listWithTicks = sasaranTanaman.map(t => {
                const isDone = tanamanDahBanci.includes(t);
                return isDone ? `<span class="text-success fw-bold" title="Sudah Dipantau">✅ ${t}</span>` : `<span class="text-muted">${t}</span>`;
            }).join(', ');

            // 2. Semak Tanaman Luar Sasaran (Extra)
            const extraCrops = tanamanDahBanci.filter(t => !sasaranTanaman.includes(t));
            const extraHTML = extraCrops.length > 0 ? `<span class="badge bg-info text-dark">${extraCrops.join(', ')}</span>` : `<small class="text-muted">-</small>`;

            tbody.innerHTML += `
                <tr>
                    <td class="fw-bold text-center text-uppercase">${neg}</td>
                    <td class="small text-center text-muted">PELBAGAI</td>
                    <td class="small">${listWithTicks}</td>
                    <td class="text-center" style="font-size: 1.2rem;">${tanamanDahBanci.filter(t => sasaranTanaman.includes(t)).length >= sasaranTanaman.length ? '🏆' : '-'}</td>
                    <td>${extraHTML}</td>
                </tr>`;
        });
    },

    printPDF: function() {
        window.print(); // Browser print akan automatik guna CSS @media print
    }
};
