// =======================================================================
// FAIL: js/nlp-bot.js (NLP ENGINE V3 - FULL DATA MAPPING & ARCHITECTURE)
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
            "buah": "BUAH-BUAHAN", "buah-buahan": "BUAH-BUAHAN", 
            "sayur": "SAYUR-SAYURAN", "sayur-sayuran": "SAYUR-SAYURAN", 
            "kontan": "KONTAN", "kelapa": "KELAPA", "padi": "PADI"
        },
        perosakMasyhur: {
            "faw": ["FAW", "FALL ARMYWORM", "ULAT RATUS"], 
            "fall armyworm": ["FAW", "FALL ARMYWORM", "ULAT RATUS"], 
            "rpw": ["RPW", "RED PALM WEEVIL", "KUMBANG MERAH"], 
            "kumbang tanduk": ["KUMBANG TANDUK", "RHINOCEROS BEETLE"],
            "koya": ["KOYA", "MEALYBUG"],
            "liriomyza": ["LIRIOMYZA", "LEAF MINER", "PELOMBONG DAUN"]
        }
    },
    
    stopWords: ["tolong", "bagi", "beri", "apa", "di", "kat", "pada", "untuk", "yang", "dan", "ada", "tak", "nak", "tahu", "senarai", "tunjuk", "berikan"],

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
        chatBody.insertAdjacentHTML('beforeend', `<div id="${loadingId}" class="chat-bubble bubble-bot text-muted small"><i class="bi bi-three-dots"></i> Menyemak data...</div>`);
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

    // PERUBAHAN V3: Fungsi ini sekarang serasi 100% dengan struktur GAS Tuan
    getPestObj: function(dp) {
        if (!dp) return null;
        if (typeof dp === 'object') return dp; // Memang dah Object dari Backend
        if (typeof dp === 'string' && dp.includes('{')) {
            try { return JSON.parse(dp); } catch(e) { return null; }
        }
        return null;
    },

    prosesAyat: function(soalan) {
        const db = AppState.mData;
        if (!db || db.length === 0) return "Sistem masih tiada data untuk disemak.";

        let query = soalan.toLowerCase().trim();
        let tokens = query.split(" ").filter(w => !this.stopWords.includes(w));
        
        let eNegeri = null, eKategori = null, ePerosak = null, eTanamanSpesifik = null, eDaerah = null;
        
        // 1. Tangkap Negeri & Kategori dari Kamus Tetap
        for (let key in this.kamus.negeri) { if (query.includes(key)) eNegeri = this.kamus.negeri[key]; }
        for (let key in this.kamus.kategori) { if (query.includes(key)) eKategori = this.kamus.kategori[key]; }
        for (let key in this.kamus.perosakMasyhur) { if (query.includes(key)) ePerosak = this.kamus.perosakMasyhur[key]; }

        // 2. Tangkap Daerah & Tanaman Spesifik secara Dinamik dari Database!
        // Ini magic AI V3: Dia belajar nama tanaman & daerah on-the-fly
        if (!eKategori && !eNegeri && tokens.length > 0) {
            db.forEach(d => {
                let namaTanaman = (d.tn || "").toLowerCase().trim();
                let namaDaerah = (d.d || "").toLowerCase().trim();
                tokens.forEach(t => {
                    if (t.length > 3 && namaTanaman.includes(t)) eTanamanSpesifik = d.tn.toUpperCase();
                    if (t.length > 3 && namaDaerah.includes(t)) eDaerah = d.d.toUpperCase();
                });
            });
        }

        // --- NIAT 1: RUMUSAN RINGKAS ---
        if (query.includes("rumusan") || query.includes("ringkas") || query.includes("status")) {
            let tTanam = 0, tSerang = 0;
            db.forEach(d => { 
                if((!eNegeri || (d.n||"").toUpperCase().includes(eNegeri)) && 
                   (!eDaerah || (d.d||"").toUpperCase().includes(eDaerah)) &&
                   (!eKategori || (d.kt||"").toUpperCase().includes(eKategori)) &&
                   (!eTanamanSpesifik || (d.tn||"").toUpperCase().includes(eTanamanSpesifik))) {
                    tTanam += (parseFloat(d.lt)||0); tSerang += (parseFloat(d.ls)||0); 
                }
            });
            let pct = tTanam > 0 ? ((tSerang/tTanam)*100).toFixed(2) : 0;
            let filterTeks = "";
            if(eDaerah) filterTeks += ` di <b>${eDaerah}</b>`; else if(eNegeri) filterTeks += ` di <b>${eNegeri}</b>`; else filterTeks += ` <b>Nasional</b>`;
            if(eTanamanSpesifik) filterTeks += ` (Tanaman: ${eTanamanSpesifik})`; else if(eKategori) filterTeks += ` (Kategori: ${eKategori})`;
            
            return `📊 <b>Rumusan Terkini${filterTeks}:</b><br>• Luas Bancian: <b>${tTanam.toLocaleString()} Ha</b><br>• Luas Serangan: <b>${tSerang.toLocaleString()} Ha</b><br>• Peratus Serangan: <b><span class="${pct>5?'text-danger':'text-success'}">${pct}%</span></b>`;
        }

        // --- NIAT 2: CARI PEROSAK SPESIFIK (Cth: FAW) ---
        if (ePerosak || query.includes("serangan")) {
            let targetPestArr = ePerosak;
            if(!targetPestArr && query.includes("serangan")) {
                if(tokens.length > 0) targetPestArr = [tokens[tokens.length-1].toUpperCase()]; 
            }

            if (targetPestArr) {
                let senaraiLokasi = [];
                db.forEach(d => {
                    if((!eNegeri || (d.n||"").toUpperCase().includes(eNegeri)) && (!eDaerah || (d.d||"").toUpperCase().includes(eDaerah))) {
                        let pestObj = this.getPestObj(d.p);
                        if (pestObj) {
                            let matchKey = Object.keys(pestObj).find(dbKey => 
                                targetPestArr.some(synonym => dbKey.toUpperCase().includes(synonym))
                            );
                            if(matchKey && parseFloat(pestObj[matchKey]) > 0) {
                                senaraiLokasi.push({ lok: d.l, daerah: d.d, neg: d.n, tanam: d.tn, luas: parseFloat(pestObj[matchKey]) });
                            }
                        }
                    }
                });

                if(senaraiLokasi.length === 0) return `✅ Tiada rekod serangan <b>${targetPestArr[0] || "perosak tersebut"}</b> ditemui.`;
                senaraiLokasi.sort((a,b) => b.luas - a.luas);
                
                let filterTeks = eDaerah ? ` di <b>${eDaerah}</b>` : (eNegeri ? ` di <b>${eNegeri}</b>` : "");
                let html = `🐛 <b>Senarai Serangan ${targetPestArr[0]}${filterTeks}:</b><br>`;
                senaraiLokasi.slice(0, 5).forEach((x, i) => html += `<div class="mb-1 border-bottom pb-1"><b>${i+1}. ${x.lok}</b> (${x.daerah}, ${x.neg})<br><small class="text-muted">🌱 ${x.tanam} | ⚠️ ${x.luas.toFixed(2)} Ha</small></div>`);
                return html;
            }
        }

        // --- NIAT 3: TOP PEROSAK (Cth: "Top perosak", "Perosak Cili di Melaka") ---
        if (query.includes("top") || query.includes("tinggi") || query.includes("teruk") || query.includes("perosak")) {
            let kumpul = {};
            db.forEach(d => {
                if((!eNegeri || (d.n||"").toUpperCase().includes(eNegeri)) && 
                   (!eDaerah || (d.d||"").toUpperCase().includes(eDaerah)) &&
                   (!eTanamanSpesifik || (d.tn||"").toUpperCase().includes(eTanamanSpesifik)) &&
                   (!eKategori || (d.kt||"").toUpperCase().includes(eKategori))) {
                    
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
            let filterTeks = "";
            if(eDaerah) filterTeks += ` di <b>${eDaerah}</b>`; else if(eNegeri) filterTeks += ` di <b>${eNegeri}</b>`; else filterTeks += ` <b>Nasional</b>`;
            if(eTanamanSpesifik) filterTeks += ` (Tanaman: ${eTanamanSpesifik})`; else if(eKategori) filterTeks += ` (Kategori: ${eKategori})`;

            if(sortPest.length === 0) return `✅ Tiada serangan perosak direkodkan ${filterTeks}.`;
            
            let html = `🔥 <b>Perosak Utama ${filterTeks}:</b><br>`;
            sortPest.slice(0, 5).forEach((x, i) => html += `${i+1}. ${x[0]} - <b>${x[1].toFixed(2)} Ha</b><br>`);
            return html;
        }

        // DEFAULT FALLBACK
        return "Saya kurang jelas. Cuba gunakan kata kunci seperti <b>'Top perosak'</b>, <b>'Rumusan'</b>, atau nama perosak seperti <b>'FAW'</b>.";
    }
};
