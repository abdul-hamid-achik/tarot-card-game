CREATE TABLE "cards" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"suit" text NOT NULL,
	"cost" integer NOT NULL,
	"type" text NOT NULL,
	"rarity" text NOT NULL,
	"card_set" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decks" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"format" text NOT NULL
);
