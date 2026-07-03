const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- STATIC FILES CONFIGURATION ---
app.use(express.static(__dirname));

// നിന്റെ ഗിറ്റ്ഹബ്ബിലുള്ള 'photo' ഫോൾഡർ ഇമേജ് സ്റ്റോറേജിനായി ഉപയോഗിക്കുന്നു
let photoFolderPath = path.join(__dirname, 'photo');
app.use('/photo', express.static(photoFolderPath));

// ഒരു സുരക്ഷയ്ക്ക് വേണ്ടി ഫോൾഡർ ഇല്ലെങ്കിൽ ഉണ്ടാക്കാനുള്ള ലോജിക്
if (!fs.existsSync(photoFolderPath)) {
    fs.mkdirSync(photoFolderPath, { recursive: true });
}

// --- MULTER CONFIGURATION FOR 'photo' FOLDER ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, photoFolderPath); // ഇവിടെ നമ്മൾ 'photo' ഫോൾഡർ സെറ്റ് ചെയ്തു
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Data File Path
const dataFilePath = path.join(__dirname, 'watches.json');

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

app.get('/api/watches', (req, res) => {
    const watches = readData();
    res.json(watches);
});

app.post('/api/watches', upload.array('images', 10), (req, res) => {
    try {
        const watches = readData();
        
        // ഇവിടെ ഇമേജ് പാത്ത് '/photo/filename.jpg' എന്ന് മാറ്റി
        const filePaths = req.files ? req.files.map(file => `/photo/${path.basename(file.path)}`) : [];

        const newWatch = {
            id: Date.now().toString(),
            name: req.body.name,
            price: req.body.price,
            description: req.body.description,
            images: filePaths
        };

        watches.push(newWatch);
        writeData(watches);
        res.status(201).json({ success: true, message: 'Watch added successfully!', watch: newWatch });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error adding watch' });
    }
});

// --- FRONTEND ROUTES ---

app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('index.html not found');
    }
});

app.get('/admin', (req, res) => {
    const adminPath = path.join(__dirname, 'admin.html');
    if (fs.existsSync(adminPath)) {
        res.sendFile(adminPath);
    } else {
        res.status(404).send('admin.html not found');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
