const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({
  margin: 40,
  size: 'A4'
});

const outputPath = path.join(__dirname, 'Kalkulus_Securytas_Documentation.pdf');
const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

// Styling Colors
const COLOR_BLACK = '#000000';
const COLOR_DARK_GRAY = '#1a1a1a';
const COLOR_LIGHT_GRAY = '#666666';
const COLOR_ACCENT = '#000000';
const COLOR_WHITE = '#ffffff';

// Title Header
doc.fillColor(COLOR_BLACK)
   .fontSize(26)
   .font('Helvetica-Bold')
   .text('KALKULUS SECURYTAS', { align: 'left' });

doc.fontSize(12)
   .font('Helvetica')
   .fillColor(COLOR_LIGHT_GRAY)
   .text('Universal Temporary Cross-Device Data & File Storage System', { align: 'left' });

doc.moveDown(0.5);
doc.strokeColor('#cccccc').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
doc.moveDown(1);

// Section 1: System Overview
addSectionHeading('1. System Overview & Purpose');
addParagraph('Kalkulus Securytas is a minimalist, ultra-fast cross-device clipboard and file sharing application. It enables users to transfer text snippets, full source code repositories, PowerPoint presentations, videos, audios, PDFs, and documents between any device or browser using a simple 4-digit numeric PIN code—without requiring account creation or login.');

addParagraph('Key Requirement: 100% Temporary Storage. Every uploaded item has a configurable expiration timer (1 Hour, 24 Hours, 3 Days, 7 Days). Once expired, the background server cleanup routine automatically unlinks files from the disk and removes data from memory.');

doc.moveDown(0.8);

// Section 2: Technology Stack Used
addSectionHeading('2. Technology Stack & Architecture');

addBulletPoint('Frontend Layer', 'Built using HTML5, Vanilla ES6+ JavaScript, and modern CSS3 (Pitch-Black Minimalist design system, CSS Flexbox & Grid, responsive mobile media queries). Uses FontAwesome font icons and QRCode.js for mobile camera scanning.');

addBulletPoint('Backend API Server', 'Powered by Node.js and Express.js REST APIs handling CORS, JSON body payloads (up to 100MB body parser limits), file downloads, and PIN queries.');

addBulletPoint('File Upload Engine', 'Utilizes Multer middleware with disk storage engines for handling multipart file uploads (supporting PPTX, Video, Audio, PDF, Docs, Zip).');

addBulletPoint('Data Persistence & Cleanup', 'JSON file-backed data store (`data_store.json`) with automatic fallback to `/tmp` directory on Vercel serverless environments. Background interval process runs every 60 seconds to purge expired clips.');

addBulletPoint('Deployment Compatibility', 'Pre-configured with `vercel.json` for 1-click Vercel Serverless deployment, as well as 24/7 persistent hosting on Render, Railway, Koyeb, or local Node.js environment.');

doc.moveDown(0.8);

// Section 3: Step-by-Step Workflow
addSectionHeading('3. Step-by-Step Workflow');

addStep('Step 1: Data / File Upload (Sender Device)', 'Sender pastes text/code or drops a file (PPT, Video, Audio, PDF) and selects an expiration timer (1 Hour, 24 Hours, 3 Days, 7 Days).');

addStep('Step 2: PIN Code & WhatsApp Generation', 'The server generates a unique 4-digit numeric PIN (e.g. 4829) and formats a 1-click WhatsApp share link with the PIN and direct URL.');

addStep('Step 3: PIN Retrieval (Receiver Device)', 'On any receiving device or browser, the user enters the 4-digit PIN code. The server matches the PIN, increments view metrics, and opens the payload with 1-click Copy or File Download options.');

addStep('Step 4: Automatic Disk Purge', 'When the clip reaches its expiration timestamp, the server unlinks the file from disk (`fs.unlinkSync`) and purges records from data storage.');

doc.moveDown(0.8);

// Section 4: Technical API Reference
addSectionHeading('4. REST API Technical Reference');

addApiEndpoint('POST /api/clip', 'Creates text, code, or URL clip. Returns { pin, id, clip }.');
addApiEndpoint('POST /api/upload', 'Uploads file payload via Multer multipart form. Returns { pin, id, clip }.');
addApiEndpoint('GET /api/pin/:pin', 'Fetches active clip payload by 4-digit numeric PIN.');
addApiEndpoint('GET /api/clips', 'Returns list of active non-expired storage vault items.');
addApiEndpoint('DELETE /api/clips/:id', 'Manually deletes a clip and unlinks file from server storage.');
addApiEndpoint('GET /api/download/:id', 'Streams file download attachment with original filename.');
addApiEndpoint('GET /api/stats', 'Returns server metrics (total clips, total storage used in MB, uptime).');

// Helper Functions
function addSectionHeading(text) {
  doc.font('Helvetica-Bold')
     .fontSize(14)
     .fillColor(COLOR_BLACK)
     .text(text);
  doc.moveDown(0.3);
}

function addParagraph(text) {
  doc.font('Helvetica')
     .fontSize(10)
     .fillColor(COLOR_DARK_GRAY)
     .text(text, { align: 'justify', lineGap: 3 });
  doc.moveDown(0.4);
}

function addBulletPoint(title, desc) {
  doc.font('Helvetica-Bold')
     .fontSize(10)
     .fillColor(COLOR_BLACK)
     .text(`• ${title}: `, { continued: true });
  doc.font('Helvetica')
     .fillColor(COLOR_DARK_GRAY)
     .text(desc, { lineGap: 2 });
  doc.moveDown(0.3);
}

function addStep(stepTitle, stepDesc) {
  doc.font('Helvetica-Bold')
     .fontSize(10)
     .fillColor(COLOR_BLACK)
     .text(`${stepTitle}: `, { continued: true });
  doc.font('Helvetica')
     .fillColor(COLOR_DARK_GRAY)
     .text(stepDesc, { lineGap: 2 });
  doc.moveDown(0.3);
}

function addApiEndpoint(endpoint, desc) {
  doc.font('Courier-Bold')
     .fontSize(9)
     .fillColor(COLOR_BLACK)
     .text(endpoint, { continued: true });
  doc.font('Helvetica')
     .fontSize(9)
     .fillColor(COLOR_DARK_GRAY)
     .text(`  - ${desc}`, { lineGap: 2 });
  doc.moveDown(0.2);
}

doc.end();

stream.on('finish', () => {
  console.log(`PDF Documentation successfully created at: ${outputPath}`);
});
