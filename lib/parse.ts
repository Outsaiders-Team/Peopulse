import * as XLSX from 'xlsx';

export type CellValue = string | number | boolean | null;

/** Column-major table, mirroring how the pandas port reasons per-column. */
export type Table = {
  columns: string[];
  columnValues: Map<string, CellValue[]>;
  rowCount: number;
};

function tableFromRows(columns: string[], rows: CellValue[][]): Table {
  const columnValues = new Map<string, CellValue[]>();
  columns.forEach((col, colIndex) => {
    columnValues.set(
      col,
      rows.map((row) => row[colIndex] ?? null)
    );
  });
  return { columns, columnValues, rowCount: rows.length };
}

/**
 * Minimal RFC 4180 CSV parser: handles quoted fields, embedded commas/newlines,
 * and doubled quotes. Empty cells become `null` (pandas' default na behavior
 * for empty CSV fields), matching what `dropna()` removes downstream.
 */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      pushField();
    } else if (ch === '\r') {
      // handled by the following \n (or standalone old Mac line ending)
      if (text[i + 1] !== '\n') pushRow();
    } else if (ch === '\n') {
      pushRow();
    } else {
      field += ch;
    }
  }

  if (field !== '' || row.length > 0) pushRow();

  // Drop a single trailing blank line produced by a final newline.
  if (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') {
    rows.pop();
  }

  return rows;
}

export function parseCsv(text: string): Table {
  const raw = parseCsvRows(text);
  if (raw.length === 0) return { columns: [], columnValues: new Map(), rowCount: 0 };

  const columns = raw[0];
  const rows: CellValue[][] = raw.slice(1).map((line) =>
    columns.map((_, i) => {
      const cell = line[i];
      if (cell === undefined || cell.trim() === '') return null;
      return cell;
    })
  );

  return tableFromRows(columns, rows);
}

export function parseXlsx(buffer: Buffer): Table {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { columns: [], columnValues: new Map(), rowCount: 0 };

  const matrix = XLSX.utils.sheet_to_json<CellValue[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });

  const [headerRow, ...dataRows] = matrix;
  const columns = (headerRow || []).map((v) => (v == null ? '' : String(v)));

  const rows: CellValue[][] = dataRows.map((line) =>
    columns.map((_, i) => {
      const cell = line[i];
      if (cell === undefined || cell === null) return null;
      if (typeof cell === 'string' && cell.trim() === '') return null;
      return cell;
    })
  );

  return tableFromRows(columns, rows);
}
