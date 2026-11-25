import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import {
	copyFileSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

test("projects migration preserves nested notes, backlinks, trash, and retired IDs with foreign keys on", () => {
	const directory = mkdtempSync(join(tmpdir(), "abyrd-project-migration-"));
	const sqlite = new Database(":memory:");
	try {
		const migrations = fileURLToPath(
			new URL("../../../drizzle", import.meta.url),
		);
		const prior = join(directory, "prior");
		mkdirSync(join(prior, "meta"), { recursive: true });
		const journal = JSON.parse(
			readFileSync(join(migrations, "meta/_journal.json"), "utf8"),
		);
		const entries = journal.entries.filter(
			(entry: { idx: number }) => entry.idx < 12,
		);
		writeFileSync(
			join(prior, "meta/_journal.json"),
			JSON.stringify({ ...journal, entries }),
		);
		for (const entry of entries) {
			copyFileSync(
				join(migrations, `${entry.tag}.sql`),
				join(prior, `${entry.tag}.sql`),
			);
		}
		sqlite.exec("PRAGMA foreign_keys = ON");
		const db = drizzle(sqlite);
		migrate(db, { migrationsFolder: prior });
		sqlite.exec(`
			INSERT INTO writings (id, title, created_at, updated_at) VALUES (1, 'Book', 100, 200);
			INSERT INTO writing_chapters (id, writing_id, title, position, content, created_at, updated_at)
				VALUES (1, 1, 'Chapter', 0, 'chapter body', 100, 200);
			INSERT INTO writing_notes (id, writing_id, chapter_id, parent_id, title, position, content, created_at, updated_at)
				VALUES (1, 1, NULL, NULL, 'Root', 0, 'root body', 100, 200),
					(2, 1, NULL, 1, 'Child', 1, 'child body', 110, 210),
					(3, 1, 1, NULL, 'Chapter note', 0, 'chapter note body', 120, 220),
					(99, 1, NULL, NULL, 'Deleted', 2, NULL, 100, 200);
			DELETE FROM writing_notes WHERE id = 99;
			INSERT INTO note_links (id, source_chapter_id, source_note_id, target_note_id, context)
				VALUES (1, 1, NULL, 2, 'chapter backlink'), (2, NULL, 2, 3, 'note backlink');
			INSERT INTO writing_trash (id, kind, title, writing_id, writing_title, snapshot, deleted_at)
				VALUES (1, 'note', 'Trashed', 1, 'Book', '{"content":"saved"}', 300),
					(99, 'note', 'Deleted trash', 1, 'Book', '{}', 300);
			DELETE FROM writing_trash WHERE id = 99;
		`);
		const notes = sqlite.query("SELECT * FROM writing_notes ORDER BY id").all();
		const links = sqlite.query("SELECT * FROM note_links ORDER BY id").all();
		const trash = sqlite.query("SELECT * FROM writing_trash ORDER BY id").all();
		const chapters = sqlite
			.query("SELECT * FROM writing_chapters ORDER BY id")
			.all();
		migrate(db, { migrationsFolder: migrations });
		expect(sqlite.query("PRAGMA foreign_keys").get()).toEqual({
			foreign_keys: 1,
		});
		expect(sqlite.query("PRAGMA foreign_key_check").all()).toEqual([]);
		expect(
			sqlite.query("SELECT * FROM writing_notes ORDER BY id").all(),
		).toEqual(
			notes.map((note: Record<string, unknown>) => ({
				...note,
				project_id: null,
			})),
		);
		expect(sqlite.query("SELECT * FROM note_links ORDER BY id").all()).toEqual(
			links,
		);
		expect(
			sqlite.query("SELECT * FROM writing_trash ORDER BY id").all(),
		).toEqual(trash);
		expect(
			sqlite.query("SELECT * FROM writing_chapters ORDER BY id").all(),
		).toEqual(chapters);
		expect(sqlite.query("SELECT * FROM writings").all()).toEqual([
			{
				id: 1,
				title: "Book",
				page_size: "trade",
				project_id: null,
				created_at: 100,
				updated_at: 200,
			},
		]);
		sqlite.exec(`
			INSERT INTO projects (id, title, created_at, updated_at) VALUES (1, 'World', 100, 200);
			INSERT INTO writing_notes (project_id, title, position, created_at, updated_at)
				VALUES (1, 'Wiki', 0, 100, 200);
			INSERT INTO writing_trash (kind, title, snapshot, deleted_at)
				VALUES ('note', 'Wiki trash', '{}', 300);
		`);
		expect(
			sqlite.query("SELECT id FROM writing_notes WHERE title = 'Wiki'").get(),
		).toEqual({ id: 100 });
		expect(
			sqlite
				.query("SELECT id FROM writing_trash WHERE title = 'Wiki trash'")
				.get(),
		).toEqual({ id: 100 });
		expect(() =>
			sqlite.exec(
				"INSERT INTO writing_notes (position, created_at, updated_at) VALUES (0, 100, 200)",
			),
		).toThrow();
		migrate(db, { migrationsFolder: migrations });
		expect(sqlite.query("SELECT * FROM note_links ORDER BY id").all()).toEqual(
			links,
		);
		sqlite.exec("DELETE FROM writing_notes WHERE id = 1");
		expect(
			sqlite.query("SELECT id FROM writing_notes ORDER BY id").all(),
		).toEqual([{ id: 3 }, { id: 100 }]);
		expect(sqlite.query("SELECT * FROM note_links").all()).toEqual([]);
		expect(sqlite.query("PRAGMA foreign_key_check").all()).toEqual([]);
	} finally {
		sqlite.close();
		rmSync(directory, { recursive: true, force: true });
	}
});
