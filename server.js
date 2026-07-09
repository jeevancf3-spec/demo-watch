const express = require('express');
const path = require('path');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const mongoose = require('mongoose'); // മംഗോഡിബി പാക്കേജ്

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// --- 🔴 CONFIGURATIONS (നിന്റെ കീകൾ ഇവിടെ നൽകുക) 🔴 ---
const IMGBB_API_KEY = 'fa4975a1faedd2da6323a3ff402b214d'; 
const MONGO_URI = 'mongodb+srv://jeevancf:<db_qwert.CodeX>@cluster0.e92qmxu.mongodb.net/?appName=Cluster0';

// MongoDB Connection
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected Successfully!'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Define Watch Schema (ഡാറ്റാബേസ് ഘടന)
const watchSchema = new mongoose.Schema({
    name: String,
    price: String,
    description: String,
    images: [String]
}, { timestamps: true });

const Watch = mongoose.model('Watch', watchSchema);

// Multer Config
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- 🌐 API ROUTES ---

// 1. Get All Watches from MongoDB
app.get('/api/watches', async (req, res) => {
    try {
        const watches = await Watch.find().sort({ createdAt: -1 });
        // പഴയ ഫ്രണ്ട്എൻഡ് കോഡിന് മാച്ച് ആകാൻ _id നമ്മൾ id ആക്കി മാറ്റുന്നു
        const formattedWatches = watches.map(w => ({
            id: w._id.toString(),
            name: w.name,
            price: w.price,
            description: w.description,
            images: w.images
        }));
        res.json(formattedWatches);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching data' });
    }
});

// 2. Add New Watch to MongoDB
app.post('/api/watches', upload.array('images', 10), async (req, res) => {
    try {
        const imageUrls = [];

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const formData = new FormData();
                formData.append('image', file.buffer.toString('base64'));

                const response = await axios.post(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, formData, {
                    headers: formData.getHeaders()
                });

                if (response.data && response.data.data && response.data.data.url) {
                    imageUrls.push(response.data.data.url);
                }
            }
        }

        const newWatch = new Watch({
            name: req.body.name,
            price: req.body.price,
            description: req.body.description,
            images: imageUrls
        });

        await newWatch.save();
        res.status(201).json({ success: true, message: 'Watch added to cloud database!', watch: newWatch });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Cloud error: ' + error.message });
    }
});

// 3. Delete Watch from MongoDB
app.delete('/api/watches/:id', async (req, res) => {
    try {
        const watchId = req.params.id;
        const deletedWatch = await Watch.findByIdAndDelete(watchId);

        if (!deletedWatch) {
            return res.status(404).json({ success: false, message: 'Watch not found!' });
        }

        res.json({ success: true, message: 'Watch deleted successfully!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error deleting watch' });
    }
});

// Frontend Routes
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
app.get('/admin', (req, res) => { res.sendFile(path.join(__dirname, 'admin.html')); });

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
