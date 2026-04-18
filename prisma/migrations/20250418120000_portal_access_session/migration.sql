-- Portal access sessions: invalidate on logout / new login (web + game share user sessions).
CREATE TABLE `portal_access_session` (
    `jti` VARCHAR(64) NOT NULL,
    `user_id` CHAR(128) NOT NULL,
    `expires_at` DATETIME(0) NOT NULL,
    `revoked_at` DATETIME(0) NULL,

    PRIMARY KEY (`jti`),
    INDEX `ind_portal_sess_user`(`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
