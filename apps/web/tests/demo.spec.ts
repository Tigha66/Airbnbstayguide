import {test,expect} from '@playwright/test';
test('host creates, edits, publishes and previews a local guide',async({page})=>{
 await page.goto('/dashboard');
 await expect(page.getByRole('heading',{name:/Good things start/})).toBeVisible();
 await page.getByRole('button',{name:'Create a guide'}).click();
 await page.getByLabel('Property name').fill('The Test Cottage');
 await page.getByLabel('City, country').fill('Porto, Portugal');
 await page.getByLabel('Your house manual').fill('Check-in is at 4 PM. The garden gate is on the left.');
 await page.getByRole('button',{name:'Create my guide'}).click();
 await expect(page.getByRole('heading',{name:'The Test Cottage'})).toBeVisible();
 await page.getByLabel('Section title').fill('A warm arrival');
 await page.getByRole('button',{name:'Publish guide',exact:true}).click();
 await page.getByRole('link',{name:'Guest preview'}).click();
 await expect(page.getByRole('heading',{name:'The Test Cottage',exact:true})).toBeVisible();
 await page.getByText('A warm arrival',{exact:true}).click();
 await expect(page.getByText('Check-in is at 4 PM. The garden gate is on the left.',{exact:true}).last()).toBeVisible();
 await page.reload();
 await expect(page.getByRole('heading',{name:'The Test Cottage',exact:true})).toBeVisible();
});
test('guest receives guide citations and an honest extras preview',async({page})=>{
 await page.goto('/demo');
 await page.getByRole('button',{name:'Concierge',exact:true}).click();
 await page.getByRole('button',{name:'When is checkout?'}).click();
 await expect(page.getByText('From your guide · Until next time')).toBeVisible();
 await page.getByLabel('Ask your concierge').fill('Write me a business plan');
 await page.getByRole('button',{name:'Send question'}).click();
 await expect(page.getByText('Outside the sample guide · No host has been contacted')).toBeVisible();
 await page.getByRole('button',{name:'Little extras',exact:true}).click();
 await page.getByRole('button',{name:'Request extra'}).first().click();
 await expect(page.getByRole('status')).toContainText('nothing was sent or charged');
});
test('share kit preserves selected property and generates a QR card',async({page})=>{
 await page.goto('/dashboard/properties');
 await page.getByRole('button',{name:'Share The Olive Grove'}).click();
 await expect(page.getByLabel('Your property')).toHaveValue('olive-grove');
 await page.getByRole('button',{name:'Generate QR card'}).click();
 await expect(page.getByRole('img',{name:'QR code for The Olive Grove'})).toBeVisible();
});
test('guest guide reloads offline after the service worker takes control',async({page,context})=>{
 await page.goto('/g/casa-serena');
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise<void>(resolve=>navigator.serviceWorker.addEventListener('controllerchange',()=>resolve(),{once:true}));await fetch(location.pathname,{headers:{Accept:'text/html'}});});
 await page.reload();
 await expect(page.getByRole('heading',{name:'Casa Serena',exact:true})).toBeVisible();
 await page.waitForFunction(async()=>{const cache=await caches.open('stayguide-public-guides-v1');return Boolean(await cache.match(location.pathname));});
 await context.setOffline(true);
 await page.reload();
 await expect(page.getByRole('heading',{name:'Casa Serena',exact:true})).toBeVisible();
 await expect(page.getByText('You’re offline. Your saved guide is still here.')).toBeVisible();
});
test('unconfigured live endpoints fail closed',async({request})=>{
 const me=await request.get('/api/v1/me');
 expect((await me.json()).user).toBeNull();
 for(const path of ['/api/v1/properties','/api/v1/inbox','/api/v1/analytics']){
  const result=await request.get(path);
  expect(result.status()).toBe(503);
  expect((await result.json()).code).toBe('SERVICE_NOT_CONFIGURED');
 }
 const chat=await request.post('/api/v1/guides/casa-serena/chat',{data:{message:'hi'}});
 expect(chat.status()).toBe(503);
 const webhook=await request.post('/api/stripe/webhook',{data:{type:'customer.subscription.created'}});
 expect(webhook.status()).toBe(503);
});
test('mobile dashboard and guest guide fit the viewport',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/dashboard');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 await page.getByRole('button',{name:'Open navigation'}).click();
 await page.getByRole('link',{name:'Properties',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Your properties',exact:true})).toBeVisible();
 await page.goto('/g/casa-serena');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
