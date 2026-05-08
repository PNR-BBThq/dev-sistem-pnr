const KPIManager = {
    targetData: null,
    targetCrops: null,
    allUniqueCrops: [],
    trendChart: null,
    stateChart: null,
    currentDrillDownState: null,

    getEffectiveState: function(d) {
        const negeri = (d.n || "").toUpperCase().trim();
        const daerah = (d.d || "").toUpperCase().trim();
        if (negeri === "PAHANG" && (daerah === "CAMERON HIGHLANDS" || daerah === "C. HIGHLANDS")) {
            return "CAMERON HIGHLANDS";
        }
        return negeri;
    },

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
        this.renderStateChart(currentNegeri);
        this.renderTrendChart(currentNegeri); 
        this.renderMatrixGrid(currentNegeri);
        this.renderExtraCrops(currentNegeri);
        this.renderPrintSummaryTable(currentNegeri);
    },

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
            Object.keys(this.targetData).forEach(negKey => {
                if(filterNegeri.length === 0 || filterNegeri.includes(negKey)) totalSasaran += (this.targetData[negKey][cat.id] || 0);
            });
            AppState.mData.forEach(d => {
                const effNegeri = this.getEffectiveState(d);
                if(filterNegeri.length === 0 || filterNegeri.includes(effNegeri)) {
                    let dbKat = (d.kt || "").toUpperCase();
                    let isMatch = (cat.id === "BUAH-BUAHAN" && dbKat.includes("BUAH")) || (cat.id === "SAYUR-SAYURAN" && dbKat.includes("SAYUR")) || (cat.id === "KONTAN" && (dbKat.includes("KONTAN") || dbKat.includes("SINGKAT") || dbKat.includes("LAIN"))) || (cat.id === "KELAPA" && (dbKat.includes("KELAPA") || dbKat.includes("INDUSTRI") || (d.tn||"").toUpperCase().includes("KELAPA")));
                    if (isMatch) totalActual += (parseFloat(d.lt) || 0);
                }
            });
            const peratus = totalSasaran > 0 ? Math.min(100, (totalActual / totalSasaran) * 100).toFixed(1) : 0;
            container.innerHTML += `<div class="col-sm-6 col-xl-3"><div class="card border-0 shadow-sm h-100" style="border-radius: 12px; border-left: 5px solid var(--bs-${cat.color}) !important;"><div class="card-body p-3"><div class="d-flex justify-content-between align-items-center mb-2"><h6 class="fw-bold text-muted small m-0">${cat.label}</h6><i class="bi ${cat.icon} text-${cat.color}"></i></div><h4 class="fw-bold mb-1">${totalActual.toLocaleString(undefined,{maximumFractionDigits:1})} <small class="text-muted" style="font-size:0.7rem">Ha</small></h4><div class="d-flex justify-content-between small"><span class="text-muted">Prestasi</span><span class="fw-bold text-${cat.color}">${peratus}%</span></div><div class="progress mt-2" style="height: 5px;"><div class="progress-bar bg-${cat.color}" style="width: ${peratus}%"></div></div></div></div></div>`;
        });
    },

    renderStateChart: function(filterNegeri) {
        const ctx = document.getElementById('stateAchievementChart');
        if(!ctx) return;
        if(this.stateChart) this.stateChart.destroy();
        let labels = [], data = [], colors = [];
        const stateList = filterNegeri.length > 0 ? filterNegeri : Object.keys(this.targetCrops).sort();
        if (this.currentDrillDownState) {
            document.getElementById('stateChartTitle').innerHTML = `<i class="bi bi-pie-chart-fill me-2 text-primary"></i> Pecahan Kategori: ${this.currentDrillDownState}`;
            document.getElementById('btnBackState').style.display = 'block';
            const categories = ["BUAH-BUAHAN", "SAYUR-SAYURAN", "KONTAN", "KELAPA"];
            labels = categories; colors = ['#198754', '#0d6efd', '#ffc107', '#0dcaf0'];
            categories.forEach(cat => {
                let area = 0;
                AppState.mData.forEach(d => {
                    if(this.getEffectiveState(d) === this.currentDrillDownState) {
                        let dbKat = (d.kt || "").toUpperCase();
                        let isMatch = (cat === "BUAH-BUAHAN" && dbKat.includes("BUAH")) || (cat === "SAYUR-SAYURAN" && dbKat.includes("SAYUR")) || (cat === "KONTAN" && (dbKat.includes("KONTAN") || dbKat.includes("SINGKAT") || dbKat.includes("LAIN"))) || (cat === "KELAPA" && (dbKat.includes("KELAPA") || dbKat.includes("INDUSTRI") || (d.tn||"").toUpperCase().includes("KELAPA")));
                        if(isMatch) area += (parseFloat(d.lt) || 0);
                    }
                });
                data.push(area.toFixed(2));
            });
        } else {
            document.getElementById('stateChartTitle').innerHTML = `<i class="bi bi-bar-chart-fill me-2"></i> Perbandingan Luas Pencapaian Mengikut Negeri (Ha)`;
            document.getElementById('btnBackState').style.display = 'none';
            stateList.forEach(neg => {
                labels.push(neg.replace("W.P. ", "").replace("CAMERON HIGHLANDS", "C. HIGHLANDS"));
                let total = 0;
                AppState.mData.forEach(d => { if(this.getEffectiveState(d) === neg) total += (parseFloat(d.lt) || 0); });
                data.push(total.toFixed(2));
                colors.push('#6c757d');
            });
        }
        this.stateChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: labels, datasets: [{ data: data, backgroundColor: colors, borderRadius: 5 }] },
            options: {
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                onClick: (e, elements) => {
                    if (elements.length > 0 && !this.currentDrillDownState) {
                        const idx = elements[0].index;
                        this.currentDrillDownState = stateList[idx];
                        this.renderStateChart(filterNegeri);
                    }
                }
            }
        });
    },

    backToAllStates: function() { this.currentDrillDownState = null; this.renderStateChart(FilterManager.v('selNegeri')); },

    // 2. GRAF TREND BULANAN SEBENAR (NON-KUMULATIF)
    renderTrendChart: function(filterNegeri) {
        const ctx = document.getElementById('skuTrendChart');
        if(!ctx) return;
        if(this.trendChart) this.trendChart.destroy();

        const bulanLabelsAll = ["Januari", "Februari", "Mac", "April", "Mei", "Jun", "Julai", "Ogos", "September", "Oktober", "November", "Disember"];
        const currentMonthIdx = new Date().getMonth(); 
        
        let monthlyData = new Array(12).fill(0);
        AppState.mData.forEach(d => {
            const effNegeri = this.getEffectiveState(d);
            if(filterNegeri.length === 0 || filterNegeri.includes(effNegeri)) {
                const date = new Date(d.t);
                if(!isNaN(date)) monthlyData[date.getMonth()] += (parseFloat(d.lt) || 0);
            }
        });

        // Potong data setakat bulan semasa sahaja
        const slicedLabels = bulanLabelsAll.slice(0, currentMonthIdx + 1);
        const slicedData = monthlyData.slice(0, currentMonthIdx + 1);

        this.trendChart = new Chart(ctx, {
            type: 'bar', // Gunakan bar untuk pencapaian bulanan supaya nampak lebih jelas perbandingannya
            data: {
                labels: slicedLabels,
                datasets: [{
                    label: 'Luas Bancian Bulanan (Ha)',
                    data: slicedData,
                    backgroundColor: 'rgba(13, 110, 253, 0.7)',
                    borderColor: '#0d6efd',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: { 
                maintainAspectRatio: false, 
                plugins: { 
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx) => ` Pencapaian: ${ctx.raw.toFixed(2)} Ha` } }
                }, 
                scales: { 
                    y: { 
                        beginAtZero: true,
                        title: { display: true, text: 'Hektar (Ha)', font: { size: 10 } }
                    } 
                } 
            }
        });
    },

    // 3. JADUAL PDF MODEN (GROUPING CATEGORY)
    renderPrintSummaryTable: function(filterNegeri) {
        const tbody = document.querySelector('#printSummaryTable tbody');
        if(!tbody) return;
        
        let sum = {};
        AppState.mData.forEach(d => {
            const effNegeri = this.getEffectiveState(d);
            if(filterNegeri.length === 0 || filterNegeri.includes(effNegeri)) {
                let k = (d.kt || "LAIN").toUpperCase().trim(); 
                let t = (d.tn || "TIADA").toUpperCase().trim();
                let key = k + "_" + t;
                if(!sum[key]) sum[key] = { k: k, t: t, c: 0, l: 0 };
                sum[key].c++; 
                sum[key].l += (parseFloat(d.lt) || 0);
            }
        });

        // Susun data mengikut Kategori (A-Z) kemudian Tanaman (A-Z)
        const sortedItems = Object.values(sum).sort((a, b) => {
            if (a.k < b.k) return -1;
            if (a.k > b.k) return 1;
            if (a.t < b.t) return -1;
            if (a.t > b.t) return 1;
            return 0;
        });

        if (sortedItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center p-4 text-muted">Tiada data untuk dipaparkan</td></tr>';
            return;
        }

        let html = '';
        let currentCategory = '';
        let subTotalLokasi = 0;
        let subTotalLuas = 0;

        sortedItems.forEach((item, index) => {
            // Jika kategori berubah, buat Header Row baru
            if (item.k !== currentCategory) {
                // Tambah subtotal untuk kategori sebelumnya (kecuali yang pertama)
                if (currentCategory !== '') {
                    html += `
                        <tr class="table-light fw-bold" style="background-color: #f1f5f9 !important;">
                            <td class="text-end text-uppercase" style="font-size: 0.7rem;">JUMLAH ${currentCategory}</td>
                            <td class="text-center">${subTotalLokasi}</td>
                            <td class="text-center">${subTotalLuas.toFixed(2)}</td>
                        </tr>
                    `;
                }

                // Reset subtotal
                subTotalLokasi = 0;
                subTotalLuas = 0;
                currentCategory = item.k;

                // Header Kategori
                html += `
                    <tr style="background-color: #e2e8f0 !important;">
                        <td colspan="3" class="fw-bold text-primary py-2 px-3">
                            <i class="bi bi-tag-fill me-1"></i> KATEGORI: ${currentCategory}
                        </td>
                    </tr>
                `;
            }

            // Baris Data Tanaman
            html += `
                <tr>
                    <td class="ps-4 text-dark" style="letter-spacing: 0.5px;">${item.t}</td>
                    <td class="text-center">${item.c}</td>
                    <td class="text-center">${item.l.toFixed(2)}</td>
                </tr>
            `;

            subTotalLokasi += item.c;
            subTotalLuas += item.l;

            // Jika baris terakhir, tambah subtotal terakhir
            if (index === sortedItems.length - 1) {
                html += `
                    <tr class="table-light fw-bold" style="background-color: #f1f5f9 !important;">
                        <td class="text-end text-uppercase" style="font-size: 0.7rem;">JUMLAH ${currentCategory}</td>
                        <td class="text-center">${subTotalLokasi}</td>
                        <td class="text-center">${subTotalLuas.toFixed(2)}</td>
                    </tr>
                `;
            }
        });

        tbody.innerHTML = html;
    },

    // Matrix Grid, Extra Crops, & Utils (Dikekalkan)
    renderMatrixGrid: function(filterNegeri) {
        const thead = document.getElementById('matrixHead');
        const tbody = document.getElementById('matrixBody');
        if(!thead || !tbody) return;
        let states = (AppState.uProf.state !== "ALL") ? [(AppState.uProf.state === "PAHANG" && AppState.uProf.daerah === "CAMERON HIGHLANDS") ? "CAMERON HIGHLANDS" : AppState.uProf.state] : (filterNegeri.length > 0 ? filterNegeri : Object.keys(this.targetCrops).sort());
        let headHTML = `<tr><th class="bg-dark text-white text-start px-3" style="width:180px;">NAMA TANAMAN</th>`;
        states.forEach(neg => headHTML += `<th style="min-width: 90px;">${neg.replace("NEGERI SEMBILAN", "N. SEMBILAN").replace("W.P. ", "").replace("PULAU PINANG", "P. PINANG").replace("CAMERON HIGHLANDS", "C. HIGHLANDS")}</th>`);
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
        AppState.mData.forEach(d => { if(this.getEffectiveState(d) === negeri && (d.tn || "").toUpperCase().trim() === cropName) { count++; area += (parseFloat(d.lt) || 0); } });
        return { count: count, area: area };
    },
    showDetails: function(negeri, crop, bilLokasi, luas) {
        Swal.fire({ title: `<small class="text-muted">${negeri}</small><br>${crop}`, html: `<div class="row mt-3"><div class="col-6 border-end"><h3 class="fw-bold">${bilLokasi}</h3><small class="text-muted">LOKASI</small></div><div class="col-6"><h3 class="fw-bold text-primary">${luas.toFixed(1)}</h3><small class="text-muted">HEKTAR</small></div></div>`, confirmButtonText: 'Tutup' });
    },
    renderExtraCrops: function(filterNegeri) {
        const container = document.getElementById('extraCropsContainer');
        if(!container) return; container.innerHTML = '';
        const states = filterNegeri.length > 0 ? filterNegeri : Object.keys(this.targetCrops).sort();
        let hasData = false;
        states.forEach(neg => {
            const sasaran = this.targetCrops[neg] || [];
            let extra = new Set();
            AppState.mData.forEach(d => { if(this.getEffectiveState(d) === neg) { let t = (d.tn || "").toUpperCase().trim(); if(!sasaran.includes(t) && t !== "") extra.add(t); } });
            if(extra.size > 0) {
                hasData = true;
                const col = document.createElement('div'); col.className = 'col';
                col.innerHTML = `<div class="card h-100 border shadow-sm" style="border-radius: 10px;"><div class="card-header bg-white py-2 fw-bold text-primary small border-0">${neg}</div><div class="card-body pt-0 pb-3"><div class="d-flex flex-wrap gap-1">${Array.from(extra).map(c => `<span class="badge bg-info bg-opacity-10 text-dark border border-info-subtle" style="font-size:0.65rem">${c}</span>`).join('')}</div></div></div>`;
                container.appendChild(col);
            }
        });
        if(!hasData) container.innerHTML = '<div class="col-12 text-center text-muted fst-italic py-3">Tiada tanaman luar sasaran dikesan.</div>';
    },
    printPDF: function() { window.print(); }
};
