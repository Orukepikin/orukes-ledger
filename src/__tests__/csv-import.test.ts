/**
 * Tests for CSV import parsing functionality
 */

interface CSVRow {
  [key: string]: string;
}

interface ParsedTransaction {
  date: Date;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  description?: string;
  category?: string;
  vendor?: string;
  paymentMethod?: string;
}

interface CSVMapping {
  dateColumn: string;
  amountColumn: string;
  typeColumn?: string;
  descriptionColumn?: string;
  categoryColumn?: string;
  vendorColumn?: string;
  paymentMethodColumn?: string;
  defaultType?: 'INCOME' | 'EXPENSE';
  dateFormat?: string;
}

// Parse date from various formats
const parseDate = (dateStr: string, format?: string): Date | null => {
  if (!dateStr) return null;

  // Try common formats
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // D/M/YYYY
  ];

  // ISO format
  if (formats[0].test(dateStr)) {
    return new Date(dateStr);
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    return new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
  }

  // Try direct parsing as last resort
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
};

// Parse amount from various formats
const parseAmount = (amountStr: string): number | null => {
  if (!amountStr) return null;

  // Remove currency symbols and whitespace
  let cleaned = amountStr.replace(/[₦$£€,\s]/g, '');

  // Handle parentheses for negative numbers
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = '-' + cleaned.slice(1, -1);
  }

  const amount = parseFloat(cleaned);
  return isNaN(amount) ? null : Math.abs(amount);
};

// Determine transaction type from amount or type column
const parseType = (
  row: CSVRow,
  mapping: CSVMapping
): 'INCOME' | 'EXPENSE' => {
  // Check type column if specified
  if (mapping.typeColumn && row[mapping.typeColumn]) {
    const typeValue = row[mapping.typeColumn].toLowerCase().trim();
    if (['income', 'credit', 'cr', 'in', '+'].includes(typeValue)) {
      return 'INCOME';
    }
    if (['expense', 'debit', 'dr', 'out', '-'].includes(typeValue)) {
      return 'EXPENSE';
    }
  }

  // Check if amount is negative
  if (mapping.amountColumn && row[mapping.amountColumn]) {
    const amountStr = row[mapping.amountColumn];
    if (amountStr.startsWith('-') || (amountStr.startsWith('(') && amountStr.endsWith(')'))) {
      return 'EXPENSE';
    }
  }

  // Use default type
  return mapping.defaultType || 'EXPENSE';
};

// Parse a single CSV row
const parseCSVRow = (row: CSVRow, mapping: CSVMapping): ParsedTransaction | null => {
  const date = parseDate(row[mapping.dateColumn], mapping.dateFormat);
  const amount = parseAmount(row[mapping.amountColumn]);

  if (!date || !amount) {
    return null;
  }

  return {
    date,
    amount,
    type: parseType(row, mapping),
    description: mapping.descriptionColumn ? row[mapping.descriptionColumn] : undefined,
    category: mapping.categoryColumn ? row[mapping.categoryColumn] : undefined,
    vendor: mapping.vendorColumn ? row[mapping.vendorColumn] : undefined,
    paymentMethod: mapping.paymentMethodColumn ? row[mapping.paymentMethodColumn] : undefined,
  };
};

// Validate CSV has required columns
const validateCSVColumns = (
  headers: string[],
  mapping: CSVMapping
): { valid: boolean; missingColumns: string[] } => {
  const requiredColumns = [mapping.dateColumn, mapping.amountColumn];
  const missingColumns = requiredColumns.filter((col) => !headers.includes(col));

  return {
    valid: missingColumns.length === 0,
    missingColumns,
  };
};

