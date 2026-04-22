CREATE TABLE `support_ticket` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` CHAR(128) NOT NULL,
  `character_name` VARCHAR(64) NULL,
  `server_name` VARCHAR(64) NULL,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'open',
  `admin_reply` TEXT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`),
  INDEX `ind_support_ticket_user_created` (`user_id`, `created_at`),
  INDEX `ind_support_ticket_status` (`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `support_channel` (
  `id` VARCHAR(36) NOT NULL,
  `code` VARCHAR(32) NOT NULL,
  `name` VARCHAR(128) NOT NULL,
  `url` VARCHAR(512) NOT NULL,
  `icon` VARCHAR(64) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `support_channel_code_key` (`code`),
  INDEX `ind_support_channel_active_sort` (`is_active`, `sort_order`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
