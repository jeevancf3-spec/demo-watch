const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const axios = require('axios'); // ഇമേജ് ക്ലൗഡിലേക്ക് അയക്കാൻ ആവശ്യമാണ്
const FormData = require('form-data');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static Files serving
app.use(express.static(__dirname));

// --- 🔴 ഇലേക്ക് നിന്റെ API KEY പേസ്റ്റ് ചെയ്യുക 🔴 ---
// നീ ഗിറ്റ്‌ഹബ്ബിൽ ഇട്ട നിന്റെ സ്വന്തം ImgBB API Key ഇവിടെ ഉണ്ടെന്ന് ഉറപ്പാക്കുക
const IMGBB_API_KEY = 'fa4975a1faedd2da6323a3ff402b214d'; 

// മൾട്ടർ താൽക്കാലികമായി റാമിൽ ഫയൽ വെക്കാൻ ഉപയോഗിക്കുന്നു
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Database File Path
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

// --- 🌐 API ROUTES ---

// 1. എല്ലാ വാച്ചുകളും എടുക്കാൻ (Get All Watches)
app.get('/api/watches', (req, res) => {
    res.json(readData());
});

// 2. പുതിയ വാച്ച് ക്ലൗഡ് അപ്‌ലോഡ് വഴി ആഡ് ചെയ്യാൻ (Add New Watch)
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
                    imageUrls.push(response.data.data.url); // പെർമനന്റ് ക്ലൗഡ് ലിങ്ക് ലിസ്റ്റിലേക്ക് ചേർക്കുന്നു
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

// 3. പ്രൊഡക്റ്റുകൾ ഡിലീറ്റ് ചെയ്യാനുള്ള വഴി (വഴി 2: സ്ട്രോങ്ങ് ഐഡി ചെക്കിങ്)
app.delete('/api/watches/:id', (req, res) => {
    try {
        const watchId = req.params.id;
        let watches = readData();

        // പഴയതും പുതിയതുമായ എല്ലാ തരം ഐഡികളും (String/Number) കൃത്യമായി ഫിൽട്ടർ ചെയ്യുന്നു
        const updatedWatches = watches.filter(watch => {
            // ഐഡി ഇല്ലാത്ത പഴയ വാച്ചുകൾ ആണെങ്കിൽ അതിനെ ഡിലീറ്റ് ലിസ്റ്റിൽ ഉൾപ്പെടുത്തി ഒഴിവാക്കുന്നു
            if (!watch.id) return false; 
            
            // ഐഡി ഉണ്ടെങ്കിൽ അത് മാച്ച് ചെയ്യാത്തവ മാത്രം ബാക്കിവെക്കുന്നു
            return watch.id.toString() !== watchId.toString();
        });

        if (watches.length === updatedWatches.length) {
            return res.status(404).json({ success: false, message: 'Watch not found!' });
        }

        writeData(updatedWatches);
        res.json({ success: true, message: 'Watch deleted successfully!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error deleting watch' });
    }
});

// --- 📄 FRONTEND ROUTES ---

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Server Start
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
