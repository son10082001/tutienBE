CREATE TABLE `admin_role_permission` (
  `role` VARCHAR(32) NOT NULL,
  `permissions` JSON NOT NULL,
  `updated_by` CHAR(128) NULL,
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`role`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
