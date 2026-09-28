import PDFDocument from 'pdfkit';

export interface PdfReportOptions {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: string[][];
  summaryStats?: { label: string; value: string }[];
}

export class PdfUtil {
  static async generateReport(options: PdfReportOptions): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Header Banner
      doc.rect(40, 40, doc.page.width - 80, 50).fill('#0f172a');
      doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text('DADA MANI ENTERPRISE OPERATIONS', 55, 48);
      doc.fontSize(10).font('Helvetica').text(options.title.toUpperCase(), 55, 68);

      // Metadata
      doc.fillColor('#475569').fontSize(8).text(`Generated: ${new Date().toLocaleString()}`, doc.page.width - 200, 58);

      let yPos = 110;

      // Summary Stats Cards if provided
      if (options.summaryStats && options.summaryStats.length > 0) {
        const cardWidth = 140;
        let cardX = 40;
        options.summaryStats.forEach((stat) => {
          doc.roundedRect(cardX, yPos, cardWidth, 40, 4).fillAndStroke('#f1f5f9', '#cbd5e1');
          doc.fillColor('#64748b').fontSize(8).font('Helvetica').text(stat.label, cardX + 10, yPos + 8);
          doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(stat.value, cardX + 10, yPos + 22);
          cardX += cardWidth + 15;
        });
        yPos += 55;
      }

      // Render Table
      const headers = options.headers;
      const rows = options.rows;
      const colWidth = (doc.page.width - 80) / headers.length;

      // Table Header
      doc.rect(40, yPos, doc.page.width - 80, 22).fill('#0284c7');
      headers.forEach((header, i) => {
        doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold').text(header, 45 + i * colWidth, yPos + 6, {
          width: colWidth - 10,
          ellipsis: true,
        });
      });
      yPos += 22;

      // Table Rows
      rows.forEach((row, rIdx) => {
        if (yPos > doc.page.height - 60) {
          doc.addPage({ margin: 40, size: 'A4', layout: 'landscape' });
          yPos = 40;
        }

        const bgColor = rIdx % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(40, yPos, doc.page.width - 80, 18).fillAndStroke(bgColor, '#e2e8f0');

        row.forEach((cell, cIdx) => {
          doc.fillColor('#1e293b').fontSize(8).font('Helvetica').text(String(cell || '-'), 45 + cIdx * colWidth, yPos + 4, {
            width: colWidth - 10,
            ellipsis: true,
          });
        });

        yPos += 18;
      });

      // Footer
      const totalPages = doc.bufferedPageRange().count || 1;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        doc.fillColor('#94a3b8').fontSize(8).text(
          `Dada Mani Enterprise Operations System | Confidential | Page ${i + 1} of ${totalPages}`,
          40,
          doc.page.height - 30,
          { align: 'center', width: doc.page.width - 80 }
        );
      }

      doc.end();
    });
  }
}
