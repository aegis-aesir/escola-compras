CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`entity` text NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `school` (
	`id` integer PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`data` text NOT NULL
);
