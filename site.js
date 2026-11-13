/* ================== SITE CONFIG: edit these ================== */
const SITE_CONFIG = {
  phone:     "+15105529481",                        // digits only, with country code
  email:     "ochuko@agentochuko.com",
  calendly:  "https://calendly.com/ochuko-agentochuko/30min",
  // Your IDX home search (sfbayhomesearch.com)
  idxUrl:    "https://search.sfbayhomesearch.com/search/map",
  // Which cities each search button covers
  idxRegions: {
    "San Francisco": ["San Francisco"],
    "Peninsula":     ["Burlingame","Hillsborough","San Mateo","San Carlos","Belmont","Redwood City","Menlo Park","Atherton","Palo Alto"],
    "Oakland":       ["Oakland"],
    "Fremont":       ["Fremont"],
    "San Jose":      ["San Jose"]
  },
  // Paste a Formspree, Basin, or Zapier webhook URL to receive leads.
  // Leave blank and the form opens a pre-filled email instead.
  formEndpoint: "https://formspree.io/f/xzerpelb",
  instagram: "https://www.instagram.com/ochuko_realtor/",
  facebook:  "https://www.facebook.com/OchukoEkuke",
  tiktok:    "https://www.tiktok.com/@ochuko_realtor",
  linkedin:  "https://www.linkedin.com/in/agentochuko/"
};

/* Community cards on the homepage: edit, add or remove freely */
const COMMUNITIES = [
  {slug:"san-francisco", name:"San Francisco", tag:"City living", text:"Victorians, view condos and 40-plus distinct neighborhoods, from Pacific Heights to Noe Valley.", img:"https://images.unsplash.com/photo-1685636916180-fc0ee6ad581b?auto=format&fit=crop&w=1000&q=80", g:["#9BA8A6","#5F6E6C"]},
  {slug:"peninsula",     name:"The Peninsula", tag:"Burlingame to Palo Alto", text:"Leafy towns with strong schools along Caltrain, between the city and Silicon Valley.", img:"https://images.unsplash.com/photo-1646420490301-a87d95537ca8?auto=format&fit=crop&w=1000&q=80", g:["#A4A58A","#676A4F"]},
  {slug:"oakland",       name:"Oakland",       tag:"East Bay", text:"Craftsman bungalows, hillside homes with bay views, and a dining scene to match.", img:"https://images.unsplash.com/photo-1761697222046-29a9d3d5d864?auto=format&fit=crop&w=1000&q=80", g:["#B7A190","#7A6352"]},
  {slug:"fremont",       name:"Fremont",       tag:"Near Silicon Valley", text:"Sought-after schools, newer construction and two BART stations near the tech corridor.", img:"https://images.unsplash.com/photo-1601871661311-c9e723ef9717?auto=format&fit=crop&w=1000&q=80", g:["#C9B79C","#8C7759"]},
  {slug:"san-jose",      name:"San Jose",      tag:"Silicon Valley", text:"The South Bay's largest city: Willow Glen charm, Almaden space and a growing downtown.", img:"https://images.unsplash.com/photo-1758849015881-881294ff3002?auto=format&fit=crop&w=1000&q=80", g:["#8FA3B0","#556B7A"]}
];

