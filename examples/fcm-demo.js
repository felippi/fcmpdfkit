/**
 * FCM Demo - Showcase of enhanced FCMPDFKit functionality
 * Demonstrates multi-page rectangles, positioning utilities, and development tools
 */

var PDFDocument = require('../');
var fs = require('fs');

// Create a new PDFDocument
var doc = new PDFDocument({
  margin: 50,
  bufferPages: true, // Required by footer with total pages
});

// Pipe to output file
doc.pipe(fs.createWriteStream('fcm-demo.pdf'));

// Set document metadata
doc.info['Title'] = 'FCMPDFKit Demo - Enhanced Features';
doc.info['Author'] = 'FCMPDFKit';
doc.info['Subject'] = 'Demonstration of FCM enhancements';

// === TITLE PAGE ===
doc.fontSize(28)
   .font('Helvetica-Bold')
   .text('FCMPDFKit Demo', 0, 100, { align: 'center' });

doc.fontSize(16)
   .font('Helvetica')
   .text('Enhanced Features Demonstration', 0, 140, { align: 'center' });

doc.fontSize(12)
   .text('This document showcases the new functionality added by FCM:', 0, 180, { align: 'center' });

// Feature list
const features = [
  '• Multi-page rectangles with automatic page handling',
  '• Enhanced positioning utilities (incX, incY, setXY)',
  '• Smart page break control with tryAddPage()',
  '• Development ruler for precise positioning',
  '• Intelligent row label text layouts with auto-wrapping',
  '• beforePageAdded event for custom page handling',
  '• usefulW and usefulH properties for layout calculations'
];

doc.y = 220;
features.forEach(feature => {
  doc.incY(20);
  doc.text(feature, 100);
});

// === MULTI-PAGE RECTANGLE DEMO ===
doc.addPage();
doc.fontSize(18)
   .font('Helvetica-Bold')
   .text('Multi-Page Rectangle Demo');

doc.fontSize(12)
   .font('Helvetica')
   .text('This section demonstrates rectangles that span across multiple pages automatically.');

// Start a multi-page rectangle
doc.y = 120;
doc.startRect({
  x: 80,
  y: doc.y,
  w: 400,
  r: 8,
  lineWidth: 2
});

// Add content inside the rectangle
doc.x = 100;
doc.incY(20);
doc.fontSize(14)
   .font('Helvetica-Bold')
   .text('Content inside multi-page rectangle');

doc.incY(30);
doc.fontSize(11)
   .font('Helvetica');

// Generate enough content to span multiple pages
const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';

for (let i = 0; i < 15; i++) {
  doc.x = 100;
  doc.text(`Paragraph ${i + 1}: ${lorem}`, {
    width: 360,
    align: 'justify'
  });
  
  doc.incY(20); // Use FCM positioning utility
  
  // Check if we need more space and trigger page break if necessary
  doc.tryAddPage(100);
}

// End the multi-page rectangle
doc.stopRect();

// === POSITIONING UTILITIES DEMO ===
doc.addPage();
doc.fontSize(18)
   .font('Helvetica-Bold')
   .text('Positioning Utilities Demo');

doc.fontSize(12)
   .font('Helvetica')
   .text('FCM provides enhanced positioning methods for precise layout control.');

// Demonstrate positioning utilities
doc.setXY(100, 120);
doc.fontSize(10).text('setXY(100, 120) - Set absolute position');

doc.incX(200);
doc.text('incX(200) - Move 200 points right');

doc.incY(30);
doc.text('incY(30) - Move 30 points down');

doc.startX();
doc.incY(20);
doc.text('startX() - Return to left margin');

doc.incXY(150, 30);
doc.text('incXY(150, 30) - Move both X and Y');

// Show useful dimensions
doc.setY(250);
doc.fontSize(12);
// doc.text(`usefulW (available width): ${doc.usefulW} points`);
// doc.text(`usefulH (available height): ${doc.usefulH} points`);

// === SMART PAGE CONTROL DEMO ===
doc.addPage();
doc.fontSize(18)
   .font('Helvetica-Bold')
   .text('Smart Page Control Demo');

doc.fontSize(12)
   .font('Helvetica')
   .text('tryAddPage() automatically adds a page when space is insufficient.');

// Position near bottom of page
doc.setY(doc.page.height - 200);

doc.text('This content is near the bottom of the page.');
doc.incY(20);

// Try to add page if less than 150 points remaining
doc.tryAddPage(150);

doc.text('This text was safely placed after checking available space.');

// === ROUNDED RECTANGLE VARIATIONS ===
doc.addPage();
doc.fontSize(18)
   .font('Helvetica-Bold')
   .text('Rounded Rectangle Variations');

doc.fontSize(12)
   .font('Helvetica')
   .text('FCM provides specialized rounded rectangle methods for different use cases.');

// Demo different rounded rectangle types
let y = 120;
const rectWidth = 150;
const rectHeight = 60;

// roundedRectUp - top portion
doc.setXY(50, y);
doc.roundedRectUp(50, y, rectWidth, rectHeight, 10)
   .lineWidth(1.5)
   .stroke();
doc.setXY(60, y + 25);
doc.fontSize(10).text('roundedRectUp()\nTop portion only');

