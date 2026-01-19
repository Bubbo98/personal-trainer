#!/usr/bin/env node

/**
 * Script to fix corrupted PDF records with null expiration_date or negative duration values
 *
 * This script:
 * 1. Finds all PDF records with null expiration_date or negative duration values
 * 2. Normalizes negative days by converting them to months
 * 3. Calculates expiration_date from current time if null
 *
 * Usage: node scripts/fix_corrupted_pdfs.js
 */

const path = require('path');
const { createDatabase } = require('../utils/database');

console.log('🔧 Starting PDF records fix...\n');

const db = createDatabase();

// First, show corrupted records
console.log('📋 Finding corrupted records...\n');
db.allCallback(`
    SELECT
        id,
        user_id,
        original_name,
        duration_months,
        duration_days,
        expiration_date
    FROM user_pdf_files
    WHERE
        expiration_date IS NULL
        OR duration_days < 0
        OR duration_months < 0
`, [], (err, corruptedRecords) => {
    if (err) {
        console.error('❌ Error finding corrupted records:', err.message);
        db.close();
        process.exit(1);
    }

    if (corruptedRecords.length === 0) {
        console.log('✅ No corrupted records found. Database is clean!\n');
        db.close();
        process.exit(0);
    }

    console.log(`⚠️  Found ${corruptedRecords.length} corrupted record(s):\n`);
    corruptedRecords.forEach(record => {
        console.log(`  User ID: ${record.user_id}`);
        console.log(`  File: ${record.original_name}`);
        console.log(`  Duration: ${record.duration_months} months, ${record.duration_days} days`);
        console.log(`  Expiration: ${record.expiration_date || 'NULL'}`);
        console.log('');
    });

    // Fix each corrupted record
    console.log('🔨 Fixing records...\n');

    let fixed = 0;
    let errors = 0;

    corruptedRecords.forEach((record, index) => {
        // Normalize duration
        let months = record.duration_months;
        let days = record.duration_days;

        // Convert negative days to months
        while (days < 0 && months > 0) {
            months -= 1;
            days += 30;
        }

        // Prevent completely negative durations - set to minimum 0 months, 0 days
        if (months < 0) {
            months = 0;
            days = 0;
        }
        if (days < 0) {
            days = 0;
        }

        // Update record
        db.runCallback(`
            UPDATE user_pdf_files
            SET
                duration_months = ?,
                duration_days = ?,
                expiration_date = datetime('now', '+' || ? || ' months', '+' || ? || ' days'),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [months, days, months, days, record.id], function(err) {
            if (err) {
                console.error(`  ❌ Failed to fix record ID ${record.id}:`, err.message);
                errors++;
            } else {
                console.log(`  ✅ Fixed record ID ${record.id} (User ${record.user_id}): ${months} months, ${days} days`);
                fixed++;
            }

            // If this is the last record, show summary and close
            if (index === corruptedRecords.length - 1) {
                setTimeout(() => {
                    console.log('\n📊 Summary:');
                    console.log(`  ✅ Fixed: ${fixed}`);
                    if (errors > 0) {
                        console.log(`  ❌ Errors: ${errors}`);
                    }
                    console.log('\n🎉 Done!\n');
                    db.close();
                    process.exit(errors > 0 ? 1 : 0);
                }, 100);
            }
        });
    });
});
