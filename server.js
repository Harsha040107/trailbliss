const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const fs = require('fs');

// --- NEW IMPORTS FOR CLOUDINARY ---
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = process.env.PORT || 3000; // Use process.env.PORT for Render

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

mongoose.connect('mongodb+srv://TrailBliss04:Harsha04@trailbliss.6zqk71c.mongodb.net/?appName=TrailBliss')
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- SCHEMAS ---
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ['tourist', 'guide'] }
});
const User = mongoose.model('TrailBlissUser', userSchema);

const spotSchema = new mongoose.Schema({
    state: String,
    name: String,
    category: String,
    image: String,
    desc: String,
    lat: Number,
    lng: Number
});
const TouristSpot = mongoose.model('TouristSpot', spotSchema);

const feedbackSchema = new mongoose.Schema({
    name: String,
    email: String,
    message: String,
    date: { type: Date, default: Date.now }
});
const Feedback = mongoose.model('Feedback', feedbackSchema);

const guideProfileSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
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

const bookingSchema = new mongoose.Schema({
    touristEmail: String,
    touristPhone: String,
    guideEmail: String,
    spotName: String,
    date: String,
    type: String,
    status: { type: String, default: 'Pending' },
    rating: { type: Number, default: 0 },
    review: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now }
});
const Booking = mongoose.model('Booking', bookingSchema);

// --- CLOUDINARY CONFIGURATION ---
// IMPORTANT: Replace these with your actual keys from Cloudinary Dashboard
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME || 'dvcn1fr7o', 
    api_key: process.env.CLOUD_API_KEY || '964939665952476', 
    api_secret: process.env.CLOUD_API_SECRET || 'g8eq8NuD8_a1yqbwonHt7PkEm3k'
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'trailbliss_uploads', // Folder name in Cloudinary
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    },
});

const upload = multer({ storage: storage });

// --- ROUTES ---

// Registration
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword, role });
        await newUser.save();
        res.json({ success: true, message: "Registration successful!" });
    } catch (error) {
        res.status(500).json({ error: "Registration failed" });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "User not found" });

        if (user.role !== role) return res.status(403).json({ error: `Please log in via the ${user.role} tab.` });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid password" });

        res.json({ success: true, message: "Login successful", role: user.role });
    } catch (error) {
        res.status(500).json({ error: "Login failed" });
    }
});

// Get Spots
app.get('/api/spots', async (req, res) => {
    try {
        const spots = await TouristSpot.find();
        res.json(spots);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch spots" });
    }
});

// Add Spot (Using Cloudinary)
app.post('/api/spots', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No image uploaded" });

        // Cloudinary provides the URL in req.file.path
        const imageUrl = req.file.path; 

        const newSpot = new TouristSpot({
            state: req.body.state,
            name: req.body.name,
            category: req.body.category,
            image: imageUrl, // Saving the Cloudinary URL
            desc: req.body.desc,
            lat: req.body.lat,
            lng: req.body.lng
        });

        await newSpot.save();
        res.json({ success: true, message: "Spot added successfully!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to add spot" });
    }
});

// Delete Spot
app.delete('/api/spots/:id', async (req, res) => {
    try {
        await TouristSpot.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Spot deleted!" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete spot" });
    }
});

// Feedback
app.post('/api/feedback', async (req, res) => {
    try {
        const { name, email, message } = req.body;
        const newFeedback = new Feedback({ name, email, message });
        await newFeedback.save();
        res.json({ success: true, message: "Feedback saved!" });
    } catch (error) {
        res.status(500).json({ error: "Failed to save feedback" });
    }
});

app.get('/api/view-feedback', async (req, res) => {
    const messages = await Feedback.find().sort({ date: -1 });
    res.json(messages);
});

// Guide Routes
app.get('/api/guides', async (req, res) => {
    try {
        const guides = await GuideProfile.find();
        res.json(guides);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/guide-profile', async (req, res) => {
    const { email } = req.query;
    try {
        let profile = await GuideProfile.findOne({ email });
        if (!profile) {
            profile = new GuideProfile({ email, name: 'New Guide' });
            await profile.save();
        }
        res.json(profile);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update Guide Profile (Using Cloudinary)
app.post('/api/guide-profile', upload.single('profileImage'), async (req, res) => {
    try {
        const { email, name, bio, languages, experience, phone, address } = req.body;
        const updateData = { name, bio, languages, experience, phone, address };

        if (req.file) {
            updateData.profileImage = req.file.path; // Cloudinary URL
        }

        await GuideProfile.findOneAndUpdate({ email }, updateData, { upsert: true, new: true });
        res.json({ success: true, message: "Profile Updated Successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Booking Routes
app.post('/api/book', async (req, res) => {
    try {
        const newBooking = new Booking(req.body);
        await newBooking.save();
        res.json({ success: true, message: "Booking Request Sent!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

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
        await Booking.findByIdAndUpdate(bookingId, {
            status: 'Completed',
            rating: parseInt(rating),
            review: review
        });
        res.json({ success: true, message: "Trip completed!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/guide-bookings', async (req, res) => {
    const { email } = req.query;
    try {
        const bookings = await Booking.find({ guideEmail: email, type: 'offline' }).sort({dHcreatedAt: -1 });
        res.json(bookings);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/tourist-bookings', async (req, res) => {
    const { email } = req.query;
    try {
        const bookings = await Booking.find({ touristEmail: email }).sort({ createdAt: -1 });
        const enhancedBookings = await Promise.all(bookings.map(async (b) => {
            const guide = await GuideProfile.findOne({ email: b.guideEmail });
            let contactInfo = "Hidden until accepted";
            if (b.status === 'Accepted' && guide) {
                contactInfo = guide.phone || guide.email;
            }
            return {
                ...b._doc,
                guideName: guide ? guide.name : "Unknown Guide",
                guideContact: contactInfo
            };
        }));
        res.json(enhancedBookings);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
