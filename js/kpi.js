// ==========================================
// FAIL: js/kpi.js
// FUNGSI: Menguruskan Pengiraan & Paparan KPI SKU Moden
// ==========================================

const KPIManager = {
    targetData: null,
    targetCrops: null,
    allUniqueCrops: [],

    init: async function() {
        Swal.fire({ title: 'Memuatkan Data...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            const r = await API.postData('getKPIData', {});
            Swal.close();
            if(r.success) {
                this.targetData = r.dataSasaran;
                this.targetCrops = r.dataSenarai;
                this.extractUniqueCrops();
                this.renderDashboard();
            } else { alert("Gagal ambil data sasaran: " + r.message); }
        } catch(e) { Swal.close(); console.error(e); }
    },

    extractUniqueCrops: function() {
        let crops = new Set();
        Object.values(this.targetCrops).forEach(arr => arr.forEach(t => crops.add(t)));
        this.allUniqueCrops = Array.from(crops).sort();
    },

    renderDashboard: function() {
        const currentNegeri = FilterManager.v('selNegeri'); 
        this.renderKPICards(currentNegeri);
        this.renderMatrixGrid(currentNegeri);
        this.renderExtraCrops(currentNegeri);
        this.renderPrintSummaryTable(currentNegeri);
    },

    // 1. KAD KPI MODEN
    renderKPICards: function(filterNegeri) {
        const container = document.getElementById('kpiCardsModern');
        container.innerHTML = '';
        
        const categories = [
            { id: "BUAH-BUAHAN", label: "Buah-buahan", icon: "bi-apple", color: "success" },
            { id: "SAYUR-SAYURAN", label: "Sayur-sayuran", icon: "bi-flower3", color: "primary" },
            { id: "KONTAN", label: "Kontan / Lain", icon: "bi-tree-fill", color: "warning" },
            { id: "KELAPA", label: "Kelapa / Industri", icon: "bi-droplet-half", color: "info" }
        ];
        
        categories.forEach(cat => {
            let totalSasaran = 0, totalActual = 0;

            Object.keys(this.targetData).forEach(neg => {
                if(filterNegeri.length === 0 || filterNegeri.includes(neg)) totalSasaran += (this.targetData[neg][cat.id] || 0);
            });

            AppState.mData.forEach(d => {
                if(filterNegeri.length === 0 || filterNegeri.includes(d.n)) {
                    let dbKat = (d.kt || "").toUpperCase().trim();
                    let dbTanaman = (d.tn || "").toUpperCase().trim();
                    let isMatch = false;
                    
                    if (cat.id === "BUAH-BUAHAN" && dbKat.includes("BUAH")) isMatch = true;
                    else if (cat.id === "SAYUR-SAYURAN" && dbKat.includes("SAYUR")) isMatch = true;
                    else if (cat.id === "KONTAN" && (dbKat.includes("KONTAN") || dbKat.includes("SINGKAT") || dbKat.includes("LAIN"))) isMatch = true;
                    else if (cat.id === "KELAPA" && (dbKat.includes("KELAPA") || dbKat.includes("INDUSTRI") || dbTanaman.includes("KELAPA"))) isMatch = true;

                    if (isMatch) totalActual += (parseFloat(d.lt) || 0);
                }
            });

            const peratus = totalSasaran > 0 ? Math.min(100, (totalActual / totalSasaran) * 100).toFixed(1) : 0;
            
            container.innerHTML += `
                <div class="col-sm-6 col-xl-3">
                    <div class="card border-0 shadow-sm h-100" style="border-radius: 15px; overflow: hidden;">
                        <div class="card-body p-4 position-relative">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <h6 class="fw-bold text-muted text-uppercase m-0" style="font-size: 0.75rem; letter-spacing: 1px;">${cat.label}</h6>
                                <div class="bg-${cat.color} bg-opacity-10 text-${cat.color} rounded-circle d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                                    <i class="bi ${cat.icon} fs-5"></i>
                                </div>
                            </div>
                            <h3 class="fw-bold text-dark mb-1">${totalActual.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})} <span style="font-size:1rem;">Ha</span></h3>
                            <p class="text-muted small mb-3">Sasaran: ${totalSasaran.toLocaleString()} Ha</p>
                            
                            <div class="d-flex justify-content-between align-items-center small mb-1">
                                <span class="fw-bold text-${cat.color}">Pencapaian</span>
                                <span class="fw-bold">${peratus}%</span>
                            </div>
                            <div class="progress" style="height: 8px; border-radius: 10px;">
                                <div class="progress-bar bg-${cat.color}" style="width: ${peratus}%"></div>
                            </div>
                        </div>
                    </div>
                </div>`;
        });
    },

    // 2. MATRIK GRID (Baris: Tanaman, Lajur: Negeri)
    renderMatrixGrid: function(filterNegeri) {
        const thead = document.getElementById('matrixHead');
        const tbody = document.getElementById('matrixBody');
        
        const states = filterNegeri.length > 0 ? filterNegeri : Object.keys(this.targetCrops).sort();
        
        // Bina Header (Senarai Negeri di atas)
        let headHTML = `<tr><th class="bg-dark text-white text-start px-3" style="width:180px;">NAMA TANAMAN</th>`;
        states.forEach(neg => {
            // Potong nama negeri kalau panjang sangat untuk jimat ruang
            let shortNeg = neg.replace("NEGERI SEMBILAN", "N. SEMBILAN").replace("W.P. ", "").replace("PULAU PINANG", "P. PINANG");
            headHTML += `<th style="min-width: 90px;">${shortNeg}</th>`;
        });
        headHTML += `</tr>`;
        thead.innerHTML = headHTML;

        // Bina Body (Tanaman di kiri)
        let bodyHTML = '';
        this.allUniqueCrops.forEach(crop => {
            let rowHTML = `<tr><td class="text-start fw-bold px-3 bg-light">${crop}</td>`;
            
            states.forEach(neg => {
                const targetList = this.targetCrops[neg] || [];
                const isTarget = targetList.includes(crop);
                
                if(!isTarget) {
                    rowHTML += `<td class="bg-light opacity-50">-</td>`; // Bukan sasaran negeri ini
                } else {
                    // Semak jika dah dibanci
                    const stats = this.getCropStats(neg, crop);
                    if(stats.count > 0) {
                        rowHTML += `<td><button class="btn btn-sm btn-success w-100 fw-bold shadow-sm d-print-none" onclick="KPIManager.showDetails('${neg}', '${crop}', ${stats.count}, ${stats.area})" title="Klik untuk info">✅</button><span class="d-none d-print-block text-success fw-bold">✅</span></td>`;
                    } else {
                        rowHTML += `<td><div class="border rounded text-muted py-1" style="border-style: dashed !important; background: #fff;">⭕</div></td>`; // Kena buat, tapi belum
                    }
                }
            });
            rowHTML += `</tr>`;
            bodyHTML += rowHTML;
        });
        
        tbody.innerHTML = bodyHTML;
    },

    // Dapatkan Luas & Bil Lokasi
    getCropStats: function(negeri, cropName) {
        let count = 0, area = 0;
        AppState.mData.forEach(d => {
            if(d.n === negeri && (d.tn || "").toUpperCase().trim() === cropName) {
                // Elak kira lokasi yang sama dua kali (jika nak unik, kita set guna ID/Lokasi)
                count++; 
                area += (parseFloat(d.lt) || 0);
            }
        });
        return { count: count, area: area };
    },

    // Papar Popup SweetAlert bila klik butang ✅
    showDetails: function(negeri, crop, bilLokasi, luas) {
        Swal.fire({
            title: `<span class="text-success">${crop}</span><br><small class="text-muted">${negeri}</small>`,
            html: `
                <div class="row text-center mt-3">
                    <div class="col-6 border-end">
                        <h2 class="fw-bold text-dark mb-0">${bilLokasi}</h2>
                        <span class="text-muted small text-uppercase">Bil. Lokasi</span>
                    </div>
                    <div class="col-6">
                        <h2 class="fw-bold text-primary mb-0">${luas.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</h2>
                        <span class="text-muted small text-uppercase">Hektar (Ha)</span>
                    </div>
                </div>
            `,
            icon: 'info',
            confirmButtonText: 'Tutup',
            confirmButtonColor: '#0d6efd'
        });
    },

    // 3. TANAMAN LUAR SASARAN
    renderExtraCrops: function(filterNegeri) {
        const container = document.getElementById('extraCropsContainer');
        container.innerHTML = '';
        
        const states = filterNegeri.length > 0 ? filterNegeri : Object.keys(this.targetCrops).sort();
        let html = '<div class="row g-3">';
        
        states.forEach(neg => {
            const sasaran = this.targetCrops[neg] || [];
            let extraCrops = new Set();
            
            AppState.mData.forEach(d => {
                if(d.n === neg) {
                    let tName = (d.tn || "").toUpperCase().trim();
                    if(!sasaran.includes(tName) && tName !== "") extraCrops.add(tName);
                }
            });

            if(extraCrops.size > 0) {
                html += `
                <div class="col-md-6 col-xl-4">
                    <div class="p-3 bg-white border rounded shadow-sm h-100">
                        <h6 class="fw-bold text-dark border-bottom pb-2">${neg}</h6>
                        <div class="d-flex flex-wrap gap-1 mt-2">
                            ${Array.from(extraCrops).map(c => `<span class="badge bg-secondary bg-opacity-25 text-dark border border-secondary">${c}</span>`).join('')}
                        </div>
                    </div>
                </div>`;
            }
        });
        
        html += '</div>';
        container.innerHTML = html === '<div class="row g-3"></div>' ? '<div class="text-muted fst-italic">Tiada tanaman luar sasaran dikesan.</div>' : html;
    },

    // 4. JADUAL PDF (Luas & Lokasi setiap tanaman)
    renderPrintSummaryTable: function(filterNegeri) {
        const tbody = document.querySelector('#printSummaryTable tbody');
        tbody.innerHTML = '';
        
        // Kita satukan data mengikut Kategori & Tanaman untuk dicetak
        let summary = {};
        
        AppState.mData.forEach(d => {
            if(filterNegeri.length === 0 || filterNegeri.includes(d.n)) {
                let kat = (d.kt || "TIADA KATEGORI").toUpperCase().trim();
                let tan = (d.tn || "TIDAK DIKETAHUI").toUpperCase().trim();
                let key = kat + "_" + tan;
                
                if(!summary[key]) summary[key] = { kategori: kat, tanaman: tan, count: 0, luas: 0 };
                
                summary[key].count += 1;
                summary[key].luas += (parseFloat(d.lt) || 0);
            }
        });

        const sortedKeys = Object.keys(summary).sort();
        
        if(sortedKeys.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Tiada data bancian.</td></tr>';
            return;
        }

        sortedKeys.forEach(k => {
            let item = summary[k];
            tbody.innerHTML += `
                <tr>
                    <td class="text-muted fw-bold">${item.kategori}</td>
                    <td class="text-dark fw-bold">${item.tanaman}</td>
                    <td class="text-center">${item.count}</td>
                    <td class="text-center">${item.luas.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</td>
                </tr>
            `;
        });
    },

    printPDF: function() {
        // Guna fungsi print terbina dalam browser. 
        // Kelas CSS "d-print-none" dan "d-print-block" dalam index.html akan uruskan susun atur kertas secara automatik.
        window.print(); 
    }
};
