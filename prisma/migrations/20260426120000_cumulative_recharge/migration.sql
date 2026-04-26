CREATE TABLE `cumulative_recharge_milestone` (
  `id` VARCHAR(36) NOT NULL,
  `threshold_amount` INT NOT NULL,
  `title` VARCHAR(128) NULL,
  `gifts` JSON NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  INDEX `ind_crm_active_sort`(`is_active`, `sort_order`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cumulative_recharge_claim` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` CHAR(128) NOT NULL,
  `milestone_id` VARCHAR(36) NOT NULL,
  `server_id` INT NOT NULL,
  `player_uid` CHAR(24) NOT NULL,
  `player_name` VARCHAR(32) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `ind_crc_user`(`user_id`),
  UNIQUE INDEX `uniq_crc_user_milestone`(`user_id`, `milestone_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_crc_milestone` FOREIGN KEY (`milestone_id`) REFERENCES `cumulative_recharge_milestone`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
