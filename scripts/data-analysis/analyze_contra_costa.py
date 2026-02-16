#!/usr/bin/env python3
"""
Analyze Contra Costa County voter file format

This script analyzes the structure and content of a Contra Costa County
voter registration file to understand the data format and prepare for import.
"""

import csv
import sys
from collections import defaultdict
from pathlib import Path

def analyze_voter_file(file_path):
    """Analyze the voter file and extract key information."""
    
    print(f"Analyzing: {file_path}")
    print(f"File size: {Path(file_path).stat().st_size / (1024*1024):.2f} MB")
    print("=" * 80)
    
    # Read file with tab delimiter
    with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f, delimiter='\t')
        
        # Get field names
        fieldnames = reader.fieldnames
        print(f"\nTotal Fields: {len(fieldnames)}")
        print("\nField Names:")
        for i, field in enumerate(fieldnames, 1):
            print(f"  {i:3d}. {field}")
        
        # Statistics
        row_count = 0
        field_stats = defaultdict(lambda: {'filled': 0, 'empty': 0, 'samples': set()})
        
        # Sample first N rows
        sample_size = 100
        print(f"\n\nAnalyzing first {sample_size} rows...")
        
        for row_num, row in enumerate(reader, 1):
            row_count = row_num
            
            for field, value in row.items():
                if value and value.strip():
                    field_stats[field]['filled'] += 1
                    # Store up to 3 sample values
                    if len(field_stats[field]['samples']) < 3:
                        field_stats[field]['samples'].add(value.strip()[:50])
                else:
                    field_stats[field]['empty'] += 1
            
            if row_num >= sample_size:
                break
        
        print(f"\nRows analyzed: {row_count}")
        
        # Print key fields analysis
        print("\n" + "=" * 80)
        print("KEY FIELDS ANALYSIS (from sample)")
        print("=" * 80)
        
        key_fields = [
            # Identity
            'RegistrationNumber', 'VoterID', 'VoterTitle',
            'LastName', 'FirstName', 'MiddleName', 'NameSuffix', 'Gender',
            
            # Residence Address
            'ResidenceCity', 'ResidenceZipCode', 
            'HouseNumber', 'PreDirection', 'StreetName', 'StreetSuffix', 
            'PostDirection', 'UnitAbbr', 'UnitNumber',
            
            # Mailing Address
            'MailAddress1', 'MailAddress2', 'MailAddress3', 'MailAddress4',
            'MailCity', 'MailState', 'MailZip',
            
            # Contact
            'PhoneNumber', 'EmailAddress',
            
            # Registration
            'RegistrationDate', 'BirthDate', 'BirthPlace',
            'PartyName', 'PartyAbbr', 'Language',
            'VBMProgramStatus', 'StatusReason',
            
            # Precinct
            'PrecinctID', 'PrecinctPortion', 'PrecinctName',
        ]
        
        for field in key_fields:
            if field in field_stats:
                stats = field_stats[field]
                filled_pct = (stats['filled'] / row_count * 100) if row_count > 0 else 0
                print(f"\n{field}:")
                print(f"  Filled: {stats['filled']}/{row_count} ({filled_pct:.1f}%)")
                if stats['samples']:
                    print(f"  Samples: {', '.join(list(stats['samples']))}")
        
        # Check for duplicate voter IDs
        print("\n" + "=" * 80)
        print("ANALYSIS COMPLETE")
        print("=" * 80)

def print_sample_record(file_path, record_num=2):
    """Print a full sample record for inspection."""
    print("\n" + "=" * 80)
    print(f"SAMPLE RECORD #{record_num}")
    print("=" * 80)
    
    with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f, delimiter='\t')
        
        for i, row in enumerate(reader, 1):
            if i == record_num:
                for field, value in row.items():
                    if value and value.strip():
                        print(f"{field:30s}: {value}")
                break

def count_total_rows(file_path):
    """Count total rows in the file (this may take a while for large files)."""
    print("\n" + "=" * 80)
    print("COUNTING TOTAL ROWS (this may take a minute)...")
    print("=" * 80)
    
    with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
        # Skip header
        next(f)
        count = sum(1 for _ in f)
    
    print(f"Total voter records: {count:,}")
    return count

if __name__ == '__main__':
    file_path = sys.argv[1] if len(sys.argv) > 1 else 'tmp/0_20230424_092505_SpinnerNicholas.txt'
    
    analyze_voter_file(file_path)
    print_sample_record(file_path, 2)
    
    # Ask before counting all rows (can be slow)
    response = input("\nCount total rows? This may take a minute. (y/n): ")
    if response.lower() == 'y':
        count_total_rows(file_path)
