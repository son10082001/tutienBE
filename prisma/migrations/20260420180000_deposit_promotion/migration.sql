CREATE TABLE `deposit_promotion` (
    `id` VARCHAR(36) NOT NULL,
    `percent` INTEGER NOT NULL,
    `start_at` DATETIME(0) NOT NULL,
    `end_at` DATETIME(0) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `label` VARCHAR(128) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `deposit_request`
  ADD COLUMN `bonus_amount` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `promo_percent_snapshot` INTEGER NULL;

CREATE TABLE `ticket_exchange` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` CHAR(128) NOT NULL,
  `server_id` INT NOT NULL,
  `player_uid` CHAR(24) NOT NULL,
  `player_name` VARCHAR(32) NOT NULL,
  `tickets` INT NOT NULL,
  `conversion_rate` INT NOT NULL,
  `game_currency_add` INT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `ind_te_user`(`user_id`),
  INDEX `ind_te_server`(`server_id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
