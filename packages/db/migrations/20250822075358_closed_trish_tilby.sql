CREATE TABLE "achievements" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"requirement" jsonb NOT NULL,
	"reward_type" text,
	"reward_value" jsonb,
	"points" integer DEFAULT 10 NOT NULL,
	"tier" text
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"suit" text NOT NULL,
	"cost" integer NOT NULL,
	"attack" integer,
	"health" integer,
	"type" text NOT NULL,
	"keywords" jsonb,
	"rarity" text NOT NULL,
	"card_set" text NOT NULL,
	"champion_level_up" text,
	"image_url" text,
	"flavor_text" text,
	"artist" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_participation" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"user_id" text NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"rank" integer,
	"rewards_claimed" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"start_at" timestamp NOT NULL,
	"end_at" timestamp NOT NULL,
	"config" jsonb,
	"rewards" jsonb,
	"is_active" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"friend_id" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"match_type" text NOT NULL,
	"player_id" text NOT NULL,
	"turn_number" integer NOT NULL,
	"action_number" integer NOT NULL,
	"action_type" text NOT NULL,
	"action_data" jsonb NOT NULL,
	"game_state" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_replays" (
	"id" text PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"match_type" text NOT NULL,
	"initial_state" jsonb NOT NULL,
	"actions" jsonb NOT NULL,
	"final_state" jsonb NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "neon_auth"."users_sync" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp,
	"raw_json" jsonb
);
--> statement-breakpoint
CREATE TABLE "player_achievements" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"achievement_id" text NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"claimed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "player_collections" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"card_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"obtained_at" timestamp DEFAULT now() NOT NULL,
	"obtained_from" text
);
--> statement-breakpoint
CREATE TABLE "player_decks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"format" text NOT NULL,
	"cards" jsonb NOT NULL,
	"cover_card" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"win_rate" numeric(5, 2),
	"games_played" integer DEFAULT 0 NOT NULL,
	"games_won" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"display_name" text NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"experience" integer DEFAULT 0 NOT NULL,
	"currency" integer DEFAULT 100 NOT NULL,
	"premium_currency" integer DEFAULT 0 NOT NULL,
	"total_games_played" integer DEFAULT 0 NOT NULL,
	"total_wins" integer DEFAULT 0 NOT NULL,
	"total_losses" integer DEFAULT 0 NOT NULL,
	"win_streak" integer DEFAULT 0 NOT NULL,
	"best_win_streak" integer DEFAULT 0 NOT NULL,
	"selected_card_back" text,
	"selected_avatar" text,
	"selected_board" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pve_leaderboard" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"run_id" text NOT NULL,
	"score" integer NOT NULL,
	"floors_cleared" integer NOT NULL,
	"bosses_defeated" integer NOT NULL,
	"completion_time" integer,
	"achieved_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pve_rewards" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"user_id" text NOT NULL,
	"node_id" text NOT NULL,
	"reward_type" text NOT NULL,
	"reward_value" jsonb,
	"claimed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pve_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"seed" text NOT NULL,
	"status" text NOT NULL,
	"current_node_id" text,
	"completed_nodes" jsonb,
	"region" integer DEFAULT 1 NOT NULL,
	"floor" integer DEFAULT 1 NOT NULL,
	"health" integer NOT NULL,
	"max_health" integer NOT NULL,
	"gold" integer NOT NULL,
	"deck" jsonb NOT NULL,
	"relics" jsonb,
	"battles_won" integer DEFAULT 0 NOT NULL,
	"elites_defeated" integer DEFAULT 0 NOT NULL,
	"bosses_defeated" integer DEFAULT 0 NOT NULL,
	"cards_obtained" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pvp_matches" (
	"id" text PRIMARY KEY NOT NULL,
	"player1_id" text NOT NULL,
	"player2_id" text NOT NULL,
	"winner_id" text,
	"loser_id" text,
	"format" text NOT NULL,
	"duration" integer,
	"turn_count" integer,
	"player1_deck_id" text,
	"player2_deck_id" text,
	"wager_enabled" boolean DEFAULT false NOT NULL,
	"wagered_card_id" text,
	"wager_claimed_by" text,
	"player1_rating_before" integer,
	"player1_rating_after" integer,
	"player2_rating_before" integer,
	"player2_rating_after" integer,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "pvp_rankings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"season" integer NOT NULL,
	"rating" integer DEFAULT 1000 NOT NULL,
	"rank" integer,
	"tier" text,
	"games_played" integer DEFAULT 0 NOT NULL,
	"games_won" integer DEFAULT 0 NOT NULL,
	"win_streak" integer DEFAULT 0 NOT NULL,
	"best_rating" integer DEFAULT 1000 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"quest_type" text NOT NULL,
	"requirement" integer NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"reward_type" text NOT NULL,
	"reward_value" jsonb NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"claimed_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_participation" ADD CONSTRAINT "event_participation_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_achievements" ADD CONSTRAINT "player_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_collections" ADD CONSTRAINT "player_collections_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pve_leaderboard" ADD CONSTRAINT "pve_leaderboard_run_id_pve_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."pve_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pve_rewards" ADD CONSTRAINT "pve_rewards_run_id_pve_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."pve_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pvp_matches" ADD CONSTRAINT "pvp_matches_player1_deck_id_player_decks_id_fk" FOREIGN KEY ("player1_deck_id") REFERENCES "public"."player_decks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pvp_matches" ADD CONSTRAINT "pvp_matches_player2_deck_id_player_decks_id_fk" FOREIGN KEY ("player2_deck_id") REFERENCES "public"."player_decks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pvp_matches" ADD CONSTRAINT "pvp_matches_wagered_card_id_cards_id_fk" FOREIGN KEY ("wagered_card_id") REFERENCES "public"."cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cards_set_idx" ON "cards" USING btree ("card_set");--> statement-breakpoint
