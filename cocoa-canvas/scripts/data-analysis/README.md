# Data Analysis Scripts

Python scripts for analyzing voter file formats before import.

## Purpose

These scripts help understand the structure and content of voter files from different jurisdictions before implementing importers. They:

- Identify all fields in the file
- Analyze field population rates
- Display sample values
- Count total records
- Help design import logic

## Requirements

```bash
# Python 3.7+ (already installed on most systems)
python3 --version
```

No additional packages required - uses only Python standard library.

## Available Scripts

### analyze_contra_costa.py

Analyzes Contra Costa County voter registration files.

**Usage:**
```bash
cd scripts/data-analysis
python3 analyze_contra_costa.py ../../tmp/voter-file.txt
```

**Output:**
- Total fields and field names
- Key field analysis from first 100 rows
- Field population percentages
- Sample values for each field
- Full sample record
- Total record count (optional)

**Example:**
```
Analyzing: ../../tmp/0_20230424_092505_SpinnerNicholas.txt
File size: 574.22 MB
================================================================================

Total Fields: 92

Field Names:
    1. RegistrationNumber
    2. VoterID
    3. VoterTitle
    ...

KEY FIELDS ANALYSIS (from sample)
================================================================================

LastName:
  Filled: 100/100 (100.0%)
  Samples: Scott-Evans, Carpenter, Bell

PhoneNumber:
  Filled: 60/100 (60.0%)
  Samples: (925)809-2219, (209)295-7738, (925)286-4444

EmailAddress:
  Filled: 31/100 (31.0%)
  Samples: eilonwy40@yahoo.com, pch@clearplace.net, dehaangloria@aol.com

...

Total voter records: 700,545
```

## Adding New Analysis Scripts

When adding support for a new jurisdiction:

1. **Create Analysis Script**
   ```bash
   cp analyze_contra_costa.py analyze_[jurisdiction].py
   ```

2. **Modify for New Format**
   - Update delimiter (tab, comma, pipe, etc.)
   - Update key fields list
   - Adjust date parsing if needed
   - Update field mapping logic

3. **Run Analysis**
   ```bash
   python3 analyze_[jurisdiction].py ../tmp/new-voter-file.txt
   ```

4. **Document Findings**
   - Record field names and descriptions
   - Note population rates
   - Document special formats (dates, phones, etc.)
   - Identify residence vs mailing addresses
   - Note any jurisdiction-specific quirks

5. **Design Importer**
   - Use analysis results to map fields
   - Create importer in `lib/importers/[jurisdiction].ts`
   - Add tests with sample data

## Tips

### Large Files

For very large files (>1GB):
- Use `head -1000` to create a sample file for faster testing
- Monitor memory usage during full analysis
- Consider streaming parsing for production imports

### Character Encoding

If you encounter encoding errors:
```python
# The script uses 'utf-8' encoding with 'replace' error handling
# Adjust as needed for your file:
with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
```

Common encodings:
- `utf-8`: Most modern files
- `latin-1` or `iso-8859-1`: Older Windows files
- `cp1252`: Windows files with special characters

### Field Variations

Watch for:
- **Optional fields**: May be empty or missing
- **Conditional fields**: Only populated for certain voters
- **Multiple formats**: Same field type with different formats (e.g., dates)
- **Concatenated fields**: Multiple values in one field (e.g., "Apt 5B Unit C")

## Workflow

1. **Obtain Sample File**
   - Get a sample or full voter file from jurisdiction
   - Place in `tmp/` directory

2. **Run Analysis**
   ```bash
   python3 analyze_contra_costa.py ../tmp/sample.txt
   ```

3. **Review Output**
   - Identify key fields for import
   - Note population rates
   - Check date/phone formats
   - Understand address structure

4. **Design Import Strategy**
   - Map fields to database schema
   - Plan address parsing logic
   - Decide on ContactInfo location types
   - Consider incremental vs full import

5. **Implement Importer**
   - Create TypeScript importer
   - Add field validation
   - Handle edge cases found in analysis

6. **Test Import**
   - Start with small sample (100-1000 records)
   - Verify data mapping
   - Check performance
   - Scale to full file

## Example Analysis Workflow

```bash
# 1. Navigate to scripts directory
cd scripts/data-analysis

# 2. Run analysis on sample file
python3 analyze_contra_costa.py ../../tmp/sample-1000.txt

# 3. Review key fields output
# Note: Which fields are reliably populated?
# Note: How are addresses structured?
# Note: What contact info is available?

# 4. Create test sample for importer
head -1001 ../../tmp/full-file.txt > ../../tmp/test-sample.txt

# 5. Implement and test importer
cd ../../
npm run dev
# Test import via API or script

# 6. Validate imported data
# Check database for correct voter records
# Verify address parsing
# Confirm contact info mapping
```

## Related Documentation

- [VOTER_FILE_FORMATS.md](../../docs/developer/VOTER_FILE_FORMATS.md) - Import format specifications
- [lib/importers/](../../lib/importers/) - Importer implementations
- [prisma/schema.prisma](../../prisma/schema.prisma) - Database schema
