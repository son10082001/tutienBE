CREATE TABLE `deposit_request` (
  `id`         VARCHAR(36)  NOT NULL,
  `user_id`    CHAR(128)    NOT NULL,
  `amount`     INT          NOT NULL,
  `method`     VARCHAR(16)  NOT NULL,
  `note`       VARCHAR(256) NOT NULL,
  `server`     VARCHAR(16)  NOT NULL,
  `status`     VARCHAR(16)  NOT NULL DEFAULT 'pending',
  `admin_note` VARCHAR(512) NULL,
  `created_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3)  NOT NULL,

  INDEX `ind_dr_user`(`user_id`),
  INDEX `ind_dr_status`(`status`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
