ALTER TABLE `ticket_conversion`
  ADD COLUMN `server_id` INT NOT NULL DEFAULT 0,
  ADD COLUMN `player_uid` CHAR(24) NOT NULL DEFAULT '',
  ADD COLUMN `player_name` VARCHAR(32) NOT NULL DEFAULT '',
  ADD INDEX `ind_tc_server`(`server_id`);
