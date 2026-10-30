CREATE TABLE IF NOT EXISTS spot_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  spot_id INT NOT NULL,
  user_id INT NOT NULL,
  platform VARCHAR(30) NOT NULL,
  url VARCHAR(500) NOT NULL,
  title VARCHAR(120),
  note VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_spot_links_spot_id (spot_id),
  INDEX idx_spot_links_user_id (user_id),
  INDEX idx_spot_links_platform (platform)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
