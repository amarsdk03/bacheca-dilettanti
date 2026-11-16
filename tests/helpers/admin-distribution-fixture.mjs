import {readFileSync} from "node:fs";
import {createCreationFixture} from "./admin-creation-fixture.mjs";
import {createPeopleFixture} from "./admin-people-fixture.mjs";
const read = name => readFileSync(new URL(`../../supabase/migrations/${name}.sql`, import.meta.url), "utf8");
export async function createDistributionFixture({beforeMigration} = {}) {
  const base = await createCreationFixture();
  try {
    await base.db.exec(read("20261111163837_admin_direct_approval_whatsapp_export"));
    const h = await createPeopleFixture({baseFixture: base});
    await h.reset();
    if (beforeMigration) await beforeMigration(h);
    await h.db.exec(read("20261116130709_admin_distribution_workspace"));
    return {...h, read: (op, q = {}) => h.call("admin_distribution_read_v1", [op, JSON.stringify(q)]), write: (op, q) => h.call("admin_distribution_write_v1", [op, JSON.stringify(q)])};
  } catch (e) {await base.db.close(); throw e;}
}
