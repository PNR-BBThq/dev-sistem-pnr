// =======================================================================
// FAIL: js/nlp-bot.js (NLP ENGINE V5 - HIGH LITERACY & REGEX BOUNDARIES)
// =======================================================================

const SmartNLPBot = {
    kamus: {
        negeri: {
            "johor": "JOHOR", "kedah": "KEDAH", "kelantan": "KELANTAN", "klate": "KELANTAN", 
            "melaka": "MELAKA", "n9": "NEGERI SEMBILAN", "negeri sembilan": "NEGERI SEMBILAN", 
            "pahang": "PAHANG", "perak": "PERAK", "perlis": "PERLIS", "penang": "PULAU PINANG", 
            "pulau pinang": "PULAU PINANG", "sabah": "SABAH", "sarawak": "SARAWAK", 
            "selangor": "SELANGOR", "terengganu": "TERENGGANU", "kl": "W.P. KUALA LUMPUR", "labuan": "W.P. LABUAN"
        },
        kategori: {
            "buah": "BUAH-BUAHAN", "sayur": "SAYUR-SAYURAN", "kontan": "KONTAN", "kelapa": "KELAPA", "padi": "PADI"
        },
        perosakMasyhur: {
            "faw": ["FAW", "FALL ARMYWORM", "SPODOPTERA FRUGIPERDA"], 
            "ulat ratus": ["FAW", "FALL ARMYWORM"], 
            "rpw": ["RPW", "RED PALM WEEVIL", "KUMBANG MERAH"], 
            "kumbang tanduk": ["KUMBANG TANDUK", "ORYCTES RHINOCEROS"],
            "koya": ["KOYA", "MEALYBUG", "MEALY BUG"],
            "liriomyza": ["LIRIOMYZA", "PELOMBONG DAUN"],
            "apogonia": ["APOGONIA", "KUMBANG PEMAKAN DAUN"]
        }
    },

    toggle: function() {
        const win = document.getElementById('nlp-chatbot-window');
        if (win.style.display === 'flex') { win.style.display = 'none'; } 
        else { win.style.display = 'flex'; document.getElementById('nlp-chat-input').focus(); }
    },

    handleInput: function(chipText = null) {
        const inputEl = document.getElementById('nlp-chat-input');
        const text = chipText || inputEl.value;
        if (!text || text.trim() === '') return;
        
        inputEl.value = '';
        this.addMessage(text, 'user');
        
        const chatBody = document.getElementById('nlp-chat-messages');
        const loadingId = "load-" + Date.now();
        chatBody.insertAdjacentHTML('beforeend', `<div id="${loadingId}" class="chat-bubble bubble-bot text-muted small"><i class="bi bi-cpu"></i> Memproses analitik...</div>`);
        chatBody.scrollTop = chatBody.scrollHeight;

        setTimeout(() => {
            document.getElementById(loadingId).remove();
            const jawapan = this.prosesAyat(text);
            this.addMessage(jawapan, 'bot');
        }, 500);
    },

    addMessage: function(text, sender) {
        const chatBody = document.getElementById('nlp-chat-messages');
        const div = document.createElement('div');
        div.className = `chat-bubble bubble-${sender}`;
        div.innerHTML = text;
        chatBody.appendChild(div);
        chatBody.scrollTop = chatBody.scrollHeight;
    },

    getPestObj: function(dp) {
        if (!dp) return null;
        if (typeof dp === 'object') return dp; 
        if (typeof dp === 'string' && dp.includes('{')) {
            try { return JSON.parse(dp); } catch(e) { return null; }
        }
        return null;
    },

    // ALAT BANTUAN LITERASI TINGGI: Regex Word Boundary
    findEntity: function(query, entityList) {
        for (let word of entityList) {
            // Hanya tangkap perkataan penuh, bukan sebahagian perkataan.
            let regex = new RegExp("\\b" + word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "\\b", "i");
            if (regex.test(query)) return word;
        }
        return null;
    },

    // ==============================================================
    // CORE AI ENGINE V5 (HIGH DATA LITERACY)
    // ==============================================================
    prosesAyat: function(soalan) {
        const db = AppState.mData;
        if (!db || db.length === 0) return "Sistem sedang memuatkan pangkalan data. Sila cuba sebentar lagi.";

        let query = soalan.toLowerCase().trim();
        
        // 1. DATA HARVESTING (Membina Kamus Pintar dari Database)
        let dbCrops = new Set(), dbDistricts = new Set(), dbPests = new Set();
        db.forEach(d => {
            if(d.tn) {
                dbCrops.add(d.tn.toUpperCase().trim());
                // Jika nama tanaman panjang (cth: KELAPA SAWIT), pecahkan supaya user boleh sebut "SAWIT"
                d.tn.split(" ").forEach(w => { if(w.length > 3) dbCrops.add(w.toUpperCase().trim()); });
            }
            if(d.d) dbDistricts.add(d.d.toUpperCase().trim());
            let pObj = this.getPestObj(d.p);
            if(pObj) Object.keys(pObj).forEach(k => dbPests.add(k.toUpperCase().trim()));
        });

        // 2. DEEP ENTITY EXTRACTION (Menggunakan Regex Word Boundary)
        let fNegeri = null, fKategori = null, fCrop = null, fDaerah = null, fPestSearch = null, fPestDisplayName = null;

        for (let key in this.kamus.negeri) { if (new RegExp("\\b" + key + "\\b", "i").test(query)) fNegeri = this.kamus.negeri[key]; }
        for (let key in this.kamus.kategori) { if (new RegExp("\\b" + key + "\\b", "i").test(query)) fKategori = this.kamus.kategori[key]; }

        fCrop = this.findEntity(query, Array.from(dbCrops));
        fDaerah = this.findEntity(query, Array.from(dbDistricts));

        // Pengesanan Perosak Berperingkat
        for (let key in this.kamus.perosakMasyhur) { 
            if (new RegExp("\\b" + key.replace(/\s/g, '\\s?') + "\\b", "i").test(query)) {
                fPestSearch = this.kamus.perosakMasyhur[key]; 
                fPestDisplayName = this.kamus.perosakMasyhur[key][0];
                break;
            } 
        }
        if (!fPestSearch) {
            let foundPest = this.findEntity(query, Array.from(dbPests));
            if (foundPest) { fPestSearch = [foundPest]; fPestDisplayName = foundPest; }
        }

        // 3. INTENT CLASSIFICATION
        let isTopPest = /top|tinggi|teruk|utama|perosak/.test(query);
        let isLocation = /mana|lokasi|tempat|senarai|kawasan/.test(query);
        let isSummary = /rumusan|ringkas|status|statistik|jumlah|berapa/.test(query);

        if (!isTopPest && !isLocation && !isSummary && !fPestSearch && (fNegeri || fCrop || fKategori || fDaerah)) {
            isSummary = true; isTopPest = true; isLocation = true; 
        }

        // 4. PEMBINAAN TAG PENYARINGAN (UX Enhancement)
        let filterTags = [];
        if(fDaerah) filterTags.push(fDaerah);
        if(fNegeri) filterTags.push(fNegeri);
        if(fCrop) filterTags.push(fCrop);
        if(fKategori && !fCrop) filterTags.push(fKategori);
        let tagHtml = filterTags.length > 0 ? `<div class="mb-3"><span class="badge bg-primary bg-opacity-10 text-primary border border-primary px-2 py-1"><i class="bi bi-funnel-fill"></i> Data: ${filterTags.join(" | ")}</span></div>` : ``;

        // -------------------------------------------------------------
        // RESPON A: SPECIFIC PEST (Cth: "Mana serangan FAW?")
        // -------------------------------------------------------------
        if (fPestSearch) {
            let senaraiLokasi = [];
            db.forEach(d => {
                let matchCrop = !fCrop || (d.tn||"").toUpperCase().includes(fCrop);
                if((!fNegeri || (d.n||"").toUpperCase().includes(fNegeri)) && matchCrop) {
                    let pObj = this.getPestObj(d.p);
                    if (pObj) {
                        let matchKey = Object.keys(pObj).find(dbKey => fPestSearch.some(synonym => dbKey.toUpperCase().includes(synonym)));
                        if(matchKey && parseFloat(pObj[matchKey]) > 0) {
                            senaraiLokasi.push({ lok: d.l, daerah: d.d, neg: d.n, tanam: d.tn, luas: parseFloat(pObj[matchKey]) });
                        }
                    }
                }
            });

            if(senaraiLokasi.length === 0) return `${tagHtml}✅ Tiada rekod serangan aktif bagi <b>${fPestDisplayName}</b> dalam parameter ini.`;
            senaraiLokasi.sort((a,b) => b.luas - a.luas);
            
            let html = `${tagHtml}🐛 <b>Jejak Kawasan ${fPestDisplayName}:</b><br>`;
            senaraiLokasi.slice(0, 5).forEach((x, i) => html += `<div class="mt-2" style="font-size:0.8rem; border-left: 3px solid #dc3545; padding-left:8px; background:#fff5f5; border-radius:0 4px 4px 0; padding-top:4px; padding-bottom:4px;"><b>${i+1}. ${x.lok}</b> (${x.daerah||x.neg})<br><span class="text-muted">🌱 ${x.tanam} | ⚠️ <b>${x.luas.toFixed(2)} Ha</b></span></div>`);
            return html;
        }

        // -------------------------------------------------------------
        // RESPON B: DATA PIVOTING & MULTI-INTENT DASHBOARD
        // -------------------------------------------------------------
        let htmlResponse = tagHtml;
        let hasData = false;

        // B1. KIRAAN RUMUSAN TEPAT
        if (isSummary || (!isTopPest && !isLocation)) {
            let tTanam = 0, tSerang = 0;
            db.forEach(d => { 
                let matchCrop = !fCrop || (d.tn||"").toUpperCase().includes(fCrop);
                if((!fNegeri || (d.n||"").toUpperCase().includes(fNegeri)) && 
                   (!fDaerah || (d.d||"").toUpperCase().includes(fDaerah)) &&
                   (!fKategori || (d.kt||"").toUpperCase().includes(fKategori)) && matchCrop) {
                    tTanam += (parseFloat(d.lt)||0); tSerang += (parseFloat(d.ls)||0); 
                }
            });
            let pct = tTanam > 0 ? ((tSerang/tTanam)*100).toFixed(2) : 0;
            if(tTanam > 0) {
                htmlResponse += `<div class="bg-light p-2 rounded border mb-2" style="font-size:0.85rem;">📊 <b>Rumusan Keluasan:</b><br>• Bancian: <b>${tTanam.toLocaleString()} Ha</b><br>• Serangan: <b class="${pct>5?'text-danger':'text-warning'}">${tSerang.toLocaleString()} Ha</b> (${pct}%)</div>`;
                hasData = true;
            }
        }

        // B2. PIVOT: TOP PEROSAK
        if (isTopPest) {
            let kumpul = {};
            db.forEach(d => {
                let matchCrop = !fCrop || (d.tn||"").toUpperCase().includes(fCrop);
                if((!fNegeri || (d.n||"").toUpperCase().includes(fNegeri)) && 
                   (!fDaerah || (d.d||"").toUpperCase().includes(fDaerah)) && matchCrop &&
                   (!fKategori || (d.kt||"").toUpperCase().includes(fKategori))) {
                    
                    let pestObj = this.getPestObj(d.p);
                    if (pestObj) {
                        Object.keys(pestObj).forEach(k => { 
                            let luas = parseFloat(pestObj[k]) || 0;
                            if(luas > 0) kumpul[k] = (kumpul[k] || 0) + luas; 
                        });
                    }
                }
            });
            let sortPest = Object.entries(kumpul).sort((a,b) => b[1] - a[1]);
            if(sortPest.length > 0) {
                htmlResponse += `🔥 <b>Ancaman Tertinggi:</b><br>`;
                sortPest.slice(0, 4).forEach((x, i) => htmlResponse += `<div class="mb-1 d-flex justify-content-between border-bottom pb-1" style="font-size:0.8rem;"><span>${i+1}. ${x[0]}</span> <b class="text-danger">${x[1].toFixed(2)} Ha</b></div>`);
                htmlResponse += `<br>`;
                hasData = true;
            }
        }

        // B3. PIVOT: TOP LOKASI
        if (isLocation) {
            let locList = [];
            db.forEach(d => {
                let matchCrop = !fCrop || (d.tn||"").toUpperCase().includes(fCrop);
                if((!fNegeri || (d.n||"").toUpperCase().includes(fNegeri)) && 
                   (!fDaerah || (d.d||"").toUpperCase().includes(fDaerah)) && matchCrop &&
                   (!fKategori || (d.kt||"").toUpperCase().includes(fKategori))) {
                    
                    let luasAtt = parseFloat(d.ls) || 0;
                    if(luasAtt > 0) locList.push({ lok: d.l, daerah: d.d, neg: d.n, tanam: d.tn, luas: luasAtt });
                }
            });
            locList.sort((a,b) => b.luas - a.luas);
            if(locList.length > 0) {
                htmlResponse += `📍 <b>Kawasan Kritikal:</b><br>`;
                locList.slice(0, 4).forEach((x, i) => htmlResponse += `<div class="mb-1 text-truncate" style="font-size:0.8rem;" title="${x.lok}">${i+1}. ${x.lok} <span class="text-muted">(${x.daerah||x.neg})</span> - <b>${x.luas.toFixed(2)} Ha</b></div>`);
                hasData = true;
            }
        }

        if(!hasData) return `${tagHtml}✅ Tiada rekod serangan ditemui berdasarkan pangkalan data terkini.`;
        
        return htmlResponse;
    }
};
