const API_URL = "http://127.0.0.1:8000";

window.onload = () => {
    checkLoginState();
    loadCrops();
};

function checkLoginState() {
    const userStr = localStorage.getItem('agriflow_user');
    const navLogin = document.getElementById('nav-login');
    const navList = document.getElementById('nav-list');
    
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            const dashboardLink = user.role === 'farmer' ? 'farmer.html' : 'buyer.html';
            
            navLogin.innerHTML = `
                <span class="user-info">Hi, ${user.name}</span>
                <a href="${dashboardLink}" style="margin-right: 15px;">Dashboard</a>
                <a onclick="logout()" style="cursor:pointer;">Logout</a>
            `;
        } catch (e) {
            console.error("Error parsing user data");
        }
    }
}

function logout() {
    localStorage.removeItem('agriflow_user');
    window.location.reload();
}

async function loadCrops() {
    const list = document.getElementById('crop-list');
    if(!list) return; // Not on index page

    try {
        const res = await fetch(`${API_URL}/crops/`);
        if(res.ok) {
            const crops = await res.json();
            list.innerHTML = '';
            
            // Show up to 8 crops on index page
            crops.slice(0, 8).forEach(crop => {
                list.innerHTML += `
                    <div class="card">
                        <h3>${crop.name}</h3>
                        <p><strong>Farmer:</strong> ${crop.farmer_name}</p>
                        <p>${crop.description || ''}</p>
                        <div style="display:flex; justify-content:space-between; margin-top:1rem; align-items:center;">
                            <span style="color:#666">${crop.quantity}kg avail</span>
                            <span class="price">₹${crop.price}/kg</span>
                        </div>
                    </div>
                `;
            });
            
            if(crops.length === 0) {
                list.innerHTML = '<p>No crops available right now.</p>';
            }
        }
    } catch(e) {
        console.error(e);
        list.innerHTML = '<p>Failed to load crops. Ensure the backend is running.</p>';
    }
}