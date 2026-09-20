ALTER TABLE `users` ADD `party_id` integer REFERENCES parties(id);--> statement-breakpoint
-- Neue Rollen: Lagerleiter heißt jetzt Bauleiter; Produktion/Fahrer werden Arbeiter (vorsichtigste Stufe)
UPDATE `users` SET `role` = 'bauleiter' WHERE `role` = 'lagerleiter';--> statement-breakpoint
UPDATE `users` SET `role` = 'arbeiter' WHERE `role` IN ('produktion', 'fahrer');--> statement-breakpoint
UPDATE `settings` SET `value` = replace(`value`, '"lagerleiter"', '"bauleiter"') WHERE `key` = 'alertRoles';
