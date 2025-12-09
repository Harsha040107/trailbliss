// ==========================================
// 1. BACKGROUND SLIDESHOW LOGIC
// ==========================================
const indianHeritageImages = [
    'https://images.unsplash.com/photo-1564507592333-c60657eea523?q=80&w=1920&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1599661046289-e31897846e41?q=80&w=1920&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1582556362337-b248a803e6d2?q=80&w=1920&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1587595431973-160d0d94add1?q=80&w=1920&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1628292889274-123b32e01dfd?q=80&w=1920&auto=format&fit=crop'
];

const backgroundWrapper = document.getElementById('backgroundImageWrapper');
let currentSlideIndex = 0;

function initializeBackgrounds() {
    // Safety check: if wrapper doesn't exist, stop to prevent error
    if (!backgroundWrapper) return; 

    indianHeritageImages.forEach((url, index) => {
        const slideDiv = document.createElement('div');
        slideDiv.classList.add('backgroundSlide');
        if (index === 0) slideDiv.classList.add('visibleSlide');
        slideDiv.style.backgroundImage = `url('${url}')`;
        backgroundWrapper.appendChild(slideDiv);
    });
}

function rotateBackgroundImages() {
    const slides = document.querySelectorAll('.backgroundSlide');
    if (slides.length === 0) return;
    slides[currentSlideIndex].classList.remove('visibleSlide');
    currentSlideIndex = (currentSlideIndex + 1) % slides.length;
    slides[currentSlideIndex].classList.add('visibleSlide');
}

// Start the slideshow
initializeBackgrounds();
setInterval(rotateBackgroundImages, 5000);


// ==========================================
// 2. TAB & FORM LOGIC
// ==========================================
const touristButton = document.getElementById('touristOptionButton');
const guideButton = document.getElementById('guideOptionButton');
const touristForm = document.getElementById('touristLoginSection');
const guideForm = document.getElementById('guideLoginSection');

function handleTabSwitch(userType) {
    if (userType === 'tourist') {
        touristButton.classList.add('activeButton');
        guideButton.classList.remove('activeButton');
        touristForm.classList.remove('hiddenForm');
        guideForm.classList.add('hiddenForm');
    } else {
        guideButton.classList.add('activeButton');
        touristButton.classList.remove('activeButton');
        guideForm.classList.remove('hiddenForm');
        touristForm.classList.add('hiddenForm');
    }
}

async function handleLogin(event, role) {
    event.preventDefault(); 

    const form = event.target;
    // Robust selection for email input
    const email = form.querySelector('input[type="email"], input[type="text"]').value;
    const password = form.querySelector('input[type="password"]').value;

    // Use your live Render URL
    const API_URL = 'https://trailbliss.onrender.com/api/login';

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Login Successful!');
            localStorage.setItem('userEmail', email); // Save email for dashboard use
       
            if (role === 'tourist') {
                window.location.href = "tourist.html";
            } else {
                window.location.href = "guide.html"; 
            }
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Server error. Is the backend running?');
    }
}

// Only add listeners if the elements exist (prevents errors on other pages)
if (touristForm) touristForm.addEventListener('submit', (e) => handleLogin(e, 'tourist'));
if (guideForm) guideForm.addEventListener('submit', (e) => handleLogin(e, 'guide'));
