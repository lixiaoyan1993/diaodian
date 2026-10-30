-- 为标点增加用户自定义标签，如“好停车”“不收费”
ALTER TABLE spots
  ADD COLUMN tags JSON NULL AFTER accuracy;
