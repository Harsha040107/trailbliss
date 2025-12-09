const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const fs = require('fs');

const app = express();
const PORT = 3000;


app.use(cors());
app.use(express.json());
app.use(express.static('public'));


mongoose.connect('mongodb+srv://TrailBliss04:Harsha04@trailbliss.6zqk71c.mongodb.net/?appName=TrailBliss')
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));


const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ['tourist', 'guide'] }
});
const User = mongoose.model('User', userSchema);


const spotSchema = new mongoose.Schema({
    state: String,
    name: String,
    category: String,
    image: String,
    desc: String,
    lat: Number,  // <--- ADD THIS
    lng: Number
});
const TouristSpot = mongoose.model('TouristSpot', spotSchema);


// At the top of server.js, ensure 'path' is required
// const path = require('path'); 

const storage = multer.diskStorage({
    // CHANGE THIS LINE: Use path.join for absolute path
    destination: path.join(__dirname, 'public', 'uploads'),
    filename: function (req, file, cb) {
        cb(null, 'spot-' + Date.now() + path.extname(file.originalname));
    }
});
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
// -------------------------------------------



const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 },
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
});

function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}


app.post('/api/register', async (req, res) => {
    try {
        const { email, password, role } = req.body;


        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "User already exists with this email" });
        }


        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            email,
            password: hashedPassword,
            role
        });

        await newUser.save();
        res.json({ success: true, message: "Registration successful! Please login." });
        console.log(`New User Registered: ${email} (${role})`);

    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ error: "Registration failed" });
    }
});


app.post('/api/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;


        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: "User not found" });
        }


        if (user.role !== role) {
            return res.status(403).json({ error: `Please log in via the ${user.role} tab.` });
        }


        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid password" });
        }

        res.json({ success: true, message: "Login successful", role: user.role });
        console.log(`User Logged In: ${email}`);

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "Login failed" });
    }
});



app.get('/api/spots', async (req, res) => {
    try {
        const spots = await TouristSpot.find();
        res.json(spots);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch spots" });
    }
});

app.post('/api/spots', (req, res) => {
    // We wrap upload.single in a function to catch errors manually
    const uploadFunc = upload.single('image');

    uploadFunc(req, res, async (err) => {
        // 1. CATCH MULTER ERRORS (The missing piece)
        if (err) {
            console.error("Upload Error:", err);
            // This sends the specific error (e.g. "Error: Images Only!") to the browser
            return res.status(400).json({ error: err.message || err });
        }

        // 2. Regular Logic
        try {
            if (!req.file) {
                return res.status(400).json({ error: "No file uploaded or file rejected" });
            }

            const imagePath = '/uploads/' + req.file.filename;

            const newSpot = new TouristSpot({
                state: req.body.state,
                name: req.body.name,
                category: req.body.category,
                image: imagePath,
                desc: req.body.desc,
                lat: req.body.lat, // <--- ADD THIS
                lng: req.body.lng
            });

            await newSpot.save();
            console.log("New spot added:", newSpot.name);
            res.json({ success: true, message: "Spot added successfully!" });

        } catch (dbError) {
            console.error("Database Error:", dbError);
            res.status(500).json({ error: "Database error: " + dbError.message });
        }
    });
});

app.delete('/api/spots/:id', async (req, res) => {
    try {
        await TouristSpot.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Spot deleted!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to delete spot" });
    }
});


app.listen(PORT, () => {
    console.log(`Server running at https://trailbliss.onrender.com:${PORT}`);
    console.log(`- Login Page:  https://trailbliss.onrender.com:${PORT}/log.html`);
    console.log(`- Website:     https://trailbliss.onrender.com:${PORT}/tourist.html`);
});

const nodemailer = require('nodemailer');


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'trailbliss.02@gmail.com',
        pass: 'jwhy wwlm suat jixm'
    }
});