CREATE INDEX "cards_rarity_idx" ON "cards" USING btree ("rarity");--> statement-breakpoint
CREATE UNIQUE INDEX "event_participation_event_user_idx" ON "event_participation" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "friendships_user_friend_idx" ON "friendships" USING btree ("user_id","friend_id");--> statement-breakpoint
CREATE INDEX "match_actions_match_idx" ON "match_actions" USING btree ("match_id","match_type");--> statement-breakpoint
CREATE INDEX "match_actions_turn_idx" ON "match_actions" USING btree ("turn_number");--> statement-breakpoint
CREATE UNIQUE INDEX "match_replays_match_idx" ON "match_replays" USING btree ("match_id","match_type");--> statement-breakpoint
CREATE INDEX "match_replays_public_idx" ON "match_replays" USING btree ("is_public");--> statement-breakpoint
CREATE UNIQUE INDEX "player_achievements_user_achievement_idx" ON "player_achievements" USING btree ("user_id","achievement_id");--> statement-breakpoint
CREATE UNIQUE INDEX "player_collections_user_card_idx" ON "player_collections" USING btree ("user_id","card_id");--> statement-breakpoint
CREATE INDEX "player_decks_user_idx" ON "player_decks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "player_decks_active_idx" ON "player_decks" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "player_profiles_user_idx" ON "player_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pve_leaderboard_user_idx" ON "pve_leaderboard" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pve_leaderboard_score_idx" ON "pve_leaderboard" USING btree ("score");--> statement-breakpoint
CREATE INDEX "pve_runs_user_idx" ON "pve_runs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pve_runs_status_idx" ON "pve_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pvp_matches_player1_idx" ON "pvp_matches" USING btree ("player1_id");--> statement-breakpoint
CREATE INDEX "pvp_matches_player2_idx" ON "pvp_matches" USING btree ("player2_id");--> statement-breakpoint
CREATE INDEX "pvp_matches_winner_idx" ON "pvp_matches" USING btree ("winner_id");--> statement-breakpoint
CREATE INDEX "pvp_matches_format_idx" ON "pvp_matches" USING btree ("format");--> statement-breakpoint
CREATE INDEX "pvp_matches_started_at_idx" ON "pvp_matches" USING btree ("started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pvp_rankings_user_season_idx" ON "pvp_rankings" USING btree ("user_id","season");--> statement-breakpoint
CREATE INDEX "pvp_rankings_rating_idx" ON "pvp_rankings" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "pvp_rankings_season_idx" ON "pvp_rankings" USING btree ("season");--> statement-breakpoint
CREATE INDEX "quests_user_idx" ON "quests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "quests_type_idx" ON "quests" USING btree ("type");--> statement-breakpoint
CREATE INDEX "quests_expires_idx" ON "quests" USING btree ("expires_at");