const express = require('express');
const multer = require('multer');
const { transcribeFile } = require('../controllers/transcribeController');
const router = express.Router();

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (_, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

router.post('/', upload.single('file'), transcribeFile);

module.exports = router;