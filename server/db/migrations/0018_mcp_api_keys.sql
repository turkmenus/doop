CREATE TABLE IF NOT EXISTS "mcp_api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"prefix" text NOT NULL,
	"created_at" bigint NOT NULL,
	"last_used_at" bigint,
	"expires_at" bigint
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mcp_api_keys_user_idx" ON "mcp_api_keys" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mcp_api_keys_hash_idx" ON "mcp_api_keys" USING btree ("key_hash");
