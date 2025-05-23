const express = require('express');
const cors = require('cors');
const transcribeRoutes = require('./routes/transcribe');


const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/transcribe', transcribeRoutes);

app.listen(5000, () => {
  console.log('Server is running on port 5000');
});