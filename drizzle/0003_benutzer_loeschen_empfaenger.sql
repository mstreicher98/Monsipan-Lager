ALTER TABLE `movements` ADD `recipient_user_id` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `users` ADD `deleted_at` integer;--> statement-breakpoint
-- Stammdaten kennen nur noch Partien; bisherige "Personen" werden zu Partien
UPDATE `parties` SET `kind` = 'gruppe' WHERE `kind` <> 'gruppe';
