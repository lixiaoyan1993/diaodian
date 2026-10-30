-- 为标点补充抖音 / 小红书等外部内容链接
ALTER TABLE spots
  ADD COLUMN source_link VARCHAR(500) NULL AFTER depth;
