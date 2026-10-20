import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

let sequence = 0;
afterEach(() => { delete globalThis.window; });

async function store({ raw = null, readError = false, writeError = false } = {}) {
  let saved = raw;
  const storage = {
    getItem() { if (readError) throw new Error("storage blocked"); return saved; },
    setItem(_key, value) { if (writeError) throw new Error("quota exceeded"); saved = value; },
  };
  const browser = new EventTarget();
  browser.localStorage = storage;
  globalThis.window = browser;
  const api = await import(`../src/lib/favorites.ts?test=${++sequence}`);
  return { ...api, browser, storage, saved: () => saved };
}

test("SSR snapshot never accesses browser storage", async () => {
  const api = await import(`../src/lib/favorites.ts?test=${++sequence}`);
  assert.deepEqual(api.getFavoritesSnapshot(), { teams: [], players: [], persistent: true });
});

test("team and composite player keys persist, reload and toggle independently", async () => {
  const api = await store();
  assert.equal(api.FAVORITES_STORAGE_KEY, "nba-salary-tracker:favorites:v1");
  const lal = api.playerFavoriteKey("los-angeles-lakers", "123");
  const gsw = api.playerFavoriteKey("golden-state-warriors", "123");
  assert.notEqual(lal, gsw);
  api.toggleFavorite("teams", "los-angeles-lakers");
  api.toggleFavorite("players", lal);
  api.toggleFavorite("players", gsw);
  assert.deepEqual(JSON.parse(api.saved()), { teams: ["los-angeles-lakers"], players: [lal, gsw] });
  const reloaded = await store({ raw: api.saved() });
  assert.deepEqual(reloaded.getFavoritesSnapshot().players, [lal, gsw]);
  reloaded.toggleFavorite("players", lal);
  assert.deepEqual(reloaded.getFavoritesSnapshot().players, [gsw]);
  assert.deepEqual(reloaded.getFavoritesSnapshot().teams, ["los-angeles-lakers"]);
});

test("malformed JSON and invalid members are safe without rewriting stored data", async () => {
  for (const raw of ["{broken", "null", "42", "[]"]) {
    const api = await store({ raw });
    assert.deepEqual(api.getFavoritesSnapshot(), { teams: [], players: [], persistent: true });
    assert.equal(api.saved(), raw);
  }
  const api = await store({ raw: JSON.stringify({ teams: ["lal", 7, null, "", "lal"], players: "invalid" }) });
  assert.deepEqual(api.getFavoritesSnapshot(), { teams: ["lal"], players: [], persistent: true });
});

test("read denial keeps favorites in memory across operations", async () => {
  const api = await store({ readError: true });
  Object.defineProperty(api.browser, "localStorage", { get() { throw new Error("denied"); } });
  assert.equal(api.getFavoritesSnapshot().persistent, false);
  api.toggleFavorite("teams", "lal");
  api.toggleFavorite("players", "lal:123");
  assert.deepEqual(api.getFavoritesSnapshot(), { teams: ["lal"], players: ["lal:123"], persistent: false });
  api.toggleFavorite("teams", "lal");
  assert.deepEqual(api.getFavoritesSnapshot().teams, []);
});

test("write denial preserves loaded entries and new in-memory choices", async () => {
  const api = await store({ raw: JSON.stringify({ teams: ["existing"], players: [] }), writeError: true });
  api.toggleFavorite("teams", "added");
  api.toggleFavorite("players", "team:player");
  assert.deepEqual(api.getFavoritesSnapshot(), { teams: ["existing", "added"], players: ["team:player"], persistent: false });
  assert.deepEqual(JSON.parse(api.saved()).teams, ["existing"]);
});

test("same-tab changes notify subscribers and snapshots remain stable", async () => {
  const api = await store();
  let calls = 0;
  const unsubscribe = api.subscribeFavorites(() => calls++);
  const initial = api.getFavoritesSnapshot();
  assert.equal(api.getFavoritesSnapshot(), initial);
  api.toggleFavorite("teams", "lal");
  assert.equal(calls, 1);
  assert.notEqual(api.getFavoritesSnapshot(), initial);
  unsubscribe();
  api.toggleFavorite("teams", "lal");
  assert.equal(calls, 1);
});

test("storage events synchronize tabs, ignore unrelated keys, and handle clear", async () => {
  const api = await store();
  const unsubscribe = api.subscribeFavorites(() => {});
  function emit(key, newValue) {
    const event = new Event("storage");
    Object.assign(event, { key, newValue, storageArea: api.storage });
    api.browser.dispatchEvent(event);
  }
  emit("unrelated", '{"teams":["bad"]}');
  assert.deepEqual(api.getFavoritesSnapshot().teams, []);
  emit(api.FAVORITES_STORAGE_KEY, '{"teams":["lal"],"players":["gsw:123"]}');
  assert.deepEqual(api.getFavoritesSnapshot().teams, ["lal"]);
  assert.deepEqual(api.getFavoritesSnapshot().players, ["gsw:123"]);
  emit(null, null);
  assert.deepEqual(api.getFavoritesSnapshot().teams, []);
  unsubscribe();
});

test("resubscribing picks up storage edits missed while controls were unmounted", async () => {
  const api = await store();
  const unsubscribe = api.subscribeFavorites(() => {});
  assert.deepEqual(api.getFavoritesSnapshot().teams, []);
  unsubscribe();
  api.storage.setItem(api.FAVORITES_STORAGE_KEY, '{"teams":["other-tab"],"players":[]}');
  const stop = api.subscribeFavorites(() => {});
  assert.deepEqual(api.getFavoritesSnapshot().teams, ["other-tab"]);
  stop();
});
