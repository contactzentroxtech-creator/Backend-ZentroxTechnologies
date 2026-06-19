const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('../storage/cloudinaryConfig');
const { Certificate } = require('../../models');

const COMPANY = 'Zentrox Technologies';
const COMPANY_TAGLINE = 'MSME Registered Technology Company';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://zentroxtech.com';

const generateCertificateId = () =>
  `ZT-${Date.now().toString(36).toUpperCase()}-${uuidv4().split('-')[0].toUpperCase()}`;

const generateQRCode = async (url) => {
  const qrDataUrl = await QRCode.toDataURL(url, {
    width: 120, margin: 1,
    color: { dark: '#3b7bff', light: '#04050a' },
  });
  return qrDataUrl;
};

const buildCertificatePDF = (doc, data, qrDataUrl) => {
  const { type, recipientName, courseName, internshipRole, duration, certId, issuedAt } = data;
  const dateStr = new Date(issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  // Background
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#04050a');

  // Border frame
  const margin = 24;
  doc.rect(margin, margin, doc.page.width - margin * 2, doc.page.height - margin * 2)
     .lineWidth(2).strokeColor('#3b7bff').stroke();
  doc.rect(margin + 6, margin + 6, doc.page.width - (margin + 6) * 2, doc.page.height - (margin + 6) * 2)
     .lineWidth(0.5).strokeColor('rgba(59,123,255,0.3)').stroke();

  // Header
  doc.fontSize(28).fillColor('#ffffff').font('Helvetica-Bold')
     .text(COMPANY, 0, 60, { align: 'center' });
  doc.fontSize(10).fillColor('#8892b0').font('Helvetica')
     .text(COMPANY_TAGLINE.toUpperCase(), 0, 95, { align: 'center', characterSpacing: 1.5 });

  // Divider
  doc.moveTo(80, 120).lineTo(doc.page.width - 80, 120).lineWidth(0.5).strokeColor('#3b7bff').stroke();

  // Certificate type
  const typeLabel = {
    course: 'CERTIFICATE OF COMPLETION',
    internship: 'INTERNSHIP COMPLETION CERTIFICATE',
    'offer-letter': 'OFFER LETTER',
    recommendation: 'LETTER OF RECOMMENDATION',
    completion: 'CERTIFICATE OF COMPLETION',
  }[type] || 'CERTIFICATE';

  doc.fontSize(11).fillColor('#06d6a0').font('Helvetica')
     .text(typeLabel, 0, 140, { align: 'center', characterSpacing: 2 });

  // Body text
  doc.fontSize(13).fillColor('#8892b0').font('Helvetica')
     .text('This is to certify that', 0, 185, { align: 'center' });

  doc.fontSize(32).fillColor('#ffffff').font('Helvetica-Bold')
     .text(recipientName, 0, 210, { align: 'center' });

  // Underline name
  const nameWidth = doc.widthOfString(recipientName, { fontSize: 32 });
  const nameX = (doc.page.width - nameWidth) / 2;
  doc.moveTo(nameX, 250).lineTo(nameX + nameWidth, 250).lineWidth(1).strokeColor('#3b7bff').stroke();

  let yPos = 270;

  if (type === 'course' || type === 'completion') {
    doc.fontSize(13).fillColor('#8892b0').font('Helvetica')
       .text('has successfully completed the course', 0, yPos, { align: 'center' });
    yPos += 28;
    doc.fontSize(20).fillColor('#3b7bff').font('Helvetica-Bold')
       .text(courseName, 0, yPos, { align: 'center' });
    yPos += 30;
    doc.fontSize(12).fillColor('#8892b0').font('Helvetica')
       .text(`offered by ${COMPANY}`, 0, yPos, { align: 'center' });
  }

  if (type === 'internship') {
    doc.fontSize(13).fillColor('#8892b0').font('Helvetica')
       .text('has successfully completed a Remote Internship as', 0, yPos, { align: 'center' });
    yPos += 28;
    doc.fontSize(20).fillColor('#3b7bff').font('Helvetica-Bold')
       .text(internshipRole, 0, yPos, { align: 'center' });
    yPos += 28;
    doc.fontSize(12).fillColor('#8892b0').font('Helvetica')
       .text(`Duration: ${duration} · at ${COMPANY}`, 0, yPos, { align: 'center' });
  }

  if (type === 'offer-letter') {
    doc.fontSize(13).fillColor('#8892b0').font('Helvetica')
       .text('has been selected for the role of', 0, yPos, { align: 'center' });
    yPos += 28;
    doc.fontSize(20).fillColor('#3b7bff').font('Helvetica-Bold')
       .text(internshipRole, 0, yPos, { align: 'center' });
    yPos += 28;
    doc.fontSize(12).fillColor('#8892b0').font('Helvetica')
       .text(`Remote Internship · Duration: ${duration} · ${COMPANY}`, 0, yPos, { align: 'center' });
  }

  // Date issued
  yPos = 380;
  doc.fontSize(11).fillColor('#8892b0').font('Helvetica')
     .text(`Issued on: ${dateStr}`, 0, yPos, { align: 'center' });

  // QR Code
  if (qrDataUrl) {
    const qrBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
    doc.image(qrBuffer, doc.page.width - 140, doc.page.height - 150, { width: 80 });
    doc.fontSize(8).fillColor('#8892b0')
       .text('Scan to verify', doc.page.width - 145, doc.page.height - 65, { width: 90, align: 'center' });
  }

  // Certificate ID
  doc.fontSize(9).fillColor('#546e7a')
     .text(`Certificate ID: ${certId}`, 0, doc.page.height - 55, { align: 'center' });

  // Signature line
  doc.moveTo(100, doc.page.height - 90).lineTo(240, doc.page.height - 90)
     .lineWidth(0.5).strokeColor('#546e7a').stroke();
  doc.fontSize(10).fillColor('#8892b0').font('Helvetica-Bold')
     .text('Prince Paul Singh', 100, doc.page.height - 82);
  doc.fontSize(8).fillColor('#546e7a').font('Helvetica')
     .text('Founder, Zentrox Technologies', 100, doc.page.height - 70);
};

const generateCertificate = async ({
  userId, userName, userEmail,
  type, courseName, internshipRole, internshipDuration,
  internshipId, courseId,
}) => {
  const certId = generateCertificateId();
  const verifyUrl = `${FRONTEND_URL}/verify/${certId}`;

  // Generate QR
  const qrDataUrl = await generateQRCode(verifyUrl);

  // Build PDF in memory
  const pdfBuffer = await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    buildCertificatePDF(doc, {
      type, recipientName: userName, courseName, internshipRole,
      duration: internshipDuration, certId, issuedAt: new Date(),
    }, qrDataUrl);

    doc.end();
  });

  // Upload PDF to Cloudinary
  const uploadResult = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'zentrox/certificates', public_id: certId, resource_type: 'raw', format: 'pdf' },
      (err, result) => err ? reject(err) : resolve(result)
    );
    stream.end(pdfBuffer);
  });

  // Upload QR image
  const qrUpload = await cloudinary.uploader.upload(qrDataUrl, {
    folder: 'zentrox/qrcodes', public_id: `qr_${certId}`,
  });

  // Save to DB
  const cert = await Certificate.create({
    certificateId: certId, type,
    issuedTo: userId, recipientName: userName, recipientEmail: userEmail,
    courseName, internshipRole, internshipDuration,
    issuedBy: COMPANY,
    pdfUrl: uploadResult.secure_url,
    qrCodeUrl: qrUpload.secure_url,
    verifyUrl,
    metadata: { courseId, internshipId },
  });

  return { cert, pdfBuffer, certId, verifyUrl };
};

module.exports = { generateCertificate, generateCertificateId };
