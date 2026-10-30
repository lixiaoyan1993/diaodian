CREATE TABLE IF NOT EXISTS catches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  spot_id INT NULL,
  species VARCHAR(100) NOT NULL,
  length_cm DECIMAL(7, 2) NULL,
  weight_kg DECIMAL(7, 3) NULL,
  style VARCHAR(30) NOT NULL DEFAULT '',
  bait VARCHAR(100) NOT NULL DEFAULT '',
  note TEXT,
  photo_urls JSON,
  caught_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE SET NULL,
  INDEX idx_catches_user_time (user_id, caught_at),
  INDEX idx_catches_spot (spot_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
