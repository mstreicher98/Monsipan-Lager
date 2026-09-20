ALTER TABLE `colors` ADD `ral` text;--> statement-breakpoint
-- Standardfarben mit ihrer Verkehrsfarbe nach RAL verknüpfen (nur wenn noch unverändert benannt)
UPDATE `colors` SET `ral` = '9016' WHERE `name` = 'Weiß' AND `ral` IS NULL;--> statement-breakpoint
UPDATE `colors` SET `ral` = '1023' WHERE `name` = 'Gelb' AND `ral` IS NULL;--> statement-breakpoint
UPDATE `colors` SET `ral` = '3020' WHERE `name` = 'Rot' AND `ral` IS NULL;--> statement-breakpoint
UPDATE `colors` SET `ral` = '5017' WHERE `name` = 'Blau' AND `ral` IS NULL;--> statement-breakpoint
UPDATE `colors` SET `ral` = '6024' WHERE `name` = 'Grün' AND `ral` IS NULL;--> statement-breakpoint
UPDATE `colors` SET `ral` = '2009' WHERE `name` = 'Orange' AND `ral` IS NULL;--> statement-breakpoint
UPDATE `colors` SET `ral` = '7042' WHERE `name` = 'Grau' AND `ral` IS NULL;--> statement-breakpoint
UPDATE `colors` SET `ral` = '9017' WHERE `name` = 'Schwarz' AND `ral` IS NULL;
