// --- GLOBAL VARIABLES ---
const API_URL = 'https://trailbliss.onrender.com/api/spots';
let map; // Leaflet map instance
let currentSpotLat = 0;
let currentSpotLng = 0;
let availableGuides = []; // Store fetched guides

// --- 1. DATA FETCHING ---
async function fetchSpots() {
    try {
        const response = await fetch(API_URL);
        return await response.json();
    } catch (error) {
        console.error("Error fetching data:", error);
        return [];
    }
}

// --- 2. LOAD TOURIST PAGE (Fixed Card Button) ---
async function loadTouristPage() {
    const spots = await fetchSpots();
    document.querySelectorAll('.tourist-places-grid').forEach(grid => grid.innerHTML = '');

    spots.forEach(spot => {
        const safeStateName = spot.state.toLowerCase().trim().replace(/\s+/g, '-');
        const containerId = `${safeStateName}-grid`;
        const container = document.getElementById(containerId);

        if (container) {
            // FIX: Ensure lat/lng exists, default if missing
            const lat = spot.lat || 20.5937;
            const lng = spot.lng || 78.9629;

            // FIX: Updated button to call openModal with lat/lng
            const cardHTML = `
                <div class="place-info-card category-${spot.category}">
                    <img src="${spot.image}" alt="${spot.name}" class="place-image-holder">
                    <div class="place-details-box">
                        <span class="place-category-tag">${spot.category}</span>
                        <h4 class="place-title">${spot.name}</h4>
                        <p class="place-description">${spot.desc}</p>
                        <div class="card-footer-row">
                            <button onclick="openModal('${spot.name}', '${spot.desc}', ${lat}, ${lng})" class="explore-btn" style="background:none; border:none; color:inherit; cursor:pointer; font-weight:600; padding:0;">
                                View Details & Booking &rarr;
                            </button>
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML += cardHTML;
        }
    });

    if (typeof filterSelection === 'function') {
        filterSelection('all');
    }
}

// --- 3. MODAL & TOGGLE LOGIC (Online/Offline) ---

async function openModal(name, desc, lat, lng) {
    const modal = document.getElementById('detailsModal');
    if (!modal) return; // Guard clause

    modal.style.display = 'flex';
    document.getElementById('modalTitle').innerText = name;
    document.getElementById('modalDesc').innerText = desc;
    document.getElementById('bookSpotName').value = name;

    // Store coordinates for the map
    currentSpotLat = lat;
    currentSpotLng = lng;

    // Default to Online Mode when opening
    toggleGuideMode('online');
}

function closeModal() {
    document.getElementById('detailsModal').style.display = 'none';
}

function toggleGuideMode(mode) {
    const btnOnline = document.getElementById('btnOnline');
    const btnOffline = document.getElementById('btnOffline');
    const mapContainer = document.getElementById('mapContainer');
    const bookingForm = document.getElementById('offlineBookingForm');

    if (mode === 'online') {
        // Style Buttons
        btnOnline.style.backgroundColor = '#D4AF37'; // Gold
        btnOnline.style.color = 'white';
        btnOffline.style.backgroundColor = '#ddd';
        btnOffline.style.color = 'black';

        // Show Map, Hide Form
        mapContainer.style.display = 'block';
        bookingForm.style.display = 'none';

        loadMap();
    } else {
        // Style Buttons
        btnOffline.style.backgroundColor = '#D4AF37';
        btnOffline.style.color = 'white';
        btnOnline.style.backgroundColor = '#ddd';
        btnOnline.style.color = 'black';

        // Show Form, Hide Map
        mapContainer.style.display = 'none';
        bookingForm.style.display = 'block';

        loadGuidesDropdown();
    }
}

// --- 4. MAP LOGIC ---


// --- 5. GUIDE & BOOKING LOGIC ---

async function loadGuidesDropdown() {
    const select = document.getElementById('guideSelect');
    try {
        const res = await fetch('/api/guides');
        availableGuides = await res.json();

        select.innerHTML = '<option value="">-- Select a Guide --</option>';
        availableGuides.forEach(g => {
            select.innerHTML += `<option value="${g.email}">${g.name} (${g.languages})</option>`;
        });
    } catch (e) { console.error(e); }
}

// Global scope function for the HTML onchange event
window.showGuidePreview = function (selectElement) {
    const email = selectElement.value;
    const guide = availableGuides.find(g => g.email === email);
    const previewBox = document.getElementById('guidePreviewBox');

    if (guide) {
        previewBox.style.display = 'block';
        document.getElementById('previewName').innerText = guide.name;
        document.getElementById('previewExp').innerText = (guide.experience || '0') + " years";
        document.getElementById('previewPhone').innerText = "Book to reveal";
    } else {
        previewBox.style.display = 'none';
    }
};

const bookingForm = document.getElementById('bookingForm');
if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const guideEmail = document.getElementById('guideSelect').value;
        const guide = availableGuides.find(g => g.email === guideEmail);

        const data = {
            spotName: document.getElementById('bookSpotName').value,
            date: document.getElementById('bookDate').value,
            guideEmail: guideEmail,
            touristEmail: document.getElementById('bookUserEmail').value,
            touristPhone: document.getElementById('bookUserPhone').value,
            type: 'offline'
        };

        try {
            const res = await fetch('/api/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();

            if (result.success) {
                alert(`Booking Request Sent! \n\nOnce ${guide ? guide.name : 'the guide'} accepts, you will receive their contact details.`);
                closeModal();
            } else {
                alert("Error booking guide: " + result.error);
            }
        } catch (err) {
            console.error(err);
            alert("Network error.");
        }
    });
}

// --- 6. ADMIN PANEL LOGIC ---

async function loadAdminPanel() {
    const spots = await fetchSpots();
    const listContainer = document.getElementById('adminList');
    if (!listContainer) return;

    listContainer.innerHTML = '<h2>Manage Existing Spots</h2>';

    spots.forEach(spot => {
        const itemHTML = `
            <div class="spot-list-item">
                <div>
                    <strong>${spot.name}</strong> (${spot.state})
                </div>
                <button class="delete-btn" onclick="deleteSpot('${spot._id}')">Delete</button>
            </div>
        `;
        listContainer.innerHTML += itemHTML;
    });
}

const addForm = document.getElementById('addForm');
if (addForm) {
    addForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append("state", document.getElementById("state").value);
        formData.append("name", document.getElementById("name").value);
        formData.append("category", document.getElementById("category").value);
        formData.append("desc", document.getElementById("desc").value);
        // Capturing Coordinates
        formData.append("lat", document.getElementById("lat").value);
        formData.append("lng", document.getElementById("lng").value);
        formData.append("image", document.getElementById("image").files[0]);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                alert("Spot Added Successfully!");
                loadAdminPanel();
                addForm.reset();
            } else {
                const result = await response.json();
                alert("Error adding spot: " + (result.error || "Unknown error"));
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Failed to connect to server");
        }
    });
}

async function deleteSpot(id) {
    if (confirm("Are you sure you want to delete this?")) {
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        loadAdminPanel();
    }
}

// --- 7. UTILS & EVENT LISTENERS ---

// Helper for filtering
function filterSelection(category) {
    const allButtons = document.querySelectorAll('.category-filter-button');
    allButtons.forEach(btn => {
        btn.classList.remove('active-filter');
        if (btn.getAttribute('onclick').includes("'" + category + "'")) {
            btn.classList.add('active-filter');
        }
    });

    const allCards = document.querySelectorAll('.place-info-card');
    allCards.forEach(card => {
        if (category === 'all') {
            card.style.display = 'block';
        } else {
            card.classList.contains('category-' + category) ?
                card.style.display = 'block' : card.style.display = 'none';
        }
    });

    // Hide empty state sections
    const stateSections = document.querySelectorAll('.state-section-container');
    stateSections.forEach(section => {
        const cardsInSection = section.querySelectorAll('.place-info-card');
        let hasVisibleCards = Array.from(cardsInSection).some(card => card.style.display !== 'none');
        section.style.display = hasVisibleCards ? 'block' : 'none';
    });
}

// Feedback Form
const feedbackForm = document.getElementById('userFeedbackForm');
if (feedbackForm) {
    feedbackForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const name = document.getElementById('feedbackName').value;
        const email = document.getElementById('feedbackEmail').value;
        const message = document.getElementById('feedbackMessage').value;

        try {
            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, message })
            });

            if (response.ok) {
                alert("Thank you! Your feedback has been sent.");
                this.reset();
            } else {
                alert("Something went wrong. Please try again.");
            }
        } catch (error) {
            console.error(error);
        }
    });
}

function logoutUser() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "log.html";
    }
}

// Navbar Toggle
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('nav-links');
if (hamburger) {
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
}

// --- INITIALIZATION ---

// If we are on the main tourist page (checking for a grid element)
if (document.getElementById('rajasthan-grid')) {
    loadTouristPage();
}

// Inside fetchSpots loop in tourist.js
spots.forEach(spot => {
    const safeStateName = spot.state.toLowerCase().trim().replace(/\s+/g, '-');
    let container = document.getElementById(`${safeStateName}-grid`);

    // DYNAMICALLY CREATE SECTION IF MISSING
    if (!container) {
        const wrapper = document.querySelector('.main-content-wrapper'); // Parent container
        const newSection = document.createElement('div');
        newSection.className = 'state-section-container';
        newSection.innerHTML = `
            <div class="state-header">
                <h3 class="state-name-title">${spot.state}</h3>
                <p>Explore ${spot.state}</p>
            </div>
            <div class="places-wrapper">
                <div class="tourist-places-grid" id="${safeStateName}-grid"></div>
            </div>
        `;
        wrapper.appendChild(newSection);
        container = document.getElementById(`${safeStateName}-grid`);
    }

    // ... existing card generation code ...
});



// Updated Open Modal to ensure Map resizes correctly
async function openModal(name, desc, lat, lng) {
    const modal = document.getElementById('detailsModal');
    if (!modal) return;

    modal.style.display = 'flex';
    document.getElementById('modalTitle').innerText = name;
    document.getElementById('modalDesc').innerText = desc;
    document.getElementById('bookSpotName').value = name;

    currentSpotLat = lat;
    currentSpotLng = lng;

    toggleGuideMode('online');

    // FIX: Force map to recalculate size after modal animation
    setTimeout(() => {
        if (map) map.invalidateSize();
    }, 200);
}

// --- ROBUST MAP & ROUTING LOGIC ---

let routingControl = null;

function loadMap() {
    // 1. HARD RESET: Destroy existing map to prevent "Map already initialized" error
    if (map) {
        map.remove(); // Removes the map and all layers/events
        map = null;
    }

    // 2. Initialize Map
    // We use a slight timeout to ensure the modal is fully visible (fixes gray map)
    setTimeout(() => {
        if (!map) {
            map = L.map('map').setView([currentSpotLat, currentSpotLng], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            // 3. Add Destination Marker (Red)
            const destIcon = L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });

            L.marker([currentSpotLat, currentSpotLng], { icon: destIcon })
                .addTo(map)
                .bindPopup(`<b>${document.getElementById('modalTitle').innerText}</b>`)
                .openPopup();

            // Add this inside loadMap(), right after creating the map
            const googleLink = document.getElementById('googleMapsLink');
            if (googleLink) {
                // Updates link to: https://www.google.com/maps/dir/Current+Location/DestLat,DestLng
                googleLink.href = `https://www.google.com/maps/dir/?api=1&destination=${currentSpotLat},${currentSpotLng}`;
            }

            // 4. Force map to recalculate its size (Fixes gray tiles)
            map.invalidateSize();

            // 5. Calculate Route
            startRouting();
        }
    }, 300); // 300ms delay to wait for modal animation
}

