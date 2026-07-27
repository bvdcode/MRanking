CREATE TABLE `pack_items` (
	`id` text PRIMARY KEY NOT NULL,
	`pack_id` text NOT NULL,
	`position` integer NOT NULL,
	`title` text NOT NULL,
	`channel` text DEFAULT 'YouTube' NOT NULL,
	`video_id` text NOT NULL,
	`thumbnail_url` text NOT NULL,
	`youtube_url` text NOT NULL,
	`duration` text,
	FOREIGN KEY (`pack_id`) REFERENCES `packs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `packs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`source_type` text DEFAULT 'youtube' NOT NULL,
	`source_url` text NOT NULL,
	`cover_type` text DEFAULT 'thumbnail' NOT NULL,
	`cover_value` text NOT NULL,
	`item_count` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `results` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`pack_id` text NOT NULL,
	`champion_item_id` text NOT NULL,
	`session_json` text NOT NULL,
	`completed_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pack_id`) REFERENCES `packs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`pack_id` text NOT NULL,
	`state_json` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pack_id`) REFERENCES `packs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_hash_idx` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`nickname` text NOT NULL,
	`nickname_key` text NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`avatar_emoji` text DEFAULT '🎧' NOT NULL,
	`avatar_key` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_nickname_key_idx` ON `users` (`nickname_key`);