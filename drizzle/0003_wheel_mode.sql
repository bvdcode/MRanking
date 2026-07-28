ALTER TABLE `packs` ADD `visibility` text DEFAULT 'private' NOT NULL;
--> statement-breakpoint
CREATE TABLE `wheel_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`duration_seconds` integer DEFAULT 5 NOT NULL,
	`sound_enabled` integer DEFAULT true NOT NULL,
	`volume` real DEFAULT 0.65 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `wheel_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`pack_id` text NOT NULL,
	`state_json` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pack_id`) REFERENCES `packs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wheel_runs_user_pack_idx` ON `wheel_runs` (`user_id`,`pack_id`);
--> statement-breakpoint
CREATE TABLE `wheel_results` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`pack_id` text NOT NULL,
	`winner_item_id` text NOT NULL,
	`mode` text NOT NULL,
	`state_json` text NOT NULL,
	`pack_json` text NOT NULL,
	`completed_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pack_id`) REFERENCES `packs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `wheel_results_user_id_idx` ON `wheel_results` (`user_id`,`completed_at`);
