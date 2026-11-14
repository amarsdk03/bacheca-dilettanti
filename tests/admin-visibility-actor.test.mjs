import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {createModerationFixture} from './helpers/admin-moderation-fixture.mjs';
import {listId as id, listActor as actor} from './helpers/admin-announcements-fixture.mjs';

const read = name => readFileSync(new URL(`../supabase/migrations/${name}.sql`, import.meta.url), 'utf8');
test('current visibility trigger stamps Auth ID; repair restores internal actor and atomic moderation', async t => {
  const h = await createModerationFixture();
  t.after(() => h.db.close());
  await h.reset();
  await h.insert(1000);
  await h.child(id(1000), 'annuncio_giocatore');
  const source = read('20261005140622_profile_follow_identities_and_activity');
  const start = source.indexOf('create or replace function private.stamp_annuncio_visibility_update()');
  await h.db.exec(source.slice(start, source.indexOf('$$;', start) + 3));
  let detail = await h.detail(id(1000));
  assert.equal((await h.moderate(id(1000), 'hide', detail.contentFingerprint, 'Test')).status, 'ok');
  const row = async () => (await h.db.query('select nascosto, ultima_modifica_da from public.annuncio where uuid=$1', [id(1000)])).rows[0];
  assert.equal((await row()).ultima_modifica_da, actor.authId);
  // Reproduce a schema with the intended internal-user foreign key.
  await h.db.query('update public.annuncio set ultima_modifica_da=$1', [actor.userId]);
  await h.db.exec('alter table public.annuncio add constraint test_visibility_actor_fk foreign key (ultima_modifica_da) references public.utente(utente_uuid)');
  detail = await h.detail(id(1000));
  assert.equal((await h.moderate(id(1000), 'show', detail.contentFingerprint)).status, 'unavailable');
  assert.equal((await row()).nascosto, true);
  await h.db.exec(read('20261114204136_fix_announcement_visibility_actor'));
  for (const operation of ['show', 'hide']) {
    detail = await h.detail(id(1000));
    assert.equal((await h.moderate(id(1000), operation, detail.contentFingerprint, operation === 'hide' ? 'Test' : null)).status, 'ok');
    assert.deepEqual(await row(), {nascosto:operation === 'hide', ultima_modifica_da:actor.userId});
  }
});
