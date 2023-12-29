const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const bcrypt = require('bcrypt');
const cors=require('cors')
const fs = require('fs').promises

const app = express();
app.use(cors())
app.use(express.json())
const PORT = process.env.PORT || 3000;



//  middleware for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads');
  },
  filename: (req, file, cb) => {
    cb(null,  file.originalname);
  },
});
const upload = multer({ storage });

//MongoDB schema for users 
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

//MongoDB schema for and files
const fileSchema = new mongoose.Schema({
  userId: String,
  filename: String,
  code: String,
});

const User = mongoose.model('User', userSchema);
const File = mongoose.model('File', fileSchema);

// Express routes
// User registration
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try{
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ username, password: hashedPassword });
    await user.save();
  
    res.status(201).json({ 'msg': 'User registered successfully' });
  }catch(err){
    res.status(400).json({'msg':'Error'})
  }
});

// User login 
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try{
    const user = await User.findOne({ username });

    if (user && await bcrypt.compare(password, user.password)) {
      res.status(200).json({ 'msg': 'Login successful',user });
    } else {
      res.status(401).json({ 'msg': 'Invalid credentials try again' });
    }
  }catch(err){
    res.status(400).json({'msg':'Error'})
  }
});

// File upload
app.post('/upload', upload.single('file'), async (req, res) => {
  const { filename } = req.file;
  const { userId } = req.body;

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  const file = new File({ userId, filename, code });
  await file.save();

  res.status(201).json({ code, message: 'File uploaded successfully' });
});

// Get list of uploaded files
app.get('/files/:userId', async (req, res) => {
  const { userId } = req.params;
  const files = await File.find({ userId });

  res.status(200).json(files);
});

// Delete file

app.delete('/files/:fileId', async (req, res) => {
    try {
      const { fileId } = req.params;
  
     
      const file = await File.findById(fileId);
  
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }
      await File.findByIdAndDelete(fileId);
      
      await fs.unlink(`./uploads/${file.filename}`);
  
      res.status(200).json({ message: 'File deleted successfully' });
    } catch (error) {
      console.error('Error deleting file:', error.message);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });
  

// Serve uploaded files for download
app.get('/download/:code', async (req, res) => {
  const { code } = req.params;
  const file = await File.findOne({ code });

  if (file) {
    
    const filename=file.filename
    res.download(`./uploads/${file.filename}`)
  } else {
    res.status(404).json({ message: 'File not found' });
  }
});

app.listen(PORT, () => {
    // Connect to MongoDB 
    mongoose.connect('mongodb+srv://manojpatil:manojpatil@cluster0.dkhehjp.mongodb.net/?retryWrites=true&w=majority')
    .then(()=>console.log('connected to db'))
    .catch(()=>console.log('connection error'))
    console.log(`Server is running on http://localhost:${PORT}`);
});
