CREATE TABLE `shop_item` (
  `id` VARCHAR(36) NOT NULL,
  `external_item_id` INT NOT NULL,
  `item_name` VARCHAR(128) NOT NULL,
  `item_quantity` INT NOT NULL,
  `price` INT NOT NULL,
  `image_url` VARCHAR(512) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  INDEX `ind_shop_item_active`(`is_active`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `shop_order` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` CHAR(128) NOT NULL,
  `shop_item_id` VARCHAR(36) NOT NULL,
  `external_item_id` INT NOT NULL,
  `item_name` VARCHAR(128) NOT NULL,
  `unit_item_quantity` INT NOT NULL,
  `buy_quantity` INT NOT NULL,
  `total_item_quantity` INT NOT NULL,
  `unit_price` INT NOT NULL,
  `total_price` INT NOT NULL,
  `server_id` INT NOT NULL,
  `player_uid` CHAR(24) NOT NULL,
  `player_name` VARCHAR(32) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `ind_shop_order_user`(`user_id`),
  INDEX `ind_shop_order_item`(`shop_item_id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
