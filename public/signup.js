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

// Initialize and start timer
initializeBackgrounds();
setInterval(rotateBackgroundImages, 5000);


// ==========================================
// 2. ROLE SELECTION LOGIC
// ==========================================
let selectedRole = 'tourist';

function setRole(roleName) {
    selectedRole = roleName;
    const tBtn = document.getElementById('tourist-btn');
    const gBtn = document.getElementById('guide-btn');

    if (roleName === 'tourist') {
        tBtn.classList.add('active-role');
        gBtn.classList.remove('active-role');
    } else {
        gBtn.classList.add('active-role');
        tBtn.classList.remove('active-role');
    }
}


// ==========================================
// 3. FORM HANDLING (Direct Registration)
// ==========================================
document.getElementById('my-signup-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const emailValue = document.getElementById('user-email').value;
    const passwordValue = document.getElementById('user-password').value;
    const submitBtn = document.querySelector('.submit-button');
    const originalBtnText = submitBtn.innerText;

    // 1. Notify user we are processing
    submitBtn.innerText = "Creating Account...";
    submitBtn.disabled = true;

    // 2. Direct Registration (No OTP Check)
    await registerUser(emailValue, passwordValue, selectedRole);

    submitBtn.innerText = originalBtnText;
    submitBtn.disabled = false;
});


// ==========================================
// 4. REGISTRATION FUNCTION
// ==========================================
async function registerUser(email, password, role) {
    // UPDATED URL: Using trailbliss.onrender.com
    const API_URL = 'https://trailbliss.onrender.com/api/register'; 

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role })
        });

        const result = await response.json();

        if (response.ok) {
            alert("Success! Account created.");
            window.location.href = 'log.html';
        } else {
            alert("Registration Error: " + (result.error || "Unknown Error"));
        }
    } catch (error) {
        console.error("Registration failed:", error);
        alert("Could not connect to the server.");
    }
}
