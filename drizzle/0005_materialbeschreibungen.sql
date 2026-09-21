CREATE TABLE `product_documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`kind` text DEFAULT 'materialbeschreibung' NOT NULL,
	`title` text NOT NULL,
	`file_name` text NOT NULL,
	`sha256` text NOT NULL,
	`size` integer NOT NULL,
	`uploaded_by` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `product_documents_product_idx` ON `product_documents` (`product_id`);