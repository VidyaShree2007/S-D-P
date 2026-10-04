const API_URL = "http://127.0.0.1:8000";


// =========================
// SHOW LOGIN
// =========================

function showLogin() {

    document
        .getElementById("loginForm")
        .classList.remove("hidden");

    document
        .getElementById("registerForm")
        .classList.add("hidden");

    document
        .getElementById("profileSection")
        .classList.add("hidden");


    document
        .getElementById("loginTab")
        .classList.add("active");

    document
        .getElementById("registerTab")
        .classList.remove("active");
}


// =========================
// SHOW REGISTER
// =========================

function showRegister() {

    document
        .getElementById("loginForm")
        .classList.add("hidden");

    document
        .getElementById("registerForm")
        .classList.remove("hidden");

    document
        .getElementById("profileSection")
        .classList.add("hidden");


    document
        .getElementById("loginTab")
        .classList.remove("active");

    document
        .getElementById("registerTab")
        .classList.add("active");
}


// =========================
// REGISTER
// =========================

async function register(event) {

    event.preventDefault();


    const username =
        document.getElementById("registerUsername").value;

    const email =
        document.getElementById("registerEmail").value;

    const password =
        document.getElementById("registerPassword").value;


    const message =
        document.getElementById("registerMessage");


    try {

        const response = await fetch(
            `${API_URL}/register`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    username: username,
                    email: email,
                    password: password
                })
            }
        );


        const data = await response.json();


        if (!response.ok) {

            message.textContent =
                data.detail || "Registration failed";

            return;
        }


        message.textContent =
            "Account created successfully";


        document.getElementById(
            "registerUsername"
        ).value = "";

        document.getElementById(
            "registerEmail"
        ).value = "";

        document.getElementById(
            "registerPassword"
        ).value = "";


        setTimeout(() => {

            showLogin();

        }, 1000);


    } catch (error) {

        message.textContent =
            "Cannot connect to the backend";

        console.error(error);
    }
}


// =========================
// LOGIN
// =========================

async function login(event) {

    event.preventDefault();


    const email =
        document.getElementById("loginEmail").value;

    const password =
        document.getElementById("loginPassword").value;


    const message =
        document.getElementById("loginMessage");


    try {

        const response = await fetch(
            `${API_URL}/login`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email: email,
                    password: password
                })
            }
        );


        const data = await response.json();


        if (!response.ok) {

            message.textContent =
                data.detail || "Login failed";

            return;
        }


        localStorage.setItem(
            "access_token",
            data.access_token
        );


        message.textContent =
            "Login successful";


        getProfile();


    } catch (error) {

        message.textContent =
            "Cannot connect to the backend";

        console.error(error);
    }
}


// =========================
// GET PROFILE
// =========================

async function getProfile() {

    const token =
        localStorage.getItem("access_token");


    if (!token) {

        showLogin();

        return;
    }


    try {

        const response = await fetch(
            `${API_URL}/users/me`,
            {
                method: "GET",

                headers: {
                    "Authorization":
                        `Bearer ${token}`
                }
            }
        );


        const data = await response.json();


        if (!response.ok) {

            localStorage.removeItem(
                "access_token"
            );

            showLogin();

            return;
        }


        document.getElementById(
            "profileId"
        ).textContent = data.id;


        document.getElementById(
            "profileUsername"
        ).textContent = data.username;


        document.getElementById(
            "profileEmail"
        ).textContent = data.email;


        document.getElementById(
            "loginForm"
        ).classList.add("hidden");


        document.getElementById(
            "registerForm"
        ).classList.add("hidden");


        document.getElementById(
            "profileSection"
        ).classList.remove("hidden");


    } catch (error) {

        console.error(error);
    }
}


// =========================
// LOGOUT
// =========================

function logout() {

    localStorage.removeItem(
        "access_token"
    );

    showLogin();

    document.getElementById(
        "loginMessage"
    ).textContent =
        "Logged out successfully";
}


// =========================
// PAGE LOAD
// =========================

window.onload = function () {

    const token =
        localStorage.getItem("access_token");


    if (token) {

        getProfile();

    }

};