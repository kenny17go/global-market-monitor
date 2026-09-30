const CACHE='gmm-push-v1';
self.addEventListener('push',event=>{
  let data={};try{data=event.data?event.data.json():{}}catch(e){data={body:event.data?.text()||''}}
  const title=data.title||'Global Market Monitor';
  const options={body:data.body||'市場警示已觸發',icon:'market-icon-192.png',badge:'market-icon-192.png',data:{url:data.url||'./'},tag:data.tag||'gmm-alert'};
  event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||'./',self.location.origin).href;
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const c of list){if(c.url.startsWith(self.location.origin)&&'focus'in c){c.navigate(target);return c.focus()}}
    return clients.openWindow?clients.openWindow(target):undefined;
  }));
});