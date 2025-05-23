// controllers/transcribeController.js
const { exec } = require('child_process');
const path      = require('path');
const fs        = require('fs');
const fsPromises= require('fs/promises');

const THRESHOLD_SEC  = 35;               
const SEGMENT_TIME   = 30;             
const rootDir        = path.join(__dirname, '..');
const partsDir       = path.join(rootDir, 'parts');
const transcriptionsDir = path.join(rootDir, 'transcriptions');

if (!fs.existsSync(transcriptionsDir)) fs.mkdirSync(transcriptionsDir);

const transcribeFile = async (req, res) => {
  const uploadPath = path.join(rootDir, req.file.path);
  const wavPath    = uploadPath.replace(path.extname(uploadPath), '.wav');
  const run        = cmd => new Promise((ok, no) => exec(cmd, err => err ? no(err) : ok()));
  const readText   = file => fsPromises.readFile(file, 'utf8');

  try {
    await run(`ffmpeg -i "${uploadPath}" -ar 16000 -ac 1 -f wav "${wavPath}" -y`);

    const durStdout = await new Promise((ok, no) =>
      exec(
        `ffprobe -v error -show_entries format=duration -of csv="p=0" "${wavPath}"`,
        (err, stdout) => err ? no(err) : ok(stdout)
      )
    );
    const duration = parseFloat(durStdout);

    let finalText;

    if (duration <= THRESHOLD_SEC) {
      await run(
        `whisper "${wavPath}" --language Spanish --output_format txt ` +
        `--output_dir "${transcriptionsDir}" --device cuda`
      );
      const txtPath = path.join(
        transcriptionsDir,
        path.basename(wavPath, '.wav') + '.txt'
      );
      finalText = (await readText(txtPath)).trim();
        fs.unlinkSync(txtPath);
    } else {
      if (!fs.existsSync(partsDir)) fs.mkdirSync(partsDir);

      await run(
        `ffmpeg -i "${wavPath}" -f segment -segment_time ${SEGMENT_TIME} ` +
        `-c copy "${partsDir}/part_%03d.wav" -y`
      );

      const pieces = [];
      const files  = fs.readdirSync(partsDir).filter(f => f.endsWith('.wav'));

      for (const file of files) {
        const segWav = path.join(partsDir, file);
        const segTxt = path.join(partsDir, path.basename(file, '.wav') + '.txt');

        await run(
          `whisper "${segWav}" --language Spanish --output_format txt ` +
          `--output_dir "${partsDir}" --device cuda`
        );
        pieces.push((await readText(segTxt)).trim());

        fs.unlinkSync(segWav);
        fs.unlinkSync(segTxt);
      }
      fs.rmdirSync(partsDir);

      finalText = pieces.join('\n\n');
    }

    fs.unlinkSync(wavPath);

    const finalFile = path.join(
      transcriptionsDir,
      `${Date.now()}.txt`
    );
    await fsPromises.writeFile(finalFile, finalText, 'utf8');

    res.json({
      text: finalText
    });

  } catch (err) {
    if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
    if (fs.existsSync(partsDir)) fs.rmdirSync(partsDir, { recursive: true });
    res.status(500).json({ error: err.toString() });
  }
};

module.exports = { transcribeFile };