describe('CSV Import Parsing', () => {
  describe('parseDate', () => {
    it('should parse ISO format (YYYY-MM-DD)', () => {
      const date = parseDate('2024-01-15');
      expect(date?.getFullYear()).toBe(2024);
      expect(date?.getMonth()).toBe(0);
      expect(date?.getDate()).toBe(15);
    });

    it('should parse DD/MM/YYYY format', () => {
      const date = parseDate('15/01/2024');
      expect(date?.getFullYear()).toBe(2024);
      expect(date?.getMonth()).toBe(0);
      expect(date?.getDate()).toBe(15);
    });

    it('should parse DD-MM-YYYY format', () => {
      const date = parseDate('15-01-2024');
      expect(date?.getFullYear()).toBe(2024);
      expect(date?.getMonth()).toBe(0);
      expect(date?.getDate()).toBe(15);
    });

    it('should handle single digit day/month', () => {
      const date = parseDate('5/1/2024');
      expect(date?.getFullYear()).toBe(2024);
      expect(date?.getMonth()).toBe(0);
      expect(date?.getDate()).toBe(5);
    });

    it('should return null for invalid dates', () => {
      expect(parseDate('')).toBeNull();
      expect(parseDate('invalid')).toBeNull();
    });
  });

  describe('parseAmount', () => {
    it('should parse simple numbers', () => {
      expect(parseAmount('1000')).toBe(1000);
      expect(parseAmount('1000.50')).toBe(1000.5);
    });

    it('should parse numbers with commas', () => {
      expect(parseAmount('1,000')).toBe(1000);
      expect(parseAmount('1,000,000')).toBe(1000000);
    });

    it('should parse with currency symbols', () => {
      expect(parseAmount('₦1,000')).toBe(1000);
      expect(parseAmount('$1,000.50')).toBe(1000.5);
      expect(parseAmount('£500')).toBe(500);
    });

    it('should handle negative amounts as absolute values', () => {
      expect(parseAmount('-1000')).toBe(1000);
      expect(parseAmount('(1000)')).toBe(1000);
    });

    it('should return null for invalid amounts', () => {
      expect(parseAmount('')).toBeNull();
      expect(parseAmount('invalid')).toBeNull();
    });
  });

  describe('parseType', () => {
    const baseMapping: CSVMapping = {
      dateColumn: 'Date',
      amountColumn: 'Amount',
    };

    it('should detect income from type column', () => {
      const mapping = { ...baseMapping, typeColumn: 'Type' };
      expect(parseType({ Type: 'income' }, mapping)).toBe('INCOME');
      expect(parseType({ Type: 'Credit' }, mapping)).toBe('INCOME');
      expect(parseType({ Type: 'CR' }, mapping)).toBe('INCOME');
    });

    it('should detect expense from type column', () => {
      const mapping = { ...baseMapping, typeColumn: 'Type' };
      expect(parseType({ Type: 'expense' }, mapping)).toBe('EXPENSE');
      expect(parseType({ Type: 'Debit' }, mapping)).toBe('EXPENSE');
      expect(parseType({ Type: 'DR' }, mapping)).toBe('EXPENSE');
    });

    it('should detect expense from negative amount', () => {
      const mapping = { ...baseMapping, amountColumn: 'Amount' };
      expect(parseType({ Amount: '-1000' }, mapping)).toBe('EXPENSE');
      expect(parseType({ Amount: '(1000)' }, mapping)).toBe('EXPENSE');
    });

    it('should use default type when not determinable', () => {
      expect(parseType({ Amount: '1000' }, baseMapping)).toBe('EXPENSE');
      expect(parseType({ Amount: '1000' }, { ...baseMapping, defaultType: 'INCOME' })).toBe('INCOME');
    });
  });

  describe('parseCSVRow', () => {
    const mapping: CSVMapping = {
      dateColumn: 'Date',
      amountColumn: 'Amount',
      typeColumn: 'Type',
      descriptionColumn: 'Description',
      categoryColumn: 'Category',
    };

    it('should parse a valid row', () => {
      const row = {
        Date: '2024-01-15',
        Amount: '₦50,000',
        Type: 'expense',
        Description: 'Office supplies',
        Category: 'Miscellaneous',
      };

      const parsed = parseCSVRow(row, mapping);

      expect(parsed).not.toBeNull();
      expect(parsed?.date.getFullYear()).toBe(2024);
      expect(parsed?.amount).toBe(50000);
      expect(parsed?.type).toBe('EXPENSE');
      expect(parsed?.description).toBe('Office supplies');
      expect(parsed?.category).toBe('Miscellaneous');
    });

    it('should return null for missing required fields', () => {
      expect(parseCSVRow({ Date: '', Amount: '1000' }, mapping)).toBeNull();
      expect(parseCSVRow({ Date: '2024-01-15', Amount: '' }, mapping)).toBeNull();
    });
  });

  describe('validateCSVColumns', () => {
    const mapping: CSVMapping = {
      dateColumn: 'Date',
      amountColumn: 'Amount',
    };

    it('should validate when all required columns exist', () => {
      const result = validateCSVColumns(['Date', 'Amount', 'Description'], mapping);
      expect(result.valid).toBe(true);
      expect(result.missingColumns).toHaveLength(0);
    });

    it('should detect missing columns', () => {
      const result = validateCSVColumns(['Description'], mapping);
      expect(result.valid).toBe(false);
      expect(result.missingColumns).toContain('Date');
      expect(result.missingColumns).toContain('Amount');
    });

    it('should be case-sensitive for column names', () => {
      const result = validateCSVColumns(['date', 'amount'], mapping);
      expect(result.valid).toBe(false);
    });
  });
});
