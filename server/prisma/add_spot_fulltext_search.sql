ALTER TABLE spots
ADD COLUMN search_text TEXT NULL;

UPDATE spots
SET search_text = CONCAT_WS(' ',
  CASE
    WHEN name IS NULL OR TRIM(name) = '' THEN NULL
    WHEN address IS NULL OR TRIM(address) = '' THEN name
    WHEN REPLACE(TRIM(name), ' ', '') = REPLACE(TRIM(address), ' ', '') THEN name
    ELSE CONCAT(name, ' ', address)
  END,
  NULLIF(TRIM(style), ''),
  NULLIF(TRIM(species), ''),
  NULLIF(TRIM(lure), ''),
  NULLIF(TRIM(action), ''),
  NULLIF(TRIM(bait), ''),
  NULLIF(TRIM(depth), ''),
  NULLIF(
    TRIM(
      REPLACE(
        REPLACE(
          REPLACE(
            JSON_UNQUOTE(JSON_EXTRACT(tags, '$')),
            '[', ''
          ),
          ']', ''
        ),
        '","', ' '
      )
    ),
    ''
  )
)
WHERE search_text IS NULL OR search_text = '';

ALTER TABLE spots
ADD FULLTEXT INDEX ft_spot_search (name, search_text) WITH PARSER ngram;

CREATE TABLE IF NOT EXISTS search_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  keyword VARCHAR(100) NOT NULL,
  city VARCHAR(50) NULL,
  province VARCHAR(50) NULL,
  result_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_keyword_created (keyword, created_at),
  INDEX idx_city_created (city, created_at),
  INDEX idx_province_created (province, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
