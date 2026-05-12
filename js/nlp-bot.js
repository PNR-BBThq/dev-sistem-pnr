// =======================================================================
// FAIL: js/nlp-bot.js (LOCAL NLP ENGINE GRED ENTERPRISE)
// =======================================================================

const SmartNLPBot = {
    // 1. KAMUS SINONIM & KATA KUNCI (Boleh ditambah pada masa hadapan)
    kamus: {
        negeri: {
            "johor": "JOHOR", "jhr": "JOHOR", "kedah": "KEDAH", "kdh": "KEDAH",
            "kelantan": "KELANTAN", "klate": "KELANTAN", "melaka": "MELAKA",
            "n9": "NEGERI SEMBILAN", "negeri sembilan": "NEGERI SEMBILAN", "sembilan": "NEGERI SEMBILAN",
            "pahang": "PAHANG", "phg": "PAHANG", "perak": "PERAK", "prk": "PERAK",
            "perlis": "PERLIS", "penang": "PULAU PINANG", "pulau pinang": "PULAU PINANG", "p.pinang": "PULAU PINANG",
            "sabah": "SABAH", "sarawak": "SARAWAK", "selangor": "SELANGOR", "terengganu": "TERENGGANU", "trg": "TERENGGANU",
            "kl": "W.P. KUALA LUMPUR", "kuala lumpur": "W.P. KUALA LUMPUR", "labuan": "W.P. LABUAN"
        },
        kategori: {
            "buah": "BUAH-BUAHAN", "buah-buahan": "BUAH-BUAHAN", "buahan": "BUAH-BUAHAN",
            "sayur": "SAYUR-SAYURAN", "sayur-sayuran": "SAYUR-SAYURAN", "sayuran": "SAYUR-SAYURAN",
            "kontan": "KONTAN", "kelapa": "KELAPA"
        },
        perosakMasyhur: {
            "faw": "FAW", "fall armyworm": "FAW", "ulat ratus": "FAW",
            "rpw": "RPW", "red palm weevil": "RPW", "kumbang merah": "RPW",
            "kumbang tanduk": "KUMBANG TANDUK"
        }
    },
    
    // Perkataan yang akan dibuang supaya AI tak keliru
    stopWords: ["tolong", "bagi", "beri", "apa", "di", "kat", "pada", "untuk", "yang", "dan", "ada", "tak", "nak", "tahu", "senarai", "tunjuk"],

    // 2. KAWALAN ANTARAMUKA (UI)
    toggle: function() {
        const win = document.getElementById('nlp-chatbot-window');
        if (win.style.display === 'flex') {
            win.style.display = 'none';
        } else {
            win.style.display = 'flex';
            document.getElementById('nlp-chat-input').focus();
        }
    },

    handleInput: function(chipText = null) {
        const inputEl = document.getElementById('nlp-chat-input');
        const text = chipText || inputEl.value;
        if (!text || text.trim() === '') return;
        
        inputEl.value = '';
        this.addMessage(text, 'user');
        
        // Letak efek "Tengah Fikir..."
        const chatBody = document.getElementById('nlp-chat-messages');
        const loadingId = "load-" + Date.now();
        chatBody.insertAdjacentHTML('beforeend', `<div id="${loadingId}" class="chat-bubble bubble-bot text-muted small"><i class="bi bi-three-dots"></i> Sedang menganalisis...</div>`);
        chatBody.scrollTop = chatBody.scrollHeight;

        // Proses jawapan selepas 0.5 saat (supaya rasa macam real AI)
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

    // ==========================================
    // 3. ENJIN PEMPROSESAN BAHASA ASLI (NLP CORE)
    // ==========================================
    prosesAyat: function(soalan) {
        if (!AppState.mData || AppState.mData.length === 0) {
            return "Maaf, sistem sedang memuat turun data. Sila cuba sebentar lagi.";
        }

        let query = soalan.toLowerCase().trim();
        
        // A. Pengekstrakan Entiti (Kenal pasti Negeri, Kategori, Perosak)
        let entitiNegeri = null;
        let entitiKategori = null;
        let entitiPerosak = null;
        
        // Cari Negeri
        for (let key in this.kamus.negeri) { if (query.includes(key)) entitiNegeri = this.kamus.negeri[key]; }
        // Cari Kategori
        for (let key in this.kamus.kategori) { if (query.includes(key)) entitiKategori = this.kamus.kategori[key]; }
        // Cari Perosak Masyhur
        for (let key in this.kamus.perosakMasyhur) { if (query.includes(key)) entitiPerosak = this.kamus.perosakMasyhur[key]; }

        // B. Pengelasan Niat (Intent Classification) & Pemprosesan Data
        const db = AppState.mData;

        // NIAT 1: RUMUSAN / TOTAL
        if (query.includes("rumusan") || query.includes("ringkas") || query.includes("status keseluruhan")) {
            let tTanam = 0, tSerang = 0;
            db.forEach(d => { 
                if((!entitiNegeri || (d.n||"").toUpperCase().includes(entitiNegeri)) && 
                   (!entitiKategori || (d.kt||"").toUpperCase().includes(entitiKategori))) {
                    tTanam += (parseFloat(d.lt)||0); tSerang += (parseFloat(d.ls)||0); 
                }
            });
            let pct = tTanam > 0 ? ((tSerang/tTanam)*100).toFixed(2) : 0;
            let filterTeks = (entitiNegeri ? ` di <b>${entitiNegeri}</b>` : ` <b>Nasional</b>`) + (entitiKategori ? ` bagi <b>${entitiKategori}</b>` : "");
            return `📊 <b>Rumusan Terkini${filterTeks}:</b><br>• Luas Bancian: <b>${tTanam.toLocaleString()} Ha</b><br>• Luas Serangan: <b>${tSerang.toLocaleString()} Ha</b><br>• Peratus Serangan: <b><span class="${pct>5?'text-danger':'text-success'}">${pct}%</span></b>`;
        }

        // NIAT 2: PEROSAK TERTINGGI (Top Pests)
        if (query.includes("top") || query.includes("tinggi") || query.includes("teruk") || query.includes("paling")) {
            let kumpul = {};
            db.forEach(d => {
                if((!entitiNegeri || (d.n||"").toUpperCase().includes(entitiNegeri)) && 
                   (!entitiKategori || (d.kt||"").toUpperCase().includes(entitiKategori))) {
                    if (d.p && typeof d.p === 'string' && d.p.includes('{')) {
                        try {
                            let obj = JSON.parse(d.p);
                            Object.keys(obj).forEach(k => { kumpul[k] = (kumpul[k] || 0) + (parseFloat(obj[k]) || 0); });
                        } catch(e) {}
                    }
                }
            });
            let sortPest = Object.entries(kumpul).sort((a,b) => b[1] - a[1]);
            if(sortPest.length === 0) return `Tiada serangan direkodkan${entitiNegeri ? ' di '+entitiNegeri : ''}${entitiKategori ? ' untuk '+entitiKategori : ''}.`;
            
            let filterTeks = (entitiNegeri ? ` di <b>${entitiNegeri}</b>` : ` (Seluruh Negara)`) + (entitiKategori ? ` bagi <b>${entitiKategori}</b>` : "");
            let html = `🔥 <b>Perosak Paling Serius${filterTeks}:</b><br>`;
            sortPest.slice(0, 5).forEach((x, i) => html += `${i+1}. ${x[0]} - <b>${x[1].toFixed(2)} Ha</b><br>`);
            return html;
        }

        // NIAT 3: PENCARIAN SPESIFIK PEROSAK (Contoh: "Ada FAW di Johor?")
        if (entitiPerosak || query.includes("serangan")) {
            // Jika AI tak jumpa entitiPerosak dari kamus, kita cuba tangkap dari perkataan
            let targetPest = entitiPerosak;
            if(!targetPest && query.includes("serangan")) {
                let tokens = query.split(" ").filter(w => !this.stopWords.includes(w));
                if(tokens.length > 0) targetPest = tokens[tokens.length-1].toUpperCase(); // Tekaan (Heuristic guess)
            }

            if (targetPest) {
                let senaraiLokasi = [];
                db.forEach(d => {
                    if(!entitiNegeri || (d.n||"").toUpperCase().includes(entitiNegeri)) {
                        if (d.p && typeof d.p === 'string' && d.p.toUpperCase().includes(targetPest)) {
                            try {
                                let obj = JSON.parse(d.p);
                                let matchKey = Object.keys(obj).find(k => k.toUpperCase().includes(targetPest));
                                if(matchKey) senaraiLokasi.push({ lok: d.l, neg: d.n, luas: parseFloat(obj[matchKey])||0 });
                            } catch(e) {}
                        }
                    }
                });

                if(senaraiLokasi.length === 0) return `✅ Tiada rekod serangan berkaitan <b>${targetPest}</b> ditemui.`;
                senaraiLokasi.sort((a,b) => b.luas - a.luas);
                
                let filterTeks = entitiNegeri ? ` di <b>${entitiNegeri}</b>` : "";
                let html = `🐛 <b>Senarai Serangan ${targetPest}${filterTeks}:</b><br>`;
                senaraiLokasi.slice(0, 5).forEach((x, i) => html += `${i+1}. ${x.lok} (${x.neg}) - <b>${x.luas.toFixed(2)} Ha</b><br>`);
                return html;
            }
        }

        // C. DEFAULT FALLBACK
        return "Saya kurang faham soalan tersebut. Anda boleh tanya soalan seperti:<br>• <i>'Apa perosak paling teruk di Johor?'</i><br>• <i>'Status sayur di Pahang'</i><br>• <i>'Senarai FAW'</i>";
    }
};

