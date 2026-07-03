const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- FOLDER STRUCTURE FIX FOR RENDER ---
// ഫയലുകൾ റൂട്ടിലാണോ അതോ demo-watch ഫോൾഡറിലാണോ എന്ന് നോക്കി static ഫയലുകൾ സെർവ് ചെയ്യുന്നു
let publicPath = path.join(__dirname, 'public');
let uploadsPath = path.join(__dirname, 'uploads');

if (!fs.existsSync(publicPath) && fs.existsSync(path.join(__dirname, 'demo-watch', 'public'))) {
    publicPath = path.join(__dirname, 'demo-watch', 'public');
    uploadsPath = path.join(__dirname, 'demo-watch', 'uploads');
}

app.use(express.static(publicPath));
app.use('/uploads', express.static(uploadsPath));

// Uploads ഫോൾഡർ ഇല്ലെങ്കിൽ അത് ഉണ്ടാക്കാനുള്ള കോഡ്
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
}

// --- MULTER CONFIGURATION FOR MULTIPLE IMAGES ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Data File Path
let dataFilePath = path.join(__dirname, 'data.json');
if (!fs.existsSync(dataFilePath) && fs.existsSync(path.join(__dirname, 'demo-watch', 'data.json'))) {
    dataFilePath = path.join(__dirname, 'demo-watch', 'data.json');
}

// Helper functions to read/write JSON data
const readData = () => {
    if (!fs.existsSync(dataFilePath)) return [];
    try {
        const data = fs.readFileSync(dataFilePath, 'utf8');
        return JSON.parse(data || '[]');
    } catch (e) {
        return [];
    }
};

const writeData = (data) => {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
};

// --- API ROUTES ---

// 1. Get all watches
app.get('/api/watches', (req, res) => {
    const watches = readData();
    res.json(watches);
});

// 2. Add a new watch (Max 10 Images)
app.post('/api/watches', upload.array('images', 10), (req, res) => {
    try {
        const watches = readData();
        
        // അപ്‌ലോഡ് ചെയ്ത ഫയലുകളുടെ പാത്തുകൾ എടുക്കുന്നു
        const filePaths = req.files ? req.files.map(file => `/uploads/${path.basename(file.path)}`) : [];

        const newWatch = {
            id: Date.now().toString(),
            name: req.body.name,
            price: req.body.price,
            description: req.body.description,
            images: filePaths // Array of image URLs
        };

        watches.push(newWatch);
        writeData(watches);
        res.status(201).json({ success: true, message: 'Watch added successfully!', watch: newWatch });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error adding watch' });
    }
});

// --- FRONTEND ROUTES ---

// Main website route (index.html)
app.get('/', (req, res) => {
    const indexPath = path.join(publicPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('index.html not found');
    }
});

// Admin Page Route
app.get('/admin', (req, res) => {
    const adminPath = path.join(publicPath, 'admin.html');
    if (fs.existsSync(adminPath)) {
        res.sendFile(adminPath);
    } else {
        res.status(404).send('admin.html not found');
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
