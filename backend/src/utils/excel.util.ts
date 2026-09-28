import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';

export interface SheetPreviewData {
  sheetName: string;
  headers: string[];
  totalRows: number;
  previewRows: Record<string, any>[];
}

export class ExcelUtil {
  /**
   * Reads an uploaded Excel workbook buffer and returns sheet metadata and header previews
   */
  static inspectWorkbook(buffer: Buffer): { sheets: SheetPreviewData[] } {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheets: SheetPreviewData[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (!jsonData || jsonData.length === 0) continue;

      const rawHeaders: string[] = (jsonData[0] || []).map((h: any) => String(h || '').trim()).filter(Boolean);
      const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];

      sheets.push({
        sheetName,
        headers: rawHeaders,
        totalRows: rows.length,
        previewRows: rows.slice(0, 5),
      });
    }

    return { sheets };
  }

  /**
   * Generates a styled Excel sheet buffer with enterprise header formatting
   */
  static async exportToExcel(
    title: string,
    columns: { header: string; key: string; width?: number }[],
    data: any[]
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Dada Mani Enterprise Operations System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(title.slice(0, 31));

    // Title Row
    worksheet.mergeCells('A1', `${String.fromCharCode(64 + Math.max(columns.length, 1))}1`);
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `DADA MANI ENTERPRISE OPERATIONS - ${title.toUpperCase()}`;
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' }, // Slate 900
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 30;

    // Generated info row
    worksheet.mergeCells('A2', `${String.fromCharCode(64 + Math.max(columns.length, 1))}2`);
    const metaCell = worksheet.getCell('A2');
    metaCell.value = `Generated on: ${new Date().toLocaleString()} | Total Records: ${data.length}`;
    metaCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
    metaCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(2).height = 18;

    // Table Header Row
    const headerRow = worksheet.getRow(4);
    columns.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = col.header;
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0284C7' }, // Sky 600
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };
      worksheet.getColumn(idx + 1).width = col.width || 22;
    });
    headerRow.height = 24;

    // Populate Data Rows
    let currentRowIdx = 5;
    data.forEach((item, rowIndex) => {
      const row = worksheet.getRow(currentRowIdx);
      columns.forEach((col, colIdx) => {
        const cell = row.getCell(colIdx + 1);
        let val = item[col.key];
        if (val instanceof Date) {
          val = val.toLocaleDateString();
        } else if (typeof val === 'object' && val !== null) {
          val = JSON.stringify(val);
        }
        cell.value = val ?? '-';
        cell.font = { name: 'Arial', size: 10 };
        cell.alignment = { vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
        // Zebra striping
        if (rowIndex % 2 === 1) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' },
          };
        }
      });
      row.height = 20;
      currentRowIdx++;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
