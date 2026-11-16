import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {createDistributionFixture} from "./helpers/admin-distribution-fixture.mjs";

const migration=readFileSync(new URL("../supabase/migrations/20261116144004_admin_distribution_regional_channels.sql",import.meta.url),"utf8");

test("regional channel seed maps the 18 supplied destinations and preserves existing identities and archives",async()=>{
  const h=await createDistributionFixture();
  try {
    await h.db.exec(migration);
    const first=(await h.read("channels")).items;
    assert.equal(first.length,18);
    assert.equal(new Set(first.map(c=>c.url)).size,18);
    assert(!first.some(c=>["Basilicata","Molise"].includes(c.region)));
    for(const channel of first) {
      const label={"Friuli-Venezia Giulia":"Friuli","Trentino-Alto Adige":"Trentino AA","Valle d'Aosta":"Valle D'Aosta"}[channel.region]??channel.region;
      assert.equal(channel.name,`Annunci ${label} ⚽️ | Bacheca Dilettanti`);
      assert.equal(channel.active,true);
    }
    assert.equal(first.find(c=>c.region==="Lombardia").url,"https://www.whatsapp.com/channel/0029Vb7xXeP5Ui2WFON5760T");
    const archived=first.find(c=>c.region==="Abruzzo");
    await h.db.query("update private.distribution_channel_v1 set active=false,version=version+1 where id=$1",[archived.id]);
    const before=(await h.db.query("select * from private.distribution_channel_v1 order by id")).rows;
    await h.db.exec(migration);
    assert.deepEqual((await h.db.query("select * from private.distribution_channel_v1 order by id")).rows,before);
    assert.equal((await h.read("choices")).length,17);
  }finally{await h.db.close();}
});
