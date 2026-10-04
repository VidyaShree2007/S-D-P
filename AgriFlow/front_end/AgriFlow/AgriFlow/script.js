/* =====================================
   AGRIFLOW FRONTEND
===================================== */


/* =====================================
   ELEMENTS
===================================== */

const modal = document.getElementById("cropModal");
const openCropModal = document.getElementById("openCropModal");
const quickAddCrop = document.getElementById("quickAddCrop");
const closeModal = document.getElementById("closeModal");

const cropForm = document.getElementById("cropForm");

const cropName = document.getElementById("cropName");
const cropQuantity = document.getElementById("cropQuantity");
const cropPrice = document.getElementById("cropPrice");

const estimatedValue = document.getElementById("estimatedValue");

const cropList = document.getElementById("cropList");
const cropCount = document.getElementById("cropCount");

const toast = document.getElementById("toast");
const toastTitle = document.getElementById("toastTitle");
const toastMessage = document.getElementById("toastMessage");

const searchInput = document.getElementById("searchInput");

const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");

const themeBtn = document.getElementById("themeBtn");



/* =====================================
   MODAL
===================================== */

function openModal() {
    modal.classList.add("show");

    document.body.style.overflow = "hidden";

    setTimeout(() => {
        cropName.focus();
    }, 200);
}


function closeCropModal() {
    modal.classList.remove("show");

    document.body.style.overflow = "";

    cropForm.reset();

    updateEstimatedValue();
}


openCropModal.addEventListener("click", openModal);

quickAddCrop.addEventListener("click", openModal);

closeModal.addEventListener("click", closeCropModal);


modal.addEventListener("click", (event) => {

    if (event.target === modal) {
        closeCropModal();
    }

});


document.addEventListener("keydown", (event) => {

    if (event.key === "Escape") {
        closeCropModal();
    }

});

/* =====================================
   LOAD CROPS FROM DATABASE
===================================== */

async function loadCrops() {

    try {

        const response = await fetch(
            API_URL + "/crops"
        );

        if (!response.ok) {
            throw new Error("Failed to load crops");
        }

        const crops = await response.json();

        cropList.innerHTML = "";

        if (crops.length === 0) {

            cropList.innerHTML =
                "<p>No crops available.</p>";

            cropCount.textContent = "0";

            return;
        }

        // Only display crops that have stock
        const availableCrops =
            crops.filter(crop => crop.quantity > 0);

        cropCount.textContent =
            availableCrops.length;

        availableCrops.forEach(crop => {

            const newCrop =
                document.createElement("div");

            newCrop.className =
                "crop-row";

            newCrop.dataset.search =
                `${crop.name} ${crop.farmer}`.toLowerCase();

            newCrop.innerHTML = `

                <div class="crop-image">
                    ${getCropEmoji(crop.name)}
                </div>

                <div class="crop-info">

                    <strong>
                        ${crop.name}
                    </strong>

                    <span>
                        Farmer: ${crop.farmer}
                        • ${crop.quantity} kg
                    </span>

                </div>

                <div class="crop-price">

                    <strong>
                        ₹${crop.price}/kg
                    </strong>

                    <span class="up">
                        Available
                    </span>

                </div>

                <div class="stock-bar">

                    <span style="width:100%">
                    </span>

                </div>

                <button
                    class="row-menu"
                    type="button"
                >
                    •••
                </button>

            `;

            cropList.appendChild(newCrop);

        });

    }

    catch (error) {

        console.error(error);

        cropList.innerHTML =
            "<p>❌ Unable to load crops from server.</p>";
    }
}

/* =====================================
   ESTIMATED VALUE
===================================== */

function updateEstimatedValue() {

    const quantity = Number(cropQuantity.value) || 0;
    const price = Number(cropPrice.value) || 0;

    const total = quantity * price;

    estimatedValue.textContent =
        "₹" + total.toLocaleString("en-IN");
}


cropQuantity.addEventListener(
    "input",
    updateEstimatedValue
);

cropPrice.addEventListener(
    "input",
    updateEstimatedValue
);



/* =====================================
   ADD CROP
===================================== */

cropForm.addEventListener("submit", (event) => {

    event.preventDefault();

    const name = cropName.value;

    const quantity = Number(
        cropQuantity.value
    );

    const price = Number(
        cropPrice.value
    );

    const grade = document.querySelector(
        'input[name="grade"]:checked'
    ).value;


    if (!name || quantity <= 0 || price <= 0) {

        showToast(
            "Check details",
            "Please enter valid crop information."
        );

        return;
    }


    const emoji = getCropEmoji(name);

    const newCrop = document.createElement("div");

    newCrop.className = "crop-row";

    newCrop.dataset.search =
        `${name} ${grade}`.toLowerCase();


    newCrop.innerHTML = `

        <div class="crop-image">
            ${emoji}
        </div>

        <div class="crop-info">
            <strong>${name}</strong>
            <span>${grade} • ${quantity} kg</span>
        </div>

        <div class="crop-price">
            <strong>₹${price}/kg</strong>
            <span class="up">New</span>
        </div>

        <div class="stock-bar">
            <span style="width:100%"></span>
        </div>

        <button class="row-menu">
            •••
        </button>

    `;


    cropList.prepend(newCrop);


    /* update crop counter */

    const currentCount =
        Number(cropCount.textContent);

    cropCount.textContent =
        currentCount + 1;


    /* close */

    closeCropModal();


    /* notification */

    showToast(
        "Crop Added 🌱",
        `${name} has been added to your inventory.`
    );


    /* save locally for demo */

    saveDemoCrop({
        name,
        quantity,
        price,
        grade
    });

});


