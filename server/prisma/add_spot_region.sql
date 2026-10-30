-- Add structured region fields for fishing spots.
ALTER TABLE spots
  ADD COLUMN province VARCHAR(50) NULL AFTER address,
  ADD COLUMN city VARCHAR(50) NULL AFTER province,
  ADD COLUMN district VARCHAR(50) NULL AFTER city,
  ADD INDEX idx_region (province, city, district);
