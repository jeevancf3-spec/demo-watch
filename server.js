const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Uploads folder-ile photos access cheyyan
app.use(express.json());

// Ensure Uploads & Database exists
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
    fs.mkdirSync(path.join(__dirname, 'uploads'));
}

function readDatabase() {
    if (!fs.existsSync(DATA_FILE)) {
        const defaultData = { watches: [], analytics: { visitors: 0, clicks: 0 } };
        fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 4));
        return defaultData;
    }
    return JSON.parse(fs.readFileSync(DATA_FILE));
}

function writeDatabase(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 4));
}

// Multer Setup for File Upload (Max 10 files) - only images allowed
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
});

const fileFilter = (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
};

const upload = multer({ storage: storage, fileFilter: fileFilter }).array('photos', 10);

// --- ROUTES ---
app.get('/', (req, res) => {
    const db = readDatabase();
    db.analytics.visitors++;
    writeDatabase(db);
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API: Get all watches
app.get('/api/watches', (req, res) => {
    const db = readDatabase();
    res.json(db.watches);
});

// API: Add new watch with Multiple Photos
app.post('/api/watches', (req, res) => {
    upload(req, res, function (err) {
        if (err) return res.status(500).json({ success: false, message: "Upload error" });

        const db = readDatabase();

        // Map uploaded files to URLs (safely handle no files)
        const photoUrls = (req.files || []).map(file => `/uploads/${file.filename}`);

        const newWatch = {
            id: Date.now(),
            name: req.body.name || 'Untitled Watch',
            price: parseInt(req.body.price) || 0,
            stock: parseInt(req.body.stock) || 0,
            desc: req.body.desc || "",
            images: photoUrls // Array of image URLs
        };

        db.watches.push(newWatch);
        writeDatabase(db);
        res.status(201).json({ success: true, watch: newWatch });
    });
});

// API: Delete watch
app.delete('/api/watches/:id', (req, res) => {
    const db = readDatabase();
    const watchId = parseInt(req.params.id);
    
    // Optional: Delete images from folder too
    const watch = db.watches.find(w => w.id === watchId);
    if (watch && watch.images) {
        watch.images.forEach(img => {
            // img expected like '/uploads/12345-file.png' or 'uploads/12345-file.png'
            const relative = img.startsWith('/') ? img.slice(1) : img;
            const filePath = path.join(__dirname, relative);
            if (fs.existsSync(filePath)) {
                try { fs.unlinkSync(filePath); } catch (e) { console.warn('Failed to delete', filePath, e); }
            }
        });
    }

    db.watches = db.watches.filter(w => w.id !== watchId);
    writeDatabase(db);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Kronos Engine Running on http://localhost:${PORT}`);
});