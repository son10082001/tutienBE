-- Chạy thủ công trên MySQL nếu migrate chưa áp dụng (chọn đúng database có bảng `user`).
-- Lỗi "Duplicate column" = cột đã tồn tại, bỏ qua.

ALTER TABLE `user` ADD COLUMN `email` VARCHAR(255) NULL;
ALTER TABLE `user` ADD COLUMN `phone` VARCHAR(32) NULL;
