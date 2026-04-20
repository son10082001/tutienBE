CREATE TABLE `ticket_conversion` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` CHAR(128) NOT NULL,
  `server_id` INT NOT NULL,
  `player_uid` CHAR(24) NOT NULL,
  `player_name` VARCHAR(32) NOT NULL,
  `amount` INT NOT NULL,
  `tickets` INT NOT NULL,
  `conversion_rate` INT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `ind_tc_user`(`user_id`),
  INDEX `ind_tc_server`(`server_id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
