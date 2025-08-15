-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_drawing_tools" (
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
INSERT INTO "new_drawing_tools" ("created_at", "expires_at", "id", "last_accessed_at", "locked", "points", "style", "symbol", "text", "type", "updated_at", "user_id", "visible") SELECT "created_at", "expires_at", "id", "last_accessed_at", "locked", "points", "style", "symbol", "text", "type", "updated_at", "user_id", "visible" FROM "drawing_tools";
DROP TABLE "drawing_tools";
ALTER TABLE "new_drawing_tools" RENAME TO "drawing_tools";
CREATE INDEX "drawing_tools_user_id_symbol_timeframe_idx" ON "drawing_tools"("user_id", "symbol", "timeframe");
CREATE INDEX "drawing_tools_expires_at_idx" ON "drawing_tools"("expires_at");
CREATE INDEX "drawing_tools_last_accessed_at_idx" ON "drawing_tools"("last_accessed_at");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
