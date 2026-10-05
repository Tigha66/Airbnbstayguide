/** Run with: pnpm --filter @stayguide/web exec tsx ../../scripts/seed.ts
 * Requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SEED_HOST_ID for an existing Auth user.
 */
import {createClient} from '../apps/web/node_modules/@supabase/supabase-js';
import {demoProperties} from '../packages/shared/src/index';
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY,user=process.env.SEED_HOST_ID;
if(!url||!key||!user)throw new Error('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SEED_HOST_ID');
const db=createClient(url,key);
const org='10000000-0000-4000-8000-000000000001';
async function checked<T>(result:{data:T;error:unknown}){if(result.error)throw result.error;return result.data}
await checked(await db.from('organizations').upsert({id:org,name:'The Good Stay',created_by:user}));
await checked(await db.from('org_members').upsert({organization_id:org,user_id:user,role:'owner'}));
await checked(await db.from('subscriptions').upsert({organization_id:org,plan:'pro',status:'active',quantity:2}));
for(const [i,p] of demoProperties.entries()){
 const id=`20000000-0000-4000-8000-00000000000${i+1}`;
 await checked(await db.from('properties').upsert({id,organization_id:org,name:p.name,slug:p.slug,location:p.location,cover:p.image,status:'published'}));
 for(const [j,s] of p.sections.entries())await checked(await db.from('guide_sections').upsert({id:`30000000-0000-4000-800${i}-00000000000${j+1}`,property_id:id,type:s.type,title:s.title,body_markdown:s.body,icon:s.icon,sort_order:j}));
 for(const [j,e] of p.extras.entries())await checked(await db.from('extras').upsert({id:`40000000-0000-4000-800${i}-00000000000${j+1}`,property_id:id,name:e.name,description:e.description,amount_cents:e.price,requires_approval:e.approval}));
 const thread=`50000000-0000-4000-8000-00000000000${i+1}`;
 await checked(await db.from('chat_threads').upsert({id:thread,property_id:id,escalated:true}));
 await checked(await db.from('chat_messages').upsert({id:`60000000-0000-4000-8000-00000000000${i+1}`,thread_id:thread,role:'user',content:'Can we leave our bags after checkout?'}));
}
console.log('Seeded demo organization, two properties, guides, extras, and sample conversations.');
