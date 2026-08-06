const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({
  margin: 40,
  size: 'A4'
});

const outputPath = path.join(__dirname, 'Vercel_Data_Storage_Explanation.pdf');
const publicPath = path.join(__dirname, 'public', 'vercel_storage_guide.pdf');

const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

// Styling Colors
const COLOR_BLACK = '#000000';
const COLOR_DARK_GRAY = '#1a1a1a';
const COLOR_LIGHT_GRAY = '#666666';

// Header Title
doc.fillColor(COLOR_BLACK)
   .fontSize(24)
   .font('Helvetica-Bold')
   .text('KALKULUS SECURYTAS', { align: 'left' });

doc.fontSize(12)
   .font('Helvetica')
   .fillColor(COLOR_LIGHT_GRAY)
   .text('How Data Storage & Serverless Execution Works on Vercel', { align: 'left' });

doc.moveDown(0.5);
doc.strokeColor('#cccccc').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
doc.moveDown(1);

// Section 1: Executive Summary
addSectionHeading('1. Executive Summary & Answer Key');
addParagraph('If anyone asks you how Kalkulus Securytas stores data on Vercel, here is the exact 1-sentence answer to give them:');
addHighlightBox('"Kalkulus Securytas uses Vercel Serverless Functions with a temporary ephemeral /tmp file system for 100% temporary, self-deleting data transfers between devices."');

doc.moveDown(0.8);

// Section 2: Detailed Technical Architecture on Vercel
addSectionHeading('2. Technical Storage Architecture on Vercel');

addBulletPoint('Serverless Micro-Containers', 'Vercel executes Node.js Express routes as serverless functions. Each function runs inside an isolated micro-container that spins up instantly on demand.');

addBulletPoint('The Ephemeral /tmp File System', 'On Vercel, standard file paths are read-only. However, Vercel provides a temporary writable directory located at `/tmp` (up to 512MB per instance).');

addBulletPoint('File Payload Storage', 'When a user drops a PowerPoint, PDF, Video, Audio, or Document file, Multer writes the uploaded file to `/tmp/uploads/`.');

addBulletPoint('PIN & Clip Metadata Storage', 'When a text clip, code snippet, or file PIN is generated, the server saves the clip object and PIN code (e.g. `4829`) into `/tmp/data_store.json`.');

doc.moveDown(0.8);

// Section 3: The Data Lifecycle (Step-by-Step)
addSectionHeading('3. Complete Data Lifecycle (How Data Travels)');

addStep('1. Upload & PIN Generation', 'User uploads a 24MB file or code snippet from phone. Vercel serverless function receives the payload, writes the file to `/tmp/uploads/`, assigns a unique 4-digit PIN (`4829`), and saves metadata to `/tmp/data_store.json`.');

addStep('2. Instant Cross-Device Retrieval', 'Receiver opens the app on another device/browser and enters `4829`. Vercel serverless function reads `/tmp/data_store.json`, locates PIN `4829`, streams the file from `/tmp/uploads/`, and delivers the payload instantly.');

addStep('3. Automatic Expiration & Disk Purge', 'A 60-second background cleanup routine continuously checks expiration timestamps. Once the clip expires (e.g. 1 hour or 24 hours), `fs.unlinkSync` permanently unlinks the file from disk, ensuring ZERO permanent data retention.');

doc.moveDown(0.8);

// Section 4: Key Interview / Q&A Reference Sheet
addSectionHeading('4. Quick Q&A Reference Sheet (How to Answer Questions)');

addQA('Q: Where are files stored on Vercel?', 'A: In Vercel\'s ephemeral `/tmp/uploads` directory attached to the serverless function environment.');

addQA('Q: Is database setup (PostgreSQL / MongoDB) required?', 'A: No! Because Kalkulus Securytas is designed for 100% temporary transfers, using `/tmp` JSON file persistence eliminates external database costs and latency.');

addQA('Q: What happens when files expire?', 'A: The server automatically calls `fs.unlinkSync()` to permanently purge the file from storage.');

addQA('Q: What is Vercel\'s request payload limit?', 'A: Vercel Free (Hobby) tier allows up to 4.5MB per serverless request. For larger files (up to 200MB), Render persistent hosting can be used.');

// Helper Functions
function addSectionHeading(text) {
  doc.font('Helvetica-Bold')
     .fontSize(13)
     .fillColor(COLOR_BLACK)
     .text(text);
  doc.moveDown(0.3);
}

function addParagraph(text) {
  doc.font('Helvetica')
     .fontSize(9.5)
     .fillColor(COLOR_DARK_GRAY)
     .text(text, { align: 'justify', lineGap: 3 });
  doc.moveDown(0.4);
}

function addHighlightBox(text) {
  doc.rect(40, doc.y, 515, 30).fillAndStroke('#f4f4f5', '#e4e4e7');
  doc.font('Helvetica-BoldOblique')
     .fontSize(9.5)
     .fillColor(COLOR_BLACK)
     .text(text, 50, doc.y - 22, { width: 495 });
  doc.moveDown(0.8);
}

function addBulletPoint(title, desc) {
  doc.font('Helvetica-Bold')
     .fontSize(9.5)
     .fillColor(COLOR_BLACK)
     .text(`• ${title}: `, { continued: true });
  doc.font('Helvetica')
     .fillColor(COLOR_DARK_GRAY)
     .text(desc, { lineGap: 2 });
  doc.moveDown(0.3);
}

function addStep(title, desc) {
  doc.font('Helvetica-Bold')
     .fontSize(9.5)
     .fillColor(COLOR_BLACK)
     .text(`${title}: `, { continued: true });
  doc.font('Helvetica')
     .fillColor(COLOR_DARK_GRAY)
     .text(desc, { lineGap: 2 });
  doc.moveDown(0.3);
}

function addQA(q, a) {
  doc.font('Helvetica-Bold')
     .fontSize(9.5)
     .fillColor(COLOR_BLACK)
     .text(q);
  doc.font('Helvetica')
     .fontSize(9)
     .fillColor(COLOR_DARK_GRAY)
     .text(a, { lineGap: 2 });
  doc.moveDown(0.4);
}

doc.end();

stream.on('finish', () => {
  fs.copyFileSync(outputPath, publicPath);
  console.log(`Vercel Data Storage PDF created successfully at: ${outputPath}`);
});