/* ============================================================== */
(function(){
  const $ = (s,c=document)=>c.querySelector(s), $$ = (s,c=document)=>[...c.querySelectorAll(s)];
  const C = SITE_CONFIG;
  const yr=$("#yr"); if(yr) yr.textContent = new Date().getFullYear();

  // Contact links
  $$("[data-tel]").forEach(a=>a.href="tel:"+C.phone);
  $$("[data-sms]").forEach(a=>a.href="sms:"+C.phone);
  $$("[data-mail]").forEach(a=>a.href="mailto:"+C.email);
  // Until Calendly / IDX are set up, those buttons fall back to the contact form
  const calReady=!C.calendly.includes("your-link"), idxReady=!C.idxUrl.includes("your-idx-provider");
  const toForm=(intent,area)=>{const s=$("#start");if(!s){location.href="index.html#start";return}
    const o=$(`.opt[data-v="${intent}"]`);if(o)o.click();if(area&&$("#areas"))$("#areas").value=area;s.scrollIntoView({behavior:"smooth"})};
  $$("[data-cal]").forEach(a=>{ if(calReady){a.href=C.calendly;a.target="_blank";a.rel="noopener"}
    else{a.href="#start";a.addEventListener("click",e=>{e.preventDefault();toForm("Exploring")})} });
  [["ig","instagram"],["fb","facebook"],["tt","tiktok"],["li","linkedin"]].forEach(([k,v])=>$$("[data-"+k+"]").forEach(a=>{a.href=C[v];a.target="_blank";a.rel="noopener"}));

  // Mobile nav
  const burger=$(".burger"), menu=$("nav ul");
  burger.addEventListener("click",()=>{const o=menu.classList.toggle("open");burger.setAttribute("aria-expanded",o)});
  $$("nav ul a").forEach(a=>a.addEventListener("click",()=>{menu.classList.remove("open");burger.setAttribute("aria-expanded","false")}));

  // Price option labels
  $$("#minP option, #maxP option").forEach(o=>{if(o.value){o.setAttribute("value",o.value);o.textContent=o.value<1e6?"$"+(o.value/1e3)+"K":"$"+(o.value/1e6)+"M"}});

  // Search
  $$("#regionChips .chip").forEach(c=>c.addEventListener("click",()=>{$$("#regionChips .chip").forEach(x=>x.classList.remove("on"));c.classList.add("on")}));
  const idx=(region)=>{
    const q=["s[orderBy]=sourceCreationDate%2Cdesc","s[page]=1"];
    (C.idxRegions[region]||[region]).forEach((city,i)=>q.push(`s[locations][${i}][city]=${encodeURIComponent(city)}`,`s[locations][${i}][state]=CA`));
    const v=id=>($("#"+id)||{}).value||"";
    if(v("minP")) q.push("s[minPrice]="+v("minP"));
    if(v("maxP")) q.push("s[maxPrice]="+v("maxP"));
    if(v("beds")) q.push("s[beds]="+v("beds"));
    return C.idxUrl+"?"+q.join("&");
  };
  $$("[data-idx]").forEach(a=>{ if(idxReady){a.href=idx(a.dataset.idx);a.target="_blank";a.rel="noopener"}
    else{a.href="#start";a.addEventListener("click",e=>{e.preventDefault();toForm("Buy",a.dataset.idx)})} });
  const sf=$("#search"); if(sf) sf.addEventListener("submit",e=>{
    e.preventDefault();
    if(idxReady) window.open(idx($("#regionChips .on").textContent),"_blank","noopener");
    else toForm("Buy",$("#regionChips .on").textContent);
  });

  // Communities (homepage only)
  const grid=$("#commGrid");
  if(grid){
    grid.innerHTML=COMMUNITIES.map(c=>`
      <a class="town" href="${c.slug}.html">
        <div class="img" style="background:linear-gradient(180deg,rgba(28,27,25,0) 55%,rgba(28,27,25,.45)),url('${c.img}') center/cover,linear-gradient(150deg,${c.g[0]},${c.g[1]})"><span>${c.tag}</span></div>
        <div class="body"><h3>${c.name}</h3><p>${c.text}</p><span class="more">Explore ${c.name} →</span></div>
      </a>`).join("");
  }

  // Lead form
  const lead=$("#lead");
  if(lead){
  const data={intent:"",guide:""}; let step=1;
  const pc=document.body.dataset.community; if(pc) $("#areas").value=pc;
  const steps=$$(".fstep"), bars=$$(".progress i"), next=$("#next"), back=$("#back"), skip=$("#skip"), err=$("#err");
  function go(n){
    step=n; steps.forEach(s=>s.classList.toggle("on",+s.dataset.step===n));
    bars.forEach((b,i)=>b.classList.toggle("on",i<Math.min(n,3)));
    back.style.visibility=(n>1&&n<4)?"visible":"hidden";
    skip.style.display=n===2?"inline":"none";
    next.textContent=n===3?"Send":"Continue";
    $("#fnav").style.display=n===4?"none":"flex";
    err.textContent="";
  }
  function pick(v){
    data.intent=v; $$(".opt").forEach(o=>o.classList.toggle("on",o.dataset.v===v));
  }
  $$(".opt").forEach(o=>o.addEventListener("click",()=>{pick(o.dataset.v);setTimeout(()=>go(2),180)}));
  $$("[data-intent]").forEach(a=>a.addEventListener("click",()=>{pick(a.dataset.intent);go(2)}));
  $$("[data-area]").forEach(a=>a.addEventListener("click",()=>{$("#areas").value=a.dataset.area;pick("Buy");go(2)}));
  $$("[data-guide]").forEach(b=>b.addEventListener("click",()=>{
    data.guide=b.dataset.guide; $("#guideName").textContent=data.guide; pick("Guide"); go(3);
    $("#start").scrollIntoView({behavior:"smooth"});
  }));
  back.addEventListener("click",()=>go(step-1));
  skip.addEventListener("click",()=>go(3));
  next.addEventListener("click",async()=>{
    if(step===1){ if(!data.intent){pick("Exploring")} return go(2); }
    if(step===2) return go(3);
    const name=$("#name").value.trim(), email=$("#email").value.trim();
    if(!name||!/^\S+@\S+\.\S+$/.test(email)){err.textContent="Please add your name and a valid email.";return}
    if(!$("#consent").checked){err.textContent="Please check the box so I can contact you.";return}
    const payload={intent:data.intent,guide:data.guide,name,email,phone:$("#phone").value,budget:$("#budget").value,
      timeline:$("#timeline").value,areas:$("#areas").value,financing:$("#financing").value,message:$("#msg").value,consent:"yes",source:location.href};
    if(C.formEndpoint){
      next.disabled=true; next.textContent="Sending…";
      try{
        const r=await fetch(C.formEndpoint,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(payload)});
        if(!r.ok) throw 0; go(4);
        if(window.fbq) fbq("track","Lead",{content_name:data.intent||"Contact"});
      }catch(e){err.textContent="Something went wrong. Please text or email me directly."}
      next.disabled=false; if(step===3) next.textContent="Send";
    }else{
      const body=Object.entries(payload).filter(([,v])=>v).map(([k,v])=>k+": "+v).join("\n");
      location.href="mailto:"+C.email+"?subject="+encodeURIComponent("Website inquiry: "+(data.intent||"General"))+"&body="+encodeURIComponent(body);
      go(4);
    }
  });

  }

  // Reveal on scroll
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}}),{threshold:.12});
  $$(".reveal").forEach(el=>io.observe(el));
})();
