const KPIManager = {
    targetData: null,
    targetCrops: null,
    allUniqueCrops: [],
    trendChart: null,

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
        this.renderTrendChart(currentNegeri); // Tambah Trend
        this.renderMatrixGrid(currentNegeri);
        this.renderExtraCrops(currentNegeri);
        this.renderPrintSummaryTable(currentNegeri);
    },

    renderKPICards: function(filterNegeri) {
        const container = document.getElementById('kpiCardsModern');
        if(!container) return;
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
                    let dbKat = (d.kt || "").toUpperCase();
                    let dbTan = (d.tn || "").toUpperCase();
                    let isMatch = false;
                    if (cat.id === "BUAH-BUAHAN" && dbKat.includes("BUAH")) isMatch = true;
                    else if (cat.id === "SAYUR-SAYURAN" && dbKat.includes("SAYUR")) isMatch = true;
                    else if (cat.id === "KONTAN" && (dbKat.includes("KONTAN") || dbKat.includes("SINGKAT") || dbKat.includes("LAIN"))) isMatch = true;
                    else if (cat.id === "KELAPA" && (dbKat.includes("KELAPA") || dbKat.includes("INDUSTRI") || dbTan.includes("KELAPA"))) isMatch = true;
                    if (isMatch) totalActual += (parseFloat(d.lt) || 0);
                }
            });
            const peratus = totalSasaran > 0 ? Math.min(100, (totalActual / totalSasaran) * 100).toFixed(1) : 0;
            container.innerHTML += `
                <div class="col-sm-6 col-xl-3">
                    <div class="card border-0 shadow-sm h-100" style="border-radius: 15px;">
                        <div class="card-body p-4">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <h6 class="fw-bold text-muted text-uppercase m-0" style="font-size: 0.7rem;">${cat.label}</h6>
                                <div class="bg-${cat.color} bg-opacity-10 text-${cat.color} rounded-circle d-flex align-items-center justify-content-center" style="width: 35px; height: 35px;"><i class="bi ${cat.icon}"></i></div>
                            </div>
                            <h3 class="fw-bold mb-1">${totalActual.toLocaleString(undefined,{maximumFractionDigits:1})} <small style="font-size:0.8rem">Ha</small></h3>
                            <div class="d-flex justify-content-between small mb-1"><span>Prestasi</span><span class="fw-bold">${peratus}%</span></div>
                            <div class="progress" style="height: 6px;"><div class="progress-bar bg-${cat.color}" style="width: ${peratus}%"></div></div>
                        </div>
                    </div>
                </div>`;
        });
    },

    renderTrendChart: function(filterNegeri) {
        const ctx = document.getElementById('skuTrendChart');
        if(!ctx) return;
        if(this.trendChart) this.trendChart.destroy();

        const bulanLabels = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];
        let monthlyData = new Array(12).fill(0);

        AppState.mData.forEach(d => {
            if(filterNegeri.length === 0 || filterNegeri.includes(d.n)) {
                // Parse tarikh "2026-05-08" atau "08/05/2026"
                const date = new Date(d.t);
                if(!isNaN(date)) {
                    const month = date.getMonth();
                    monthlyData[month] += (parseFloat(d.lt) || 0);
                }
            }
        });

        // Jadikan Kumulatif
        let cumulative = 0;
        let kumulatifData = monthlyData.map(v => cumulative += v);

        this.trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: bulanLabels,
                datasets: [{
                    label: 'Luas Bancian Kumulatif (Ha)',
                    data: kumulatifData,
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5
                }]
            },
            options: { maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    },

    renderMatrixGrid: function(filterNegeri) {
        const thead = document.getElementById('matrixHead');
        const tbody = document.getElementById('matrixBody');
        if(!thead || !tbody) return;
        
        // PENTING: Jika bukan ADMIN, paksa guna negeri user sahaja
        let states = [];
        if (AppState.uProf.state !== "ALL") {
            states = [AppState.uProf.state];
        } else {
            states = filterNegeri.length > 0 ? filterNegeri : Object.keys(this.targetCrops).sort();
        }
        
        let headHTML = `<tr><th class="bg-dark text-white text-start px-3" style="width:180px;">NAMA TANAMAN</th>`;
        states.forEach(neg => {
            let shortNeg = neg.replace("NEGERI SEMBILAN", "N. SEMBILAN").replace("W.P. ", "").replace("PULAU PINANG", "P. PINANG");
            headHTML += `<th style="min-width: 95px;">${shortNeg}</th>`;
        });
        headHTML += `</tr>`;
        thead.innerHTML = headHTML;

        let bodyHTML = '';
        this.allUniqueCrops.forEach(crop => {
            let rowHTML = `<tr><td class="text-start fw-bold px-3 bg-light" style="font-size:0.75rem">${crop}</td>`;
            states.forEach(neg => {
                const targetList = this.targetCrops[neg] || [];
                if(!targetList.includes(crop)) {
                    rowHTML += `<td class="bg-light opacity-50 small text-muted">-</td>`;
                } else {
                    const stats = this.getCropStats(neg, crop);
                    if(stats.count > 0) {
                        rowHTML += `<td><button class="btn btn-sm btn-success py-0 px-2 shadow-sm d-print-none" onclick="KPIManager.showDetails('${neg}', '${crop}', ${stats.count}, ${stats.area})">✅</button><span class="d-none d-print-block text-success">✅</span></td>`;
                    } else {
                        rowHTML += `<td><div class="text-muted small">⭕</div></td>`;
                    }
                }
            });
            rowHTML += `</tr>`;
            bodyHTML += rowHTML;
        });
        tbody.innerHTML = bodyHTML;
    },

    getCropStats: function(negeri, cropName) {
        let count = 0, area = 0;
        AppState.mData.forEach(d => {
            if(d.n === negeri && (d.tn || "").toUpperCase().trim() === cropName) {
                count++; area += (parseFloat(d.lt) || 0);
            }
        });
        return { count: count, area: area };
    },

    showDetails: function(negeri, crop, bilLokasi, luas) {
        Swal.fire({
            title: `<small class="text-muted">${negeri}</small><br>${crop}`,
            html: `<div class="row mt-3"><div class="col-6 border-end"><h3 class="fw-bold">${bilLokasi}</h3><small class="text-muted">LOKASI</small></div><div class="col-6"><h3 class="fw-bold text-primary">${luas.toFixed(1)}</h3><small class="text-muted">HEKTAR</small></div></div>`,
            confirmButtonText: 'Tutup'
        });
    },

    renderExtraCrops: function(filterNegeri) {
        const container = document.getElementById('extraCropsContainer');
        if(!container) return;
        const states = filterNegeri.length > 0 ? filterNegeri : Object.keys(this.targetCrops).sort();
        let html = '<div class="row g-3">';
        states.forEach(neg => {
            const sasaran = this.targetCrops[neg] || [];
            let extra = new Set();
            AppState.mData.forEach(d => { if(d.n === neg) { let t = (d.tn || "").toUpperCase(); if(!sasaran.includes(t) && t !== "") extra.add(t); } });
            if(extra.size > 0) {
                html += `<div class="col-md-4"><div class="p-2 bg-white border rounded shadow-sm"><small class="fw-bold d-block border-bottom mb-1">${neg}</small><div class="d-flex flex-wrap gap-1">${Array.from(extra).map(c => `<span class="badge bg-light text-dark border" style="font-size:0.65rem">${c}</span>`).join('')}</div></div></div>`;
            }
        });
        container.innerHTML = html === '<div class="row g-3"></div>' ? '<small class="text-muted">Tiada data luar sasaran.</small>' : html + '</div>';
    },

    renderPrintSummaryTable: function(filterNegeri) {
        const tbody = document.querySelector('#printSummaryTable tbody');
        if(!tbody) return;
        let sum = {};
        AppState.mData.forEach(d => {
            if(filterNegeri.length === 0 || filterNegeri.includes(d.n)) {
                let k = (d.kt || "LAIN").toUpperCase(); let t = (d.tn || "TIADA").toUpperCase();
                let key = k + "_" + t;
                if(!sum[key]) sum[key] = { k: k, t: t, c: 0, l: 0 };
                sum[key].c++; sum[key].l += (parseFloat(d.lt) || 0);
            }
        });
        const keys = Object.keys(sum).sort();
        tbody.innerHTML = keys.length ? keys.map(k => `<tr><td>${sum[k].k}</td><td>${sum[k].t}</td><td class="text-center">${sum[k].c}</td><td class="text-center">${sum[k].l.toFixed(2)}</td></tr>`).join('') : '<tr><td colspan="4">Tiada data.</td></tr>';
    },

    printPDF: function() { window.print(); }
};