app.post('/api/send-verification', async (req, res) => {
    const { email } = req.body;


    const verificationCode = Math.floor(100000 + Math.random() * 900000);

    const mailOptions = {
        from: 'Trail Bliss <trailbliss.02@gmail.com>',
        to: email,
        subject: 'Verify your Trail Bliss Account',
        text: `Your verification code is: ${verificationCode}`
    };

    try {

        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${email} with code ${verificationCode}`);
        res.json({ success: true, code: verificationCode });

    } catch (error) {
        console.error("Email Error:", error);
        res.status(400).json({ error: "Could not send email. Address may be invalid." });
    }
});

// 1. Create the Schema
const feedbackSchema = new mongoose.Schema({
    name: String,
    email: String,
    message: String,
    date: { type: Date, default: Date.now }
});
const Feedback = mongoose.model('Feedback', feedbackSchema);

// 2. Create the Route to receive feedback
app.post('/api/feedback', async (req, res) => {
    try {
        const { name, email, message } = req.body;

        const newFeedback = new Feedback({
            name,
            email,
            message
        });

        await newFeedback.save();
        console.log(`📩 New Feedback received from: ${email}`);
        res.json({ success: true, message: "Feedback saved successfully!" });

    } catch (error) {
        console.error("Feedback Error:", error);
        res.status(500).json({ error: "Failed to save feedback" });
    }
});

// Optional: A quick way for you to VIEW feedback in your browser
// Go to http://localhost:3000/api/view-feedback to see messages
app.get('/api/view-feedback', async (req, res) => {
    const messages = await Feedback.find().sort({ date: -1 });
    res.json(messages);
});

// --- NEW SCHEMAS ---

// 1. Extended Guide Profile (linked to User)
const guideProfileSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true }, // Links to User
    name: String,
    bio: String,
    experience: String,
    languages: String,
    phone: String,
    profileImage: String,
    rating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 }
});
const GuideProfile = mongoose.model('GuideProfile', guideProfileSchema);

// 2. Booking Schema
// [server.js]

// 1. UPDATE Booking Schema (Add touristPhone)
const bookingSchema = new mongoose.Schema({
    touristEmail: String,
    touristPhone: String,
    guideEmail: String,
    spotName: String,
    date: String,
    type: String,
    status: { type: String, default: 'Pending' },
    rating: { type: Number, default: 0 },         // <--- NEW
    review: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now }
});
const Booking = mongoose.model('Booking', bookingSchema);

// --- NEW API ROUTES ---

// Get all guides (for Tourist to select)
app.get('/api/guides', async (req, res) => {
    try {
        const guides = await GuideProfile.find();
        res.json(guides);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create a Booking
app.post('/api/book', async (req, res) => {
    try {
        const newBooking = new Booking(req.body);
        await newBooking.save();
        res.json({ success: true, message: "Booking Request Sent!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});


// Update Booking Status (Accept/Reject)
app.put('/api/booking-status', async (req, res) => {
    const { id, status } = req.body;
    try {
        await Booking.findByIdAndUpdate(id, { status });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/complete-trip', async (req, res) => {
    const { bookingId, rating, review } = req.body;
    try {
        // Update the booking status and save feedback
        await Booking.findByIdAndUpdate(bookingId, {
            status: 'Completed',
            rating: parseInt(rating),
            review: review
        });

        res.json({ success: true, message: "Trip completed and feedback saved!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Guide Profile Management (Get & Update)
app.get('/api/guide-profile', async (req, res) => {
    const { email } = req.query;
    try {
        let profile = await GuideProfile.findOne({ email });
        if (!profile) {
            // Create default if not exists
            profile = new GuideProfile({ email, name: 'New Guide' });
            await profile.save();
        }
        res.json(profile);
    } catch (err) { res.status(500).json({ error: err.message }); }
});



// ... existing imports ...



// 4. UPDATE GUIDE PROFILE ROUTE (Handle Image Upload)
app.post('/api/guide-profile', (req, res) => {
    const uploadFunc = upload.single('profileImage');

    uploadFunc(req, res, async (err) => {
        if (err) return res.status(400).json({ error: err.message });

        try {
            const { email, name, bio, languages, experience, phone, address } = req.body;
            
            const updateData = {
                name, bio, languages, experience, phone, address
            };

            // Only update image if a new one is uploaded
            if (req.file) {
                updateData.profileImage = '/uploads/' + req.file.filename;
            }

            await GuideProfile.findOneAndUpdate({ email }, updateData, { upsert: true, new: true });
            res.json({ success: true, message: "Profile Updated Successfully" });
        } catch (dbError) {
            res.status(500).json({ error: dbError.message });
        }
    });
});

// 5. UPDATE GUIDE BOOKINGS ROUTE (Fetch booking + Tourist details logic)
app.get('/api/guide-bookings', async (req, res) => {
    const { email } = req.query;
    try {
        // Only fetch 'offline' bookings assigned to this guide
        const bookings = await Booking.find({ guideEmail: email, type: 'offline' }).sort({ createdAt: -1 });
        res.json(bookings);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ... rest of the server code ...

// In server.js
let otpStore = {}; // Simple in-memory store (use DB for production)

app.post('/api/send-verification', async (req, res) => {
    const { email } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000);
    
    otpStore[email] = code; // Store on server

    // ... send email logic ...
    
    // DO NOT send 'code' in this json
    res.json({ success: true, message: "Code sent" }); 
});

// New Verification Route
app.post('/api/verify-code', (req, res) => {
    const { email, code } = req.body;
    if (otpStore[email] && otpStore[email] == code) {
        delete otpStore[email]; // Clear code after use
        res.json({ success: true });
    } else {
        res.status(400).json({ error: "Invalid Code" });
    }
});

// [server.js] - ADD THIS SECTION

// Get Bookings for a specific Tourist (with Guide Details)
app.get('/api/tourist-bookings', async (req, res) => {
    const { email } = req.query;
    try {
        // 1. Find all bookings for this tourist
        const bookings = await Booking.find({ touristEmail: email }).sort({ createdAt: -1 });

        // 2. Enhance bookings with Guide Details
        const enhancedBookings = await Promise.all(bookings.map(async (b) => {
            // Find the guide profile associated with this booking
            const guide = await GuideProfile.findOne({ email: b.guideEmail });

            // 3. PRIVACY LOGIC: Only show phone/contact if Accepted
            let contactInfo = "Hidden until accepted";
            if (b.status === 'Accepted' && guide) {
                contactInfo = guide.phone || guide.email;
            }

            return {
                ...b._doc, // The original booking data
                guideName: guide ? guide.name : "Unknown Guide",
                guideContact: contactInfo
            };
        }));

        res.json(enhancedBookings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
