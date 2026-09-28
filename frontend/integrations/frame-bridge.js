/* Auth stays in memory. Parent identity is checked before receiving the token. */
(()=>{
  const config=window.__edenFrame,nativeFetch=window.fetch.bind(window);
  let token='',parentOrigin='',release;
  const ready=new Promise(resolve=>{release=resolve;});
  const allowed=new Set(config.origins.concat(location.origin));
  if(parent===window){
    document.addEventListener('DOMContentLoaded',()=>{
      const gate=document.createElement('div');
      gate.style.cssText='position:fixed;inset:0;z-index:999999;display:grid;place-items:center;background:#f5f0e8f5;color:#766c63;font:15px sans-serif';
      gate.innerHTML='<form style="max-width:300px;padding:28px;background:#fff;border-radius:20px"><h2>欢迎回到花园</h2><p>输入你的服务连接码。</p><input aria-label="服务连接码" type="password" required autocomplete="off" style="box-sizing:border-box;width:100%;padding:12px;border:1px solid #ddd;border-radius:8px"><button style="padding:10px 20px;margin-top:16px">进入</button><p role="status"></p></form>';
      document.body.append(gate);
      gate.querySelector('form').onsubmit=async event=>{event.preventDefault();const value=gate.querySelector('input').value.trim();try{const response=await nativeFetch('/eden/status',{headers:{Authorization:'Bearer '+value}});if(!response.ok)throw Error('连接码不正确');token=value;parentOrigin=location.origin;release();gate.remove();}catch(e){gate.querySelector('[role=status]').textContent=e.message;}};
    });
  }
  window.addEventListener('message',event=>{
    if(event.source!==parent||!allowed.has(event.origin)||event.data?.type!=='eden:connect'||typeof event.data.token!=='string')return;
    token=event.data.token;parentOrigin=event.origin;release();
  });
  // A ready signal carries no secret. `capacitor://` is valid as an origin
  // identifier for the receiver but not as a postMessage targetOrigin in
  // every Chromium build; the parent checks both source and origin.
  if(parent!==window)parent.postMessage({type:'eden:ready',service:config.service},'*');
  window.fetch=async(input,init={})=>{
    const request=input instanceof Request?input:null;
    let url=new URL(request?request.url:String(input),location.href);
    if(url.origin!==location.origin)return nativeFetch(input,init);
    if(!url.pathname.startsWith(config.prefix+'/'))url.pathname=config.prefix+url.pathname;
    await ready;
    const headers=new Headers(init.headers||request?.headers);headers.set('Authorization','Bearer '+token);
    const response=await nativeFetch(request?new Request(url,request):url,{...init,headers});
    if(response.ok&&(init.method||request?.method||'GET').toUpperCase()==='POST'){
      if(/\/api\/rooms(?:\/[^/]+\/(?:move|invitation|join|messages))?$/.test(url.pathname)||/\/bar\/(?:serve|note|result)$|\/barflight\/(?:start|pick)$/.test(url.pathname)){
        parent.postMessage({type:'eden:activity',service:config.service},parentOrigin);
      }
    }
    return response;
  };
})();
