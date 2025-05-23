const { excec } = require('child_process');
const path = require('path');
const fs = require('fs');


const transcribeFile = (req, res) => {
    const filePath = path.join(__dirname, '..', req.file.path);
    const audioPath = filePath.replace(path.extname(filePath), '.mp3');
    const outputPath = path.join(__dirname, '..', 'transcriptions', `${Date.now()}.txt`);

    excec(`ffmpeg -i "${filePath}" -ar 16000 -ac 1 -f wav "${audioPath}" -y`, (err) => {
        if (err) return res.status(500).json({ error: 'Error converting audio file' });

        excec(`whisper "${audioPath}" --language Spanish --output_format txt --output_dir transcriptions`, (err2) =>{
            if (err2) return res.status(500).json({ error: 'Error al transcribir con Whisper' });

            const transcriptionFile = audioPath.replace(path.extname(audioPath), '.txt').replace('uploads', 'transcriptions');

            fs.readFile(transcriptionFile, 'utf8', (err3, data) => {
                if (err3) return res.status(500).json({ error: 'Error reading transcription file' });

                res.json({text: data});
            });
        })
    })
}

module.exports = { transcribeFile };