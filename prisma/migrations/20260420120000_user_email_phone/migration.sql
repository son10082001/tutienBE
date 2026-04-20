-- Thông tin liên hệ trên portal (tuỳ chọn)
ALTER TABLE `user` ADD COLUMN `email` VARCHAR(255) NULL,
ADD COLUMN `phone` VARCHAR(32) NULL;
