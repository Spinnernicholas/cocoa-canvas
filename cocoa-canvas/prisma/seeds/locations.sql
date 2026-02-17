-- Seed script to initialize Location types for contact information
--
-- This file should be run once to populate the Location table with
-- standard location types used throughout the application.

-- Standard location types
INSERT OR IGNORE INTO Location (id, name, description, createdAt, updatedAt) VALUES
  ('loc_home', 'Home', 'Primary residence address and home contact information', datetime('now'), datetime('now')),
  ('loc_work', 'Work', 'Work or business address and contact information', datetime('now'), datetime('now')),
  ('loc_cell', 'Cell', 'Mobile/cellular phone number', datetime('now'), datetime('now')),
  ('loc_mailing', 'Mailing', 'Mailing address (if different from residence)', datetime('now'), datetime('now')),
  ('loc_residence', 'Residence', 'Voter registration residence address', datetime('now'), datetime('now'));

-- Verify the insertions
SELECT 'Initialized ' || COUNT(*) || ' location types' as result FROM Location;
