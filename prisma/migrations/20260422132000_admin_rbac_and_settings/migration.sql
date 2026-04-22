CREATE TABLE `admin_access` (
  `user_id` CHAR(128) NOT NULL,
  `role` VARCHAR(32) NOT NULL,
  `permissions` JSON NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_by` CHAR(128) NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`user_id`),
  INDEX `ind_admin_access_role` (`role`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `game_server_setting` (
  `id` VARCHAR(36) NOT NULL,
  `code` VARCHAR(32) NOT NULL,
  `name` VARCHAR(128) NOT NULL,
  `host` VARCHAR(255) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `game_server_setting_code_key` (`code`),
  INDEX `ind_game_server_setting_active` (`is_active`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `payment_method_setting` (
  `id` VARCHAR(36) NOT NULL,
  `code` VARCHAR(32) NOT NULL,
  `name` VARCHAR(128) NOT NULL,
  `channel` VARCHAR(32) NOT NULL,
  `account_name` VARCHAR(128) NULL,
  `account_number` VARCHAR(64) NULL,
  `phone_number` VARCHAR(32) NULL,
  `qr_template` VARCHAR(1024) NULL,
  `banks` JSON NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `payment_method_setting_code_key` (`code`),
  INDEX `ind_payment_method_setting_active` (`is_active`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `deposit_request`
  MODIFY `method` VARCHAR(32) NOT NULL,
  MODIFY `server` VARCHAR(32) NOT NULL;
