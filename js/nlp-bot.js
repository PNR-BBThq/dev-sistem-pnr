// =======================================================================
// FAIL: js/nlp-bot.js (NLP ENGINE V2 - FIXED DATA PARSING & SYNONYMS)
// =======================================================================

const SmartNLPBot = {
    // 1. KAMUS SINONIM & KATA KUNCI (Array Mapping untuk tangkap semua ejaan)
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
            "kontan": "KONTAN", "kelapa": "KELAPA", "industri": "KELAPA"
        },
        // PERUBAHAN: Guna Array supaya AI cari semua kemungkinan ejaan dalam Database
        perosakMasyhur: {
            "faw": ["FAW", "FALL ARMYWORM", "ULAT RATUS"], 
            "fall armyworm": ["FAW", "FALL ARMYWORM", "ULAT RATUS"], 
            "rpw": ["RPW", "RED PALM WEEVIL", "KUMBANG MERAH", "KUMBANG PENGOREK"], 
            "kumbang tanduk": ["KUMBANG TANDUK", "RHINOCEROS BEETLE"],
            "koya": ["KOYA", "MEALYBUG", "MEALY BUG"],
            "ulat bungkus": ["ULAT BUNGKUS", "BAGWORM"]
        }
    },
    
    stopWords: ["tolong", "bagi", "beri", "apa", "di", "kat", "pada", "untuk", "yang", "dan", "ada", "tak", "nak", "tahu", "senarai", "tunjuk", "senaraikan", "berikan"],

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

    // PERUBAHAN: Fungsi helper untuk baca JSON Perosak yang betul
    getPestObj: function(dp) {
        if (!dp) return null;
        if (typeof dp === 'object') return dp; 
        if (typeof dp === 'string' && dp.includes('{')) {
            try { return JSON.parse(dp); } catch(e) { return null; }
        }
        return null;
    },

    prosesAyat: function(soalan) {
        if (!AppState.mData || AppState.mData.length === 0) return "Sistem masih tiada data untuk disemak.";

        let query = soalan.toLowerCase().trim();
        let entitiNegeri = null, entitiKategori = null, entitiPerosak = null;
        
        for (let key in this.kamus.negeri) { if (query.includes(key)) entitiNegeri = this.kamus.negeri[key]; }
        for (let key in this.kamus.kategori) { if (query.includes(key)) entitiKategori = this.kamus.kategori[key]; }
        for (let key in this.kamus.perosakMasyhur) { if (query.includes(key)) entitiPerosak = this.kamus.perosakMasyhur[key]; }

        const db = AppState.mData;

        // NIAT 1: RUMUSAN / TOTAL
        if (query.includes("rumusan") || query.includes("ringkas") || query.includes("status keseluruhan") || query.includes("statistik")) {
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

        // NIAT 2: PEROSAK SPESIFIK (Contoh: "FAW", "Ada FAW di Melaka?")
        if (entitiPerosak || (query.includes("serangan") && !query.includes("top"))) {
            let targetPestArr = entitiPerosak;
            
            // Jika tak jumpa dalam kamus, cuba teka dari ayat (Contoh: "serangan liriomyza")
            if(!targetPestArr) {
                let tokens = query.split(" ").filter(w => !this.stopWords.includes(w));
                if(tokens.length > 0) targetPestArr = [tokens[tokens.length-1].toUpperCase()]; 
            }

            if (targetPestArr) {
                let senaraiLokasi = [];
                db.forEach(d => {
                    if(!entitiNegeri || (d.n||"").toUpperCase().includes(entitiNegeri)) {
                        let pestObj = this.getPestObj(d.p);
                        if (pestObj) {
                            // Cari padanan ejaan dalam Database
                            let matchKey = Object.keys(pestObj).find(dbKey => 
                                targetPestArr.some(synonym => dbKey.toUpperCase().includes(synonym))
                            );
                            if(matchKey && parseFloat(pestObj[matchKey]) > 0) {
                                senaraiLokasi.push({ lok: d.l, neg: d.n, nama: matchKey, luas: parseFloat(pestObj[matchKey]) });
                            }
                        }
                    }
                });

                if(senaraiLokasi.length === 0) return `✅ Tiada rekod serangan <b>${targetPestArr[0] || "perosak tersebut"}</b> ${entitiNegeri ? 'di '+entitiNegeri : 'ditemui'}.`;
                senaraiLokasi.sort((a,b) => b.luas - a.luas);
                
                let filterTeks = entitiNegeri ? ` di <b>${entitiNegeri}</b>` : "";
                let html = `🐛 <b>Senarai Serangan ${targetPestArr[0]}${filterTeks}:</b><br>`;
                senaraiLokasi.slice(0, 10).forEach((x, i) => html += `${i+1}. ${x.lok} (${x.neg}) - <b>${x.luas.toFixed(2)} Ha</b><br>`);
                return html;
            }
        }

        // NIAT 3: PEROSAK TERTINGGI / Carian Umum (Contoh: "Top perosak", "Perosak di Melaka")
        if (query.includes("top") || query.includes("tinggi") || query.includes("teruk") || query.includes("perosak")) {
            let kumpul = {};
            db.forEach(d => {
                if((!entitiNegeri || (d.n||"").toUpperCase().includes(entitiNegeri)) && 
                   (!entitiKategori || (d.kt||"").toUpperCase().includes(entitiKategori))) {
                    
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
            
            if(sortPest.length === 0) return `✅ Tiada serangan perosak direkodkan${entitiNegeri ? ' di <b>'+entitiNegeri+'</b>' : ''}${entitiKategori ? ' untuk tanaman <b>'+entitiKategori+'</b>' : ''}.`;
            
            let filterTeks = (entitiNegeri ? ` di <b>${entitiNegeri}</b>` : ` (Nasional)`) + (entitiKategori ? ` bagi <b>${entitiKategori}</b>` : "");
            let html = `🔥 <b>Perosak Utama${filterTeks}:</b><br>`;
            sortPest.slice(0, 5).forEach((x, i) => html += `${i+1}. ${x[0]} - <b>${x[1].toFixed(2)} Ha</b><br>`);
            return html;
        }

        // DEFAULT FALLBACK
        return "Saya kurang jelas dengan arahan tersebut. Cuba gunakan kata kunci seperti <b>'Top'</b>, <b>'Rumusan'</b>, atau nama perosak spesifik seperti <b>'FAW'</b>.";
    }
};