// roundedRectMid - middle portion  
doc.setXY(250, y);
doc.roundedRectMid(250, y, rectWidth, rectHeight, 10)
   .lineWidth(1.5)
   .stroke();
doc.setXY(260, y + 25);
doc.text('roundedRectMid()\nMiddle portion');

// roundedRectDown - bottom portion
doc.setXY(450, y);
doc.roundedRectDown(450, y, rectWidth, rectHeight, 10)
   .lineWidth(1.5)
   .stroke();
doc.setXY(460, y + 25);
doc.text('roundedRectDown()\nBottom portion');

// === DEVELOPMENT RULER DEMO ===
doc.addPage();
doc.fontSize(18)
   .font('Helvetica-Bold')
   .text('Development Ruler Demo');

doc.fontSize(12)
   .font('Helvetica')
   .text('The ruler helps visualize coordinates during development (useful for debugging).');

// Draw ruler at different position
doc.drawRuler(0, 0);

doc.setXY(50, 200);
doc.fontSize(10)
   .text('Ruler drawn at position (0, 0) →');

// === ROW LABEL TEXTS DEMO ===
doc.addPage();
doc.fontSize(18)
   .font('Helvetica-Bold')
   .text('Row Label Texts Demo');

doc.fontSize(12)
   .font('Helvetica')
   .text('Intelligent layout system for rendering collections of labeled items.');

// Simple example with text items
doc.setY(120);
doc.fontSize(14)
   .font('Helvetica-Bold')
   .text('Simple Text Items:');

doc.incY(30);
const simpleItems = ['Technology', 'Design', 'Development', 'Marketing', 'Sales', 'Support'];
doc.drawRowLabelTexts(simpleItems, {
  text: { font: 'Helvetica', size: 11 },
  defaultItemW: 100,
  padding: 8,
  box: { radius: 3 }
});

// Complex example with labels and different configurations
doc.incY(50);
doc.fontSize(14)
   .font('Helvetica-Bold')
   .text('Form-style Layout with Labels:');

doc.incY(30);
const formItems = [
  { label: 'Name:', text: 'João Silva', w: 180 },
  { label: 'Age:', text: '35 years', w: 120 },
  { label: 'Email:', text: 'joao@example.com', link: 'mailto:joao@example.com', w: 200 },
  { label: 'Phone:', text: '+55 11 99999-9999', w: 160 },
  { label: 'Department:', text: 'Technology', w: 140 },
  { label: 'Position:', text: 'Senior Developer', w: 160 },
  { label: 'Address:', text: 'Rua das Flores, 123 - São Paulo/SP - Brazil' },
  { label: 'Skills:', text: 'JavaScript, Python, React, Node.js, MongoDB, PostgreSQL' }
];

doc.drawRowLabelTexts(formItems, {
  label: { font: 'Helvetica-Bold', size: 10 },
  text: { font: 'Helvetica', size: 10 },
  box: { radius: 5 },
  padding: 12,
  divider: false
});

// Example with item boxes
doc.incY(50);
doc.fontSize(14)
   .font('Helvetica-Bold')
   .text('Items with Individual Borders:');

doc.incY(30);
const tagItems = [
  { text: 'JavaScript', color: 'blue' },
  { text: 'React', color: 'green' },
  { text: 'Node.js', color: 'darkgreen' },
  { text: 'MongoDB', color: 'brown' },
  { text: 'TypeScript', color: 'purple' },
  { text: 'Express.js', color: 'gray' }
];

doc.drawRowLabelTexts(tagItems, {
  text: { font: 'Helvetica-Bold', size: 9 },
  noLabel: true,
  defaultItemW: 80,
  padding: 5,
  itemBox: { 
    active: true, 
    padding: 4,
    radius: 3 
  }
});

// === EVENT HANDLING DEMO ===
doc.addPage();
doc.fontSize(18)
   .font('Helvetica-Bold')
   .text('Event Handling Demo');

doc.fontSize(12)
   .font('Helvetica')
   .text('FCM adds beforePageAdded event for custom page handling.');

doc.incY(50);
doc.fontSize(12)
  .font('Helvetica')
  .text('To add a footer with total page, see the end of this example');


// === FINAL PAGE ===
doc.addPage();
doc.fontSize(24)
   .font('Helvetica-Bold')
   .text('Demo Complete!', 0, 200, { align: 'center' });

doc.fontSize(14)
   .font('Helvetica')
   .text('All FCMPDFKit enhanced features have been demonstrated.', 0, 250, { align: 'center' });

doc.fontSize(12)
   .text('Visit the GitHub repository for more information and examples.', 0, 280, { align: 'center' });


// Footer, bufferPages: true is required to be able to go back to previous pages and repaint
const range = doc.bufferedPageRange();
let i;
let end;
doc.noPageBreak = true;
for (i = range.start, end = range.start + range.count, range.start <= end; i < end; i++) {
  doc.switchToPage(i);
  doc.font('Helvetica').fontSize(8).fillColor('gray'); // Need defined after every switchToPage
  doc.text(`Page ${i + 1} of ${range.count}`, doc.page.margins.left, doc.page.maxY() + 2,
    {align: 'right', width: doc.usefulW});
}
// manually flush pages that have been buffered
doc.flushPages();

// Finalize the PDF
doc.end();

console.log('✅ FCM Demo PDF generated successfully!');
