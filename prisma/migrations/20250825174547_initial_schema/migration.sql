-- CreateTable
CREATE TABLE "symbols" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "display_symbol" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "candles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "open" REAL NOT NULL,
    "high" REAL NOT NULL,
    "low" REAL NOT NULL,
    "close" REAL NOT NULL,
    "volume" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "candles_symbol_fkey" FOREIGN KEY ("symbol") REFERENCES "symbols" ("symbol") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "chart_type" TEXT NOT NULL DEFAULT 'candlestick',
    "timeframe" TEXT NOT NULL DEFAULT '1D',
    "indicators" TEXT NOT NULL DEFAULT '[]',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL DEFAULT '',
    "name" TEXT,
    "avatar" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" DATETIME,
    "last_login_at" DATETIME,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "reset_token" TEXT,
    "reset_token_expiry" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "drawing_tools" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL DEFAULT '1D',
    "type" TEXT NOT NULL,
    "points" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "text" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" DATETIME,
    "last_accessed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "drawing_tools_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "price_alerts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "percentage_change" REAL,
    "message" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "currency" TEXT DEFAULT 'USD',
    "exchange" TEXT,
    "timezone" TEXT,
    "triggered_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "price_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "watchlists" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT DEFAULT 'USD',
    "exchange" TEXT,
    "timezone" TEXT,
    "added_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "watchlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_indicators" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL DEFAULT 'D',
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parameters" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "style" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_indicators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "saved_charts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "chart_type" TEXT NOT NULL,
    "indicators" TEXT NOT NULL,
    "drawingTools" TEXT NOT NULL,
    "chart_settings" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "saved_charts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "symbols_symbol_key" ON "symbols"("symbol");

-- CreateIndex
CREATE INDEX "candles_symbol_timestamp_idx" ON "candles"("symbol", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "candles_symbol_timestamp_key" ON "candles"("symbol", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_failed_login_count_idx" ON "users"("failed_login_count");

-- CreateIndex
CREATE INDEX "users_locked_until_idx" ON "users"("locked_until");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "users_reset_token_idx" ON "users"("reset_token");

-- CreateIndex
CREATE INDEX "users_reset_token_expiry_idx" ON "users"("reset_token_expiry");

-- CreateIndex
CREATE INDEX "drawing_tools_user_id_symbol_timeframe_idx" ON "drawing_tools"("user_id", "symbol", "timeframe");

-- CreateIndex
CREATE INDEX "drawing_tools_expires_at_idx" ON "drawing_tools"("expires_at");

-- CreateIndex
CREATE INDEX "drawing_tools_last_accessed_at_idx" ON "drawing_tools"("last_accessed_at");

-- CreateIndex
CREATE INDEX "price_alerts_user_id_symbol_idx" ON "price_alerts"("user_id", "symbol");

-- CreateIndex
CREATE INDEX "price_alerts_enabled_idx" ON "price_alerts"("enabled");

-- CreateIndex
CREATE INDEX "price_alerts_user_id_enabled_idx" ON "price_alerts"("user_id", "enabled");

-- CreateIndex
CREATE INDEX "price_alerts_symbol_enabled_idx" ON "price_alerts"("symbol", "enabled");

-- CreateIndex
CREATE INDEX "price_alerts_triggered_at_idx" ON "price_alerts"("triggered_at");

-- CreateIndex
CREATE INDEX "price_alerts_type_enabled_idx" ON "price_alerts"("type", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_is_revoked_idx" ON "refresh_tokens"("is_revoked");

-- CreateIndex
CREATE INDEX "watchlists_user_id_idx" ON "watchlists"("user_id");

-- CreateIndex
CREATE INDEX "watchlists_symbol_idx" ON "watchlists"("symbol");

-- CreateIndex
CREATE INDEX "watchlists_user_id_position_idx" ON "watchlists"("user_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "watchlists_user_id_symbol_key" ON "watchlists"("user_id", "symbol");

-- CreateIndex
CREATE INDEX "user_indicators_user_id_symbol_timeframe_idx" ON "user_indicators"("user_id", "symbol", "timeframe");

-- CreateIndex
CREATE INDEX "user_indicators_type_idx" ON "user_indicators"("type");

-- CreateIndex
CREATE UNIQUE INDEX "user_indicators_user_id_symbol_timeframe_name_key" ON "user_indicators"("user_id", "symbol", "timeframe", "name");

-- CreateIndex
CREATE INDEX "saved_charts_user_id_symbol_timeframe_idx" ON "saved_charts"("user_id", "symbol", "timeframe");

-- CreateIndex
CREATE INDEX "saved_charts_is_default_idx" ON "saved_charts"("is_default");

-- CreateIndex
CREATE INDEX "saved_charts_user_id_position_idx" ON "saved_charts"("user_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "saved_charts_user_id_symbol_timeframe_name_key" ON "saved_charts"("user_id", "symbol", "timeframe", "name");