function startRouting() {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
    }

    navigator.geolocation.getCurrentPosition(position => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        if (routingControl) {
            map.removeControl(routingControl);
        }

        routingControl = L.Routing.control({
            waypoints: [
                L.latLng(userLat, userLng),
                L.latLng(currentSpotLat, currentSpotLng)
            ],
            routeWhileDragging: false,
            draggableWaypoints: false,
            addWaypoints: false,
            lineOptions: {
                styles: [{ color: 'blue', opacity: 0.6, weight: 6 }]
            },
            // This forces the router to use the OSRM demo server explicitly
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1'
            })
        })
            .on('routingerror', function (e) {
                // THIS WILL TELL YOU WHY IT FAILED
                console.error("Routing Error:", e);
                alert("Could not calculate route: " + (e.error ? e.error.message : "Network/Distance issue"));
            })
            .addTo(map);

    }, (err) => {
        alert("Location access denied. Cannot draw route.");
    }, { enableHighAccuracy: true });
}

// [tourist.js] - ADD THIS SECTION

// --- 8. MY BOOKINGS LOGIC ---

// [tourist.js]

// 1. UPDATE openMyBookings function
async function openMyBookings() {
    let userEmail = document.getElementById('bookUserEmail').value || localStorage.getItem('userEmail');
    if (!userEmail) {
        userEmail = prompt("Please enter your email to view bookings:");
        if (!userEmail) return;
        localStorage.setItem('userEmail', userEmail);
    }

    const modal = document.getElementById('bookingsModal');
    const listContainer = document.getElementById('myBookingsList');
    
    modal.style.display = 'flex';
    listContainer.innerHTML = '<p style="text-align:center;">Fetching status...</p>';

    try {
        const res = await fetch(`/api/tourist-bookings?email=${userEmail}`);
        const bookings = await res.json();

        if (bookings.length === 0) {
            listContainer.innerHTML = '<p style="text-align:center;">No booking requests found.</p>';
            return;
        }

        listContainer.innerHTML = ''; 

        bookings.forEach(b => {
            // Color Logic including 'Completed'
            let statusColor = '#f39c12'; // Pending
            if(b.status === 'Accepted') statusColor = '#27ae60';
            if(b.status === 'Rejected') statusColor = '#c0392b';
            if(b.status === 'Completed') statusColor = '#2980b9'; // Blue for completed

            const cardHTML = `
                <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 5px solid ${statusColor}; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                        <strong>${b.spotName}</strong>
                        <span style="background:${statusColor}; color:white; padding:2px 8px; border-radius:10px; font-size:0.8rem;">${b.status}</span>
                    </div>
                    
                    <div style="font-size: 0.9rem; color: #555;">
                        <p>Date: ${b.date}</p>
                        <p>Guide: ${b.guideName}</p>
                        ${b.status === 'Accepted' || b.status === 'Completed' ? `<p>📞 ${b.guideContact}</p>` : ''}
                    </div>

                    ${b.status === 'Accepted' ? `
                        <div style="margin-top:10px; text-align:right;">
                            <button onclick="openCompletionModal('${b._id}')" style="background:#27ae60; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">
                                <i class="fa-solid fa-check"></i> Mark Completed
                            </button>
                        </div>
                    ` : ''}

                    ${b.status === 'Completed' ? `
                        <div style="margin-top:10px; padding-top:5px; border-top:1px dashed #ccc; font-size:0.9rem; color:#2980b9;">
                            <strong>Your Rating:</strong> ${'★'.repeat(b.rating)}
                        </div>
                    ` : ''}
                </div>
            `;
            listContainer.innerHTML += cardHTML;
        });

    } catch (error) { console.error(error); }
}

// 2. ADD New Functions for Completion
function openCompletionModal(bookingId) {
    document.getElementById('bookingsModal').style.display = 'none'; // Hide list
    document.getElementById('completionModal').style.display = 'flex'; // Show feedback form
    document.getElementById('completeBookingId').value = bookingId;
}

document.getElementById('tripFeedbackForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const bookingId = document.getElementById('completeBookingId').value;
    const rating = document.getElementById('tripRating').value;
    const review = document.getElementById('tripReview').value;

    try {
        const res = await fetch('/api/complete-trip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId, rating, review })
        });
        
        const result = await res.json();
        if(result.success) {
            alert("Feedback sent! Thank you.");
            document.getElementById('completionModal').style.display = 'none';
            openMyBookings(); // Reopen list to show updated status
        }
    } catch(err) {
        alert("Error saving feedback");
    }
});
