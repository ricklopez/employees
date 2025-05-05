import fs from 'fs';
import { parse } from 'csv-parse/sync';

type RawTransaction = {
  date: string;
  description: string;
  amount: string;
  [key: string]: string;
};

/**
 * Parse a CSV file and extract transaction data
 * @param filePath Path to the CSV file
 * @returns Array of transactions with date, description, and amount
 */
export async function parseCsvFile(filePath: string): Promise<RawTransaction[]> {
  try {
    // Read the file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Skip any header lines before the column headers
    let lines = fileContent.split('\n');
    let headerLine = 0;
    
    // Find the line with column headers (usually contains "Date" and "Description")
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      if (lines[i].includes('Date') && 
          (lines[i].includes('Description') || lines[i].includes('Category'))) {
        headerLine = i;
        break;
      }
    }
    
    // Get only the content from the header line down
    const csvContent = lines.slice(headerLine).join('\n');
    
    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true // Handle inconsistent column counts
    });
    
    // Process the records to normalize them
    const transactions: RawTransaction[] = [];
    
    for (const record of records) {
      // For the specific CSV format provided, we know these columns
      const dateColumn = findColumn(record, ['date', 'transaction_date', 'Date', 'DATE']);
      const descColumn = findColumn(record, ['description', 'memo', 'note', 'Description', 'DESCRIPTION', 'Memo', 'desc']);
      
      // Look for both Debit and Credit columns for the amount
      const debitColumn = findColumn(record, ['debit', 'Debit', 'DEBIT', 'withdrawal', 'Withdrawal']);
      const creditColumn = findColumn(record, ['credit', 'Credit', 'CREDIT', 'deposit', 'Deposit']);
      
      // Fallback to a generic amount column if needed
      const amountColumn = findColumn(record, ['amount', 'total', 'Amount', 'AMOUNT', 'Total', 'sum', 'Balance']);
      
      // Skip invalid records
      if (!dateColumn || !descColumn) {
        continue;
      }
      
      // Determine the amount using credit/debit if available
      let amount = '';
      if (debitColumn && record[debitColumn] && record[debitColumn].trim()) {
        // If it's a debit, make it negative
        amount = '-' + record[debitColumn].trim();
      } else if (creditColumn && record[creditColumn] && record[creditColumn].trim()) {
        amount = record[creditColumn].trim();
      } else if (amountColumn) {
        amount = record[amountColumn].trim();
      }
      
      // Clean up the amount
      amount = amount.replace(/\s+/g, '');
      if (!amount) {
        amount = '0.00';
      }
      
      transactions.push({
        date: record[dateColumn],
        description: record[descColumn],
        amount: amount,
        // Keep any other columns for reference
        ...record
      });
    }
    
    console.log(`Parsed ${transactions.length} transactions from CSV`);
    
    // If no transactions were found, this might be a non-standard CSV
    // Let's try a simpler approach and extract what we can
    if (transactions.length === 0) {
      const simpleRecords = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true
      });
      
      for (const record of simpleRecords) {
        const keys = Object.keys(record);
        if (keys.length < 2) continue;
        
        // Try to extract date, description and amount from any fields
        const dateValue = Object.values(record).find(val => 
          typeof val === 'string' && /\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/.test(val)
        ) || '';
        
        const descIndex = keys.findIndex(k => 
          k.toLowerCase().includes('desc') || k.toLowerCase().includes('memo')
        );
        const descValue = descIndex !== -1 ? record[keys[descIndex]] : keys[1];
        
        // Look for numeric values that might be amounts
        const amountValue = Object.values(record).find(val => 
          typeof val === 'string' && /\$?\d+\.\d{2}/.test(val)
        ) || '0.00';
        
        transactions.push({
          date: dateValue as string,
          description: descValue as string,
          amount: amountValue as string,
          // Keep any other columns for reference
          ...record
        });
      }
      
      console.log(`Found ${transactions.length} transactions using simplified parsing`);
    }
    
    return transactions;
  } catch (error) {
    console.error('Error parsing CSV file:', error);
    throw new Error(`Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper function to find column names in CSV header
 * @param record The record (row) from CSV
 * @param possibleNames Possible column names to look for
 * @returns The matching column name or undefined
 */
function findColumn(record: Record<string, string>, possibleNames: string[]): string | undefined {
  return Object.keys(record).find(key => 
    possibleNames.some(name => key.toLowerCase().includes(name.toLowerCase()))
  );
}
