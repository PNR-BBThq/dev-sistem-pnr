const KPIManager = {
    targetData: null,
    targetCrops: null,
    allUniqueCrops: [],
    trendChart: null,
    stateChart: null,
    currentDrillDownState: null, // Untuk simpan state bila drill-down

    init: async function() {
        Swal.fire({ title: 'Memuatkan Data SKU...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
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
        this.renderStateChart(currentNegeri); // Graf Bar Perbandingan Negeri
        this.renderTrendChart(currentNegeri); // Graf Trend (Fix kumulatif)
        this.renderMatrixGrid(currentNegeri);
        this.renderExtraCrops(currentNegeri);
        this.renderPrintSummaryTable(currentNegeri);
    },

    // 1. KPI CARDS (Dikekalkan)
    renderKPICards: function(filterNegeri) {
        const container = document.getElementById('kpiCardsModern');
        if(!container) return; container.innerHTML = '';
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
                    let isMatch = (cat.id === "BUAH-BUAHAN" && dbKat.includes("BUAH")) || 
                                 (cat.id === "SAYUR-SAYURAN" && dbKat.includes("SAYUR")) || 
                                 (cat.id === "KONTAN" && (dbKat.includes("KONTAN") || dbKat.includes("SINGKAT") || dbKat.includes("LAIN"))) ||
                                 (cat.id === "KELAPA" && (dbKat.includes("KELAPA") || dbKat.includes("INDUSTRI") || (d.tn||"").toUpperCase().includes("KELAPA")));
                    if (isMatch) totalActual += (parseFloat(d.lt) || 0);
                }
            });
            const peratus = totalSasaran > 0 ? Math.min(100, (totalActual / totalSasaran) * 100).toFixed(1) : 0;
            container.innerHTML += `<div class="col-sm-6 col-xl-3"><div class="card border-0 shadow-sm h-100" style="border-radius: 12px; border-left: 5px solid var(--bs-${cat.color}) !important;"><div class="card-body p-3"><div class="d-flex justify-content-between align-items-center mb-2"><h6 class="fw-bold text-muted small m-0">${cat.label}</h6><i class="bi ${cat.icon} text-${cat.color}"></i></div><h4 class="fw-bold mb-1">${totalActual.toLocaleString(undefined,{maximumFractionDigits:1})} <small class="text-muted" style="font-size:0.7rem">Ha</small></h4><div class="d-flex justify-content-between small"><span class="text-muted">Prestasi</span><span class="fw-bold text-${cat.color}">${peratus}%</span></div><div class="progress mt-2" style="height: 5px;"><div class="progress-bar bg-${cat.color}" style="width: ${peratus}%"></div></div></div></div></div>`;
        });
    },

    // 2. GRAF PERBANDINGAN NEGERI (DRILL-DOWN)
    renderStateChart: function(filterNegeri) {
        const ctx = document.getElementById('stateAchievementChart');
        if(!ctx) return;
        if(this.stateChart) this.stateChart.destroy();

        let labels = [], data = [], colors = [];
        const stateList = filterNegeri.length > 0 ? filterNegeri : Object.keys(this.targetCrops).sort();

        if (this.currentDrillDownState) {
            // LEVEL 2: Pecahan Kategori bagi 1 Negeri
            document.getElementById('stateChartTitle').innerHTML = `<i class="bi bi-pie-chart-fill me-2 text-primary"></i> Pecahan Kategori: ${this.currentDrillDownState}`;
            document.getElementById('btnBackState').style.display = 'block';
            const categories = ["BUAH-BUAHAN", "SAYUR-SAYURAN", "KONTAN", "KELAPA"];
            labels = categories;
            colors = ['#198754', '#0d6efd', '#ffc107', '#0dcaf0'];
            
            categories.forEach(cat => {
                let area = 0;
                AppState.mData.forEach(d => {
                    if(d.n === this.currentDrillDownState) {
                        let dbKat = (d.kt || "").toUpperCase();
                        let isMatch = (cat === "BUAH-BUAHAN" && dbKat.includes("BUAH")) || 
                                     (cat === "SAYUR-SAYURAN" && dbKat.includes("SAYUR")) || 
                                     (cat === "KONTAN" && (dbKat.includes("KONTAN") || dbKat.includes("SINGKAT") || dbKat.includes("LAIN"))) ||
                                     (cat === "KELAPA" && (dbKat.includes("KELAPA") || dbKat.includes("INDUSTRI") || (d.tn||"").toUpperCase().includes("KELAPA")));
                        if(isMatch) area += (parseFloat(d.lt) || 0);
                    }
                });
                data.push(area.toFixed(2));
            });
        } else {
            // LEVEL 1: Perbandingan Semua Negeri
            document.getElementById('stateChartTitle').innerHTML = `<i class="bi bi-bar-chart-fill me-2"></i> Perbandingan Luas Pencapaian Mengikut Negeri (Ha)`;
            document.getElementById('btnBackState').style.display = 'none';
            stateList.forEach(neg => {
                labels.push(neg.replace("W.P. ", ""));
                let total = 0;
                AppState.mData.forEach(d => { if(d.n === neg) total += (parseFloat(d.lt) || 0); });
                data.push(total.toFixed(2));
                colors.push('#6c757d');
            });
        }

        const self = this;
        this.stateChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: labels, datasets: [{ data: data, backgroundColor: colors, borderRadius: 5 }] },
            options: {
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                onClick: (e, elements) => {
                    if (elements.length > 0 && !self.currentDrillDownState) {
                        const idx = elements[0].index;
                        const stateSelected = stateList[idx];
                        self.currentDrillDownState = stateSelected;
                        self.renderStateChart(filterNegeri);
                    }
                }
            }
        });
    },

    backToAllStates: function() {
        this.currentDrillDownState = null;
        this.renderStateChart(FilterManager.v('selNegeri'));
    },

    // 3. GRAF TREND (FIX: Cut off at current month)
    renderTrendChart: function(filterNegeri) {
        const ctx = document.getElementById('skuTrendChart');
        if(!ctx) return;
        if(this.trendChart) this.trendChart.destroy();

        const bulanLabelsAll = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];
        const currentMonthIdx = new Date().getMonth(); // 0 = Jan, 4 = Mei
        
        let monthlyData = new Array(12).fill(0);
        AppState.mData.forEach(d => {
            if(filterNegeri.length === 0 || filterNegeri.includes(d.n)) {
                const date = new Date(d.t);
                if(!isNaN(date)) monthlyData[date.getMonth()] += (parseFloat(d.lt) || 0);
            }
        });

        let cumulative = 0;
        let kumulatifData = monthlyData.map(v => cumulative += v);

        // Potong label dan data supaya tak tunjuk Jun - Dis jika belum sampai tarikhnya
        const slicedLabels = bulanLabelsAll.slice(0, currentMonthIdx + 1);
        const slicedData = kumulatifData.slice(0, currentMonthIdx + 1);

        this.trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: slicedLabels,
                datasets: [{
                    label: 'Luas Kumulatif (Ha)',
                    data: slicedData,
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4
                }]
            },
            options: { 
                maintainAspectRatio: false, 
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    },

    // 4. EXTRA CROPS (FIX: Grid Card Kemas)
    renderExtraCrops: function(filterNegeri) {
        const container = document.getElementById('extraCropsContainer');
        if(!container) return;
        container.innerHTML = '';
        
        const states = filterNegeri.length > 0 ? filterNegeri : Object.keys(this.targetCrops).sort();
        let hasData = false;

        states.forEach(neg => {
            const sasaran = this.targetCrops[neg] || [];
            let extra = new Set();
            AppState.mData.forEach(d => { 
                if(d.n === neg) { 
                    let t = (d.tn || "").toUpperCase().trim(); 
                    if(!sasaran.includes(t) && t !== "") extra.add(t); 
                } 
            });

            if(extra.size > 0) {
                hasData = true;
                const col = document.createElement('div');
                col.className = 'col';
                col.innerHTML = `
                    <div class="card h-100 border shadow-sm" style="border-radius: 10px;">
                        <div class="card-header bg-white py-2 fw-bold text-primary small border-0">${neg}</div>
                        <div class="card-body pt-0 pb-3">
                            <div class="d-flex flex-wrap gap-1">
                                ${Array.from(extra).map(c => `<span class="badge bg-info bg-opacity-10 text-dark border border-info-subtle" style="font-size:0.65rem">${c}</span>`).join('')}
                            </div>
                        </div>
                    </div>`;
                container.appendChild(col);
            }
        });

        if(!hasData) container.innerHTML = '<div class="col-12 text-center text-muted fst-italic">Tiada tanaman luar sasaran dikesan.</div>';
    },

    // Matrix Grid & PDF Summary (Dikekalkan logic asal Tuan)
    renderMatrixGrid: function(filterNegeri) {
        const thead = document.getElementById('matrixHead');
        const tbody = document.getElementById('matrixBody');
        if(!thead || !tbody) return;
        let states = (AppState.uProf.state !== "ALL") ? [AppState.uProf.state] : (filterNegeri.length > 0 ? filterNegeri : Object.keys(this.targetCrops).sort());
        let headHTML = `<tr><th class="bg-dark text-white text-start px-3" style="width:180px;">NAMA TANAMAN</th>`;
        states.forEach(neg => headHTML += `<th style="min-width: 90px;">${neg.replace("NEGERI SEMBILAN", "N. SEMBILAN").replace("W.P. ", "").replace("PULAU PINANG", "P. PINANG")}</th>`);
        thead.innerHTML = headHTML + `</tr>`;
        let bodyHTML = '';
        this.allUniqueCrops.forEach(crop => {
            let rowHTML = `<tr><td class="text-start fw-bold px-3 bg-light" style="font-size:0.75rem">${crop}</td>`;
            states.forEach(neg => {
                const targetList = this.targetCrops[neg] || [];
                if(!targetList.includes(crop)) rowHTML += `<td class="bg-light opacity-50 small text-muted">-</td>`;
                else {
                    const stats = this.getCropStats(neg, crop);
                    if(stats.count > 0) rowHTML += `<td><button class="btn btn-sm btn-success py-0 px-2 shadow-sm d-print-none" onclick="KPIManager.showDetails('${neg}', '${crop}', ${stats.count}, ${stats.area})">✅</button><span class="d-none d-print-block text-success fw-bold">✅</span></td>`;
                    else rowHTML += `<td><div class="text-muted small">⭕</div></td>`;
                }
            });
            bodyHTML += rowHTML + `</tr>`;
        });
        tbody.innerHTML = bodyHTML;
    },

    getCropStats: function(negeri, cropName) {
        let count = 0, area = 0;
        AppState.mData.forEach(d => { if(d.n === negeri && (d.tn || "").toUpperCase().trim() === cropName) { count++; area += (parseFloat(d.lt) || 0); } });
        return { count: count, area: area };
    },

    showDetails: function(negeri, crop, bilLokasi, luas) {
        Swal.fire({ title: `<small class="text-muted">${negeri}</small><br>${crop}`, html: `<div class="row mt-3"><div class="col-6 border-end"><h3 class="fw-bold">${bilLokasi}</h3><small class="text-muted">LOKASI</small></div><div class="col-6"><h3 class="fw-bold text-primary">${luas.toFixed(1)}</h3><small class="text-muted">HEKTAR</small></div></div>`, confirmButtonText: 'Tutup' });
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
