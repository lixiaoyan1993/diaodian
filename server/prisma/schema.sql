-- 叼点 数据库建表脚本
-- 在 MySQL 中执行: mysql -h 127.0.0.1 -u root -p diaodian < schema.sql

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  avatar VARCHAR(255),
  phone VARCHAR(20),
  password VARCHAR(255) NOT NULL,
  wechat_openid VARCHAR(100) UNIQUE,
  douyin_openid VARCHAR(100) UNIQUE,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spots (
 id INT AUTO_INCREMENT PRIMARY KEY,
 user_id INT NOT NULL,
 name VARCHAR(100) NOT NULL,
 style VARCHAR(30) NOT NULL,
 species VARCHAR(100),
 latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  address VARCHAR(200),
  province VARCHAR(50),
  city VARCHAR(50),
  district VARCHAR(50),
  accuracy VARCHAR(50),
  tags JSON,
  photo_urls JSON,
  is_public TINYINT(1) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  lure VARCHAR(50),
  action VARCHAR(50),
  bait VARCHAR(50),
  depth VARCHAR(50),
  source_link VARCHAR(500),
  note TEXT,
  base_score INT NOT NULL DEFAULT 70,
  score INT NOT NULL DEFAULT 70,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_id (user_id),
  INDEX idx_location (latitude, longitude),
  INDEX idx_region (province, city, district),
  INDEX idx_status (status, is_public),
  INDEX idx_species (species)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  spot_id INT NOT NULL,
  user_id INT NOT NULL,
  feedback VARCHAR(50) NOT NULL,
  note TEXT,
  photo_urls JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_spot_id (spot_id),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  spot_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_spot (user_id, spot_id),
  INDEX idx_user_id (user_id),
  INDEX idx_spot_id (spot_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS feedbacks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(30) NOT NULL,
  content VARCHAR(500) NOT NULL,
  contact VARCHAR(100),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS travel_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  spot_id INT NOT NULL,
  travel_type VARCHAR(20) NOT NULL DEFAULT 'companion',
  depart_at DATETIME NOT NULL,
  departure_place VARCHAR(120),
  seat_total INT,
  expires_at DATETIME,
  description TEXT,
  contact VARCHAR(100) NOT NULL,
  share_token VARCHAR(64) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_spot_id (spot_id),
  INDEX idx_travel_type (travel_type),
  INDEX idx_status_depart_at (status, depart_at),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS travel_post_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'joined',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES travel_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY uk_post_user (post_id, user_id),
  INDEX idx_post_id (post_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
