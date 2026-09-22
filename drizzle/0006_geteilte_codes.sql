DROP INDEX `product_codes_normalized_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `product_codes_product_normalized_idx` ON `product_codes` (`product_id`,`normalized`);--> statement-breakpoint
CREATE INDEX `product_codes_normalized_idx` ON `product_codes` (`normalized`);