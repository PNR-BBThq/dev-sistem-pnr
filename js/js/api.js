// js/api.js
async function postData(action, payloadData = {}) {
    try {
        let payload = { action: action, ...payloadData };
        
        // Letak token jika bukan laluan bebas
        if (!CONFIG.FREE_ROUTES.includes(action)) {
            payload.token = AppState.userToken;
            payload.u = AppState.currentUserID;
        }
        
        const res = await fetch(`${CONFIG.API_URL}?action=${action}`, { 
            method: "POST", 
            headers: { "Content-Type": "text/plain" }, 
            body: JSON.stringify(payload) 
        });
        
        const responseData = JSON.parse(await res.text());

        // Handle Session Timeout Centralized Here
        if (!CONFIG.FREE_ROUTES.includes(action) && responseData.success === false && 
            responseData.message && (responseData.message.includes("sesi") || responseData.message.includes("token"))) {
            alert("⛔ Sesi tamat. Sila log masuk semula."); 
            AuthManager.doLogout();
            return { success: false }; 
        }
        return responseData;
    } catch(e) { 
        console.error("API Error:", e); 
        return { success: false, message: "Ralat sambungan pelayan." }; 
    }
}
