const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const axios = require('axios'); // ഇമേജ് ക്ലൗഡിലേക്ക് അയക്കാൻ ഇത് വേണം
const FormData = require('form-data');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// --- 🔴 ഇലേക്ക് നിന്റെ API KEY പേസ്റ്റ് ചെയ്യുക 🔴 ---
const IMGBB_API_KEY = 'fa4975a1faedd2da6323a3ff402b214d'; 

// മൾട്ടർ താൽക്കാലികമായി റാമിൽ ഫയൽ വെക്കാൻ ഉപയോഗിക്കുന്നു
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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

// API: എല്ലാ വാച്ചുകളും എടുക്കാൻ
app.get('/api/watches', (req, res) => {
    res.json(readData());
});

// API: പുതിയ വാച്ച് ക്ലൗഡ് അപ്‌ലോഡ് വഴി ആഡ് ചെയ്യാൻ
app.post('/api/watches', upload.array('images', 10), async (req, res) => {
    try {
        const watches = readData();
        const imageUrls = [];

        // അപ്‌ലോഡ് ചെയ്ത ഓരോ ഫോട്ടോയും ImgBB ക്ലൗഡിലേക്ക് അയക്കുന്നു
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const formData = new FormData();
                formData.append('image', file.buffer.toString('base64'));

                const response = await axios.post(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, formData, {
                    headers: formData.getHeaders()
                });

                if (response.data && response.data.data && response.data.data.url) {
                    imageUrls.push(response.data.data.url); // പെർമനന്റ് ക്ലൗഡ് ലിങ്ക് എടുക്കുന്നു
                }
            }
        }

        const newWatch = {
            id: Date.now().toString(),
            name: req.body.name,
            price: req.body.price,
            description: req.body.description,
            images: imageUrls // ക്ലൗഡ് ലിങ്കുകൾ ഇവിടെ സേവ് ആകുന്നു
        };

        watches.push(newWatch);
        writeData(watches);
        res.status(201).json({ success: true, message: 'Watch added successfully to cloud!', watch: newWatch });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Cloud upload failed: ' + error.message });
    }
});

// Frontend Routes
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
app.get('/admin', (req, res) => { res.sendFile(path.join(__dirname, 'admin.html')); });

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
