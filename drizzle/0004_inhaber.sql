ALTER TABLE `users` ADD `owner` integer DEFAULT false NOT NULL;--> statement-breakpoint
-- Der älteste aktive Admin wird Inhaber
UPDATE `users` SET `owner` = 1 WHERE `id` = (SELECT `id` FROM `users` WHERE `role` = 'admin' AND `deleted_at` IS NULL ORDER BY `id` LIMIT 1);
