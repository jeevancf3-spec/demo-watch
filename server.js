const express = require('express');
const path = require('path');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Define Watch Schema (പുതിയ ഫീച്ചറുകൾ ഉൾപ്പെടുത്തി പരിഷ്കരിച്ചത്)
const watchSchema = new mongoose.Schema({
    name: String,
    price: String,
    description: String,
    images: [String],
    freeDelivery: { type: Boolean, default: false }, // ഫ്രീ ഡെലിവറി ഉണ്ടോ (True/False)
    offerText: { type: String, default: '' }         // ഓഫർ വിവരം (ഉദാ: 20% OFF)
}, { timestamps: true });

const Watch = mongoose.model('Watch', watchSchema);

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- 🌐 API ROUTES ---

// 1. Get All Watches
app.get('/api/watches', async (req, res) => {
    try {
        const watches = await Watch.find().sort({ createdAt: -1 });
        const formattedWatches = watches.map(w => ({
            id: w._id.toString(),
            name: w.name,
            price: w.price,
            description: w.description,
            images: w.images,
            freeDelivery: w.freeDelivery,
            offerText: w.offerText
        }));
        res.json(formattedWatches);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching data' });
    }
});

// 2. Add New Watch
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
            images: imageUrls,
            // ഫ്രണ്ട്എൻഡിൽ നിന്ന് വരുന്ന പുതിയ ഡാറ്റ ഇവിടെ സേവ് ചെയ്യുന്നു
            freeDelivery: req.body.freeDelivery === 'true' || req.body.freeDelivery === true,
            offerText: req.body.offerText || ''
        });

        await newWatch.save();
        res.status(201).json({ success: true, message: 'Watch added successfully!', watch: newWatch });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Cloud error: ' + error.message });
    }
});

// 3. Delete Watch
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
