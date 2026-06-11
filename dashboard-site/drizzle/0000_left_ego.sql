CREATE TABLE `datasets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label` text NOT NULL,
	`source_file` text NOT NULL,
	`original_filename` text NOT NULL,
	`uploaded_by` text NOT NULL,
	`r2_key` text,
	`data_json` text NOT NULL,
	`is_current` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