function getCropEmoji(name) {

    const crops = {
        "Tomato": "🍅",
        "Basmati Rice": "🌾",
        "Potato": "🥔",
        "Onion": "🧅",
        "Wheat": "🌾",
        "Carrot": "🥕"
    };

    return crops[name] || "🌱";
}



/* =====================================
   TOAST
===================================== */

let toastTimer;

function showToast(title, message) {

    toastTitle.textContent = title;
    toastMessage.textContent = message;

    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {

        toast.classList.remove("show");

    }, 3500);
}



/* =====================================
   NAVIGATION
===================================== */

const navLinks =
    document.querySelectorAll(
        ".nav-link"
    );


const sectionButtons =
    document.querySelectorAll(
        "[data-section]"
    );


function activateSection(section) {

    navLinks.forEach(link => {

        link.classList.toggle(
            "active",
            link.dataset.section === section
        );

    });


    /*
        In the final FastAPI project,
        these can become real pages/routes.

        For the current demo we show a
        small notification.
    */

    const names = {
        dashboard: "Dashboard",
        crops: "My Crops",
        market: "Market",
        orders: "Orders",
        analytics: "Analytics",
        profile: "Profile"
    };

    if (names[section]) {

        showToast(
            names[section],
            `${names[section]} section selected.`
        );

    }

    sidebar.classList.remove("open");
}


sectionButtons.forEach(button => {

    button.addEventListener(
        "click",
        (event) => {

            event.preventDefault();

            activateSection(
                button.dataset.section
            );

        }
    );

});



/* =====================================
   SEARCH
===================================== */

searchInput.addEventListener(
    "input",
    () => {

        const query =
            searchInput.value
                .trim()
                .toLowerCase();


        const crops =
            document.querySelectorAll(
                ".crop-row"
            );


        let visible = 0;


        crops.forEach(crop => {

            const text =
                crop.dataset.search ||
                crop.textContent.toLowerCase();


            const match =
                text.includes(query);


            crop.style.display =
                match ? "grid" : "none";


            if (match) {
                visible++;
            }

        });


        if (query && visible === 0) {

            showToast(
                "No results",
                "No matching crop was found."
            );

        }

    }
);



/* =====================================
   KEYBOARD SEARCH
===================================== */

document.addEventListener(
    "keydown",
    (event) => {

        if (
            (event.ctrlKey || event.metaKey) &&
            event.key.toLowerCase() === "k"
        ) {

            event.preventDefault();

            searchInput.focus();

        }

    }
);



/* =====================================
   MOBILE SIDEBAR
===================================== */

menuBtn.addEventListener(
    "click",
    () => {

        sidebar.classList.toggle(
            "open"
        );

    }
);



/* =====================================
   THEME
===================================== */

themeBtn.addEventListener(
    "click",
    () => {

        document.body.classList.toggle(
            "dark"
        );


        const dark =
            document.body.classList.contains(
                "dark"
            );


        localStorage.setItem(
            "agriflow-theme",
            dark ? "dark" : "light"
        );


        showToast(
            dark
                ? "Dark Mode"
                : "Light Mode",
            "Appearance updated."
        );

    }
);


/* restore theme */

if (
    localStorage.getItem(
        "agriflow-theme"
    ) === "dark"
) {

    document.body.classList.add(
        "dark"
    );

}



/* =====================================
   DEMO LOCAL STORAGE
===================================== */

function saveDemoCrop(crop) {

    const existing =
        JSON.parse(
            localStorage.getItem(
                "agriflow-crops"
            )
        ) || [];


    existing.push({
        ...crop,
        createdAt:
            new Date().toISOString()
    });


    localStorage.setItem(
        "agriflow-crops",
        JSON.stringify(existing)
    );

}



/* =====================================
   NOTIFICATION
===================================== */

document
    .getElementById("notificationBtn")
    .addEventListener(
        "click",
        () => {

            showToast(
                "Notifications",
                "You have 3 new updates."
            );

        }
    );



/* =====================================
   LOGOUT
===================================== */

document
    .getElementById("logoutBtn")
    .addEventListener(
        "click",
        (event) => {

            event.preventDefault();

            const confirmLogout =
                confirm(
                    "Are you sure you want to logout?"
                );


            if (confirmLogout) {

                showToast(
                    "Logout",
                    "Demo logout completed."
                );

            }

        }
    );



/* =====================================
   ROW MENU INTERACTION
===================================== */

document.addEventListener(
    "click",
    (event) => {

        if (
            event.target.classList.contains(
                "row-menu"
            )
        ) {

            showToast(
                "Crop Options",
                "Edit and delete will connect to the backend."
            );

        }

    }
);



/* =====================================
   WELCOME ANIMATION
===================================== */

window.addEventListener(
    "load",
    () => {

        document
            .querySelectorAll(
                ".stat-card, .panel"
            )
            .forEach(
                (element, index) => {

                    element.style.opacity = "0";

                    element.style.transform =
                        "translateY(12px)";


                    setTimeout(() => {

                        element.style.transition =
                            "opacity .45s ease, transform .45s ease";

                        element.style.opacity = "1";

                        element.style.transform =
                            "translateY(0)";

                    }, 80 * index);

                }
                
            );

    }
);
loadCrops();