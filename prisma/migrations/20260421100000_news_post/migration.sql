CREATE TABLE `news_post` (
  `id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL,
  `excerpt` VARCHAR(512) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `cover_image` VARCHAR(512) NULL,
  `is_featured` BOOLEAN NOT NULL DEFAULT false,
  `is_published` BOOLEAN NOT NULL DEFAULT false,
  `published_at` DATETIME(0) NULL,
  `created_by` CHAR(128) NOT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

  UNIQUE INDEX `news_post_slug_key`(`slug`),
  INDEX `ind_news_published`(`is_published`, `published_at`),
  INDEX `ind_news_featured`(`is_featured`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
