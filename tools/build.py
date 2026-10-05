"""Build the English MBA notebook. Python standard library only.
Run from any directory: python tools/build.py
Edit content/s1.json ... s6.json to maintain the study guide.
Original slide images and handwritten notes are not modified by this script.
"""
from pathlib import Path
from html import escape
import json, posixpath

ROOT = Path(__file__).resolve().parents[1]
SITE = json.loads((ROOT/'content/site.json').read_text(encoding='utf-8'))
TOPICS = sum([json.loads((ROOT/f'content/s{n}.json').read_text(encoding='utf-8')) for n in range(1,7)], [])
SLIDES = json.loads((ROOT/'content/slides.json').read_text(encoding='utf-8'))
SLIDE_MAP = {(s['session'],s['page']):s for s in SLIDES}
CCS = '/mba/courses/ccs/'
SEARCH = []
COUNT = 0

def e(x): return escape(str(x), quote=True)
def url(p,target):
    if target.startswith(('https://','http://')): return target
    path,sep,frag = target.partition('#')
    if path==p and sep: return '#'+frag
    rel = posixpath.relpath(path or p,p)
    if path.endswith('/') or not path: rel = './' if rel=='.' else rel+'/'
    return rel+('#'+frag if sep else '')
def a(p,target,label,cls=''): return f'<a href="{e(url(p,target))}" class="{cls}">{label}</a>'
def asset(p,name): return url(p,'/mba/assets/'+name)
def topic_url(t): return CCS+t['slug']+'/'
def slide_url(s): return CCS+f'slides/s{s["session"]}/{s["page"]:03d}/'
def note_url(n): return f'/mba/notes/ccs/{n:02d}/'
def session_url(n): return CCS+f's{n}/'
def index(p,title,kind,text): SEARCH.append(dict(url=p.removeprefix('/mba/'),title=title,type=kind,en='CCS' if '/ccs/' in p else 'MBA',text=text))
def crumbs(p,items): return '<nav class="breadcrumb" aria-label="Breadcrumb">'+ ' <span aria-hidden="true">/</span> '.join(a(p,u,e(t)) if u else f'<span aria-current="page">{e(t)}</span>' for t,u in items)+'</nav>'
def top(label,title,right=''): return f'<div class="section-top"><div><span class="eyebrow">{e(label)}</span><h2>{e(title)}</h2></div>{right}</div>'
def head(label,title,intro): return f'<div class="page-head"><span class="eyebrow dot">{e(label)}</span><h1>{e(title)}</h1><p class="intro">{e(intro)}</p></div>'
def subnav(p): return '<nav class="subnav" aria-label="Course navigation">'+''.join(a(p,u,t) for t,u in [('Overview',CCS),('Sessions',CCS+'#sessions'),('Frameworks',CCS+'#knowledge'),('Original slides',CCS+'slides/'),('Handwritten notes','/mba/notes/')])+'</nav>'
def bullet(items,ordered=False):
    tag='ol' if ordered else 'ul'
    return f'<{tag}>'+''.join('<li>'+e(x)+'</li>' for x in items)+f'</{tag}>'
def topic_card(p,t): return f'<a class="topic-card" data-topic-session="{t["session"]}" href="{e(url(p,topic_url(t)))}"><span class="eyebrow">S{t["session"]:02d} / {e(t["tag"])}</span><h3>{e(t["title"])}</h3><p>{e(t["summary"])}</p><span class="go">Read the framework <span aria-hidden="true">↗</span></span></a>'
def course_card(p,c):
    return a(p,'/mba/courses/'+c['slug']+'/',f'<div class="card-top"><span class="course-code">{e(c["code"])}</span><span class="status">{"Ready to explore" if c["ready"] else "To be added"}</span></div><h3>{e(c["title"])}</h3><p class="card-desc">{e(c["desc"])}</p><div class="card-foot"><span>{"6 sessions · 42 frameworks" if c["ready"] else "First priority" if c["priority"]==1 else "Next chapter"}</span><span aria-hidden="true">↗</span></div>','course-card'+(' ready' if c['ready'] else ''))
def note_links(p,numbers): return '<div class="note-links">'+''.join(a(p,note_url(n),f'Notebook page {n:02d} ↗') for n in numbers)+'</div>'
def slide_thumb(p,s): return a(p,slide_url(s),f'<img loading="lazy" src="{asset(p,"slides/"+s["id"]+"-thumb.webp")}" width="{s["width"]}" height="{s["height"]}" alt="Original slide: {e(s["title"])}"><span class="tiny">SESSION {s["session"]} · PAGE {s["page"]}</span><h3>{e(s["title"])}</h3>','slide-tile')
def zoom_dialog(p,path,label): return f'<dialog id="zoom-dialog" class="zoom-dialog" aria-label="{e(label)}"><div class="zoom-toolbar"><strong>Original page</strong><div><button data-zoom-out aria-label="Zoom out">−</button><span id="zoom-value" aria-live="polite">100%</span><button data-zoom-in aria-label="Zoom in">＋</button><button data-close-zoom>Close ×</button></div></div><div class="zoom-body"><img id="zoom-image" src="{asset(p,path)}" alt="{e(label)}"></div></dialog>'
def layout(p,title,description,body,active='courses',extra=''):
    global COUNT
    nav=''.join(a(p,u,t).replace('class=""','aria-current="page"' if active==key else '') for key,u,t in [('home','/mba/','My MBA'),('courses','/mba/courses/','Courses'),('notes','/mba/notes/','Notebook')])
    search='<dialog id="search-dialog" class="search-dialog" aria-labelledby="search-title"><div class="search-top"><h2 id="search-title">Search the notebook</h2><button class="icon-button" data-close-search aria-label="Close search">×</button></div><div class="search-form"><label for="search-input">Find a framework, concept or original slide</label><input id="search-input" class="search-input" type="search" maxlength="120" placeholder="Try Five Forces, VRINO or Ansoff" autocomplete="off"></div><div class="search-results"><p id="search-status" class="search-status" role="status"></p><div id="search-results"></div></div></dialog>'
    html=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{e(title)} · GRIT36 MBA</title><meta name="description" content="{e(description)}"><meta name="theme-color" content="#f5f4ed"><meta name="robots" content="noindex, nofollow"><link rel="canonical" href="https://grit36.com{p}"><link rel="icon" href="{asset(p,'logo.png')}"><link rel="stylesheet" href="{asset(p,'site.css')}?v=1.1"><script defer src="{asset(p,'search-index.js')}?v=1.1"></script><script defer src="{asset(p,'site.js')}?v=1.1"></script></head><body><a class="skip" href="#main">Skip to content</a><header class="header"><div class="wrap header-row"><a class="brand" href="{url(p,'/mba/')}" aria-label="GRIT36 MBA home"><img src="{asset(p,'logo.png')}" width="43" height="43" alt=""><span><strong>GRIT36</strong><small>PASSION &amp; PERSEVERANCE</small></span><span class="brand-separator" aria-hidden="true"></span><span class="brand-edition">MBA NOTES</span></a><button class="menu-button" aria-expanded="false" aria-controls="main-navigation">Menu ＋</button><nav id="main-navigation" class="main-nav" aria-label="Main navigation">{nav}<button class="nav-search" data-search>Search <span aria-hidden="true">⌕</span></button></nav></div></header><main id="main">{body}</main><footer><div class="wrap footer-row"><div><strong>GRIT36</strong> &nbsp; / &nbsp; A PERSONAL MBA NOTEBOOK</div><div class="footer-links">{a(p,'/mba/','2023—2024 · Amsterdam MBA')}{a(p,'/','Main website ↗')}<span>Version 1.1</span></div></div></footer>{search}{extra}<noscript><p class="wrap">All study guides and original pages can be read without JavaScript. Search, filters and the zoom viewer require JavaScript; image links still work.</p></noscript></body></html>'''
    dest=ROOT/p.lstrip('/')/'index.html'; dest.parent.mkdir(parents=True,exist_ok=True); dest.write_text(html,encoding='utf-8'); COUNT+=1

def home():
    p='/mba/'
    body=f'''<section class="hero wrap"><span class="eyebrow dot">THE AMSTERDAM MBA / 2023—2024</span><div class="hero-grid"><div class="hero-copy"><h1>A year of learning.<br><em>A notebook for life.</em></h1><p>In 2023–2024, I stepped away from work for a full-time MBA. This is my place to revisit what mattered: the ideas, the frameworks and the pages I wrote by hand. A record of that year, with room to keep learning.</p><div class="hero-actions">{a(p,CCS,'Explore the first course ↗','button')}{a(p,'/mba/notes/','Open my notebook','text-link')}</div></div><a class="archive-art" href="{url(p,'/mba/notes/')}" aria-label="Explore my original handwritten notebook"><div class="art-top"><span>FROM MY NOTEBOOK</span><span>01 / CCS</span></div><div class="notebook-stack"><img class="sheet back" src="{asset(p,'notes/thumb-01.webp')}" width="480" height="681" alt="My handwritten strategy notes"><img class="sheet front" src="{asset(p,'notes/thumb-07.webp')}" width="480" height="685" alt="Hand-drawn portfolio matrices"><span class="art-sticker">Original pages.<br>Ongoing questions.</span></div><div class="art-caption"><span>9 PAGES, WRITTEN BY HAND</span><span>OPEN THE ARCHIVE ↗</span></div></a></div><div class="hero-bottom"><span><strong>06</strong> course sessions</span><span><strong>42</strong> frameworks &amp; concepts</span><span><strong>{len(SLIDES):02d}</strong> original slides online</span><span><strong>09</strong> handwritten pages</span></div></section>
<section class="section wrap border-top">{top('01 / The courses','Start with the ideas worth keeping',a(p,'/mba/courses/','All courses ↗','text-link'))}<button class="search-inline" data-search><span>Looking for a concept? Try Porter’s Five Forces.</span><span aria-hidden="true">⌕</span></button><div class="course-grid">{''.join(course_card(p,c) for c in SITE['courses'][:3])}</div></section>
<section class="section wrap">{top('02 / A few ways in','From a question to a framework')}<div class="topic-grid">{''.join(topic_card(p,next(t for t in TOPICS if t['slug']==slug)) for slug in ['five-forces','business-model','vrino'])}</div></section>
<section class="section wrap"><div class="archive-band"><a class="archive-preview" href="{url(p,note_url(1))}" aria-label="Read notebook page one"><img loading="lazy" src="{asset(p,'notes/thumb-01.webp')}" width="480" height="681" alt="The first original handwritten page"></a><div class="archive-copy"><span class="eyebrow">03 / The original pages</span><h2>Some ideas still<br>belong on paper.</h2><p>The arrows, crossed-out thoughts and handwritten connections are part of the memory. All nine pages remain in their original form, alongside a growing English study guide.</p>{a(p,'/mba/notes/','Explore the original notebook ↗','text-link')}</div></div></section>'''
    layout(p,'My MBA learning story','A personal review of a full-time MBA in 2023–2024: frameworks, original lecture pages and handwritten notes.',body,'home')

def courses():
    p='/mba/courses/'
    body='<div class="wrap">'+crumbs(p,[('My MBA','/mba/'),('Courses',None)])+head('The course collection','A curriculum to return to.','Three courses come first. Three more will follow as the foundations become stronger. Competitive & Corporate Strategy is the first course available to read.')+'<div class="course-grid">'+''.join(course_card(p,c) for c in SITE['courses'][:3])+'</div><p class="future-label">NEXT CHAPTER / After the core courses</p><div class="course-grid">'+''.join(course_card(p,c) for c in SITE['courses'][3:])+'</div></div>'
    layout(p,'Courses','Six courses in a growing personal MBA notebook.',body)
    for c in SITE['courses'][1:]:
        p='/mba/courses/'+c['slug']+'/'
        body='<div class="wrap">'+crumbs(p,[('My MBA','/mba/'),('Courses','/mba/courses/'),(c['code'],None)])+head(c['code']+' / To be added',c['title'],c['desc'])+f'<div class="callout"><h2>A place reserved for the next review.</h2><p>This course is on my learning roadmap. The review and original notes have not been added yet.</p>{a(p,CCS,"Explore Competitive &amp; Corporate Strategy ↗","text-link")}</div></div>'
        layout(p,c['title'],c['desc'],body)

def ccs():
    p=CCS
    session_cards=''.join(a(p,session_url(s['n']),f'<span class="session-num">{s["n"]:02d}</span><div><span class="tiny">{e(s["date"])}</span><h3>{e(s["title"])}</h3><p>{e(s["intro"])}</p></div><span aria-hidden="true">↗</span>','session-card') for s in SITE['sessions'])
    filter_html='<div class="filter-row"><label for="topic-filter">Filter by session <select id="topic-filter"><option value="">All sessions</option>'+''.join(f'<option value="{s["n"]}">S{s["n"]} · {e(s["title"])}</option>' for s in SITE['sessions'])+'</select></label><span class="tiny" id="topic-count" role="status">42 frameworks &amp; concepts</span></div>'
    body=f'<div class="wrap">{crumbs(p,[("My MBA","/mba/"),("Courses","/mba/courses/"),("CCS",None)])}<div class="course-hero">{head("Block 01 / September—October 2023","Competitive & Corporate Strategy","Why do firms outperform one another? Which businesses belong together? How can an organization renew itself? Six sessions connect these questions, from competitive advantage to strategic renewal.")}<div class="course-mark" aria-hidden="true">CCS</div></div><div class="meta course-meta"><span>6 sessions</span><span>42 frameworks &amp; concepts</span><span>{len(SLIDES)} original slides</span><span>9 handwritten pages</span></div>{subnav(p)}<section class="section" id="sessions">{top("01 / Six sessions","Follow the course") }<div class="session-list">{session_cards}</div></section><section class="section border-top" id="knowledge">{top("02 / The knowledge index","Go straight to a framework")}<button class="search-inline" data-search><span>Search concepts and original lecture text</span><span aria-hidden="true">⌕</span></button>{filter_html}<div class="topic-grid">'+''.join(topic_card(p,t) for t in TOPICS)+f'</div></section><div class="source-callout"><span class="eyebrow">03 / Read the source</span><h2>The original slides, right here.</h2><p>Selected theory pages from all six lectures are available as complete images, with a full-screen viewer and extracted text. The study guides are an edited explanation; the original pages retain the classroom wording and diagrams.</p>{a(p,CCS+"slides/","Browse all original slides ↗","button")}</div></div>'
    layout(p,'Competitive & Corporate Strategy','42 detailed frameworks across six lectures, with original course pages and handwritten notes.',body)
    index(p,'Competitive & Corporate Strategy','Course','CCS industry advantage scope business model renewal')
    for s in SITE['sessions']:
        p=session_url(s['n']); ts=[t for t in TOPICS if t['session']==s['n']]
        body=f'<div class="wrap">{crumbs(p,[("Courses","/mba/courses/"),("CCS",CCS),("Session "+str(s["n"]),None)])}{head("Session "+str(s["n"])+" / "+s["date"],s["title"],s["intro"])}{subnav(p)}<section class="section"><div class="session-intro"><div><span class="eyebrow">What to take away</span>{bullet(s["takeaways"])}</div><div><span class="eyebrow">From my notebook</span>{note_links(p,s["notes"])}</div></div>{top("The reading path",str(len(ts))+" frameworks & concepts")}<div class="topic-grid">'+''.join(topic_card(p,t) for t in ts)+'</div></section></div>'
        layout(p,s['title'],s['intro'],body)
        index(p,s['title'],'Session',s['intro']+' '+' '.join(s['takeaways']))

def diagram(t):
    kind=t.get('diagram')
    if not kind: return ''
    if kind=='forces':
        cells=[('entrants','Threat of new entrants','Entry barriers &amp; expected response'),('suppliers','Supplier power','Input costs &amp; switching costs'),('rivalry','Rivalry among competitors','Pressure on industry profitability'),('buyers','Buyer power','Price, service &amp; negotiation'),('substitutes','Threat of substitutes','Other ways to meet the same need')]
        return '<figure class="framework-diagram"><div class="forces-map">'+''.join(f'<div class="force {cl}"><strong>{title}</strong><span>{sub}</span></div>' for cl,title,sub in cells)+'</div><figcaption>Porter’s Five Forces · A redrawn study map. The five forces describe industry structure, not just a list of competitors.</figcaption></figure>'
    if kind=='canvas':
        cells=[('partners','Key partnerships'),('activities','Key activities'),('resources','Key resources'),('value','Value propositions'),('relationships','Customer relationships'),('channels','Channels'),('segments','Customer segments'),('costs','Cost structure'),('revenues','Revenue streams')]
        return '<figure class="framework-diagram"><div class="canvas-map">'+''.join(f'<div class="canvas-{cl}"><strong>{title}</strong></div>' for cl,title in cells)+'</div><figcaption>Business Model Canvas · Nine connected building blocks. Definitions and prompts follow below.</figcaption></figure>'
    settings={
    'digital':('Business design →',['Value chain','Ecosystem'],['Complete customer knowledge','Partial customer knowledge'],['Omnichannel business','Ecosystem driver','Supplier','Modular producer']),
    'transformation':('Source of change →',['Strategy-driven','Customer-driven'],['Renewal / exploration','Replication / exploitation'],['Explore and dominate','Explore and connect','Exploit and improve','Exploit and connect']),
    'ansoff':('Products →',['Existing products','New products'],['Existing markets','New markets'],['Market penetration','Product development','Market development','Diversification']),
    'bcg':('Relative market share →',['High share','Low share'],['High market growth','Low market growth'],['Stars','Question marks','Cash cows','Dogs / pets'])}
    title,cols,rows,cells=settings[kind]
    return f'<figure class="framework-diagram"><div class="matrix-title">{title}</div><div class="matrix-map"><div></div><div class="axis">{cols[0]}</div><div class="axis">{cols[1]}</div><div class="axis row-axis">{rows[0]}</div><div class="matrix-cell">{cells[0]}</div><div class="matrix-cell">{cells[1]}</div><div class="axis row-axis">{rows[1]}</div><div class="matrix-cell">{cells[2]}</div><div class="matrix-cell">{cells[3]}</div></div><figcaption>Redrawn study map · Read the distinctions and qualifications below; consult the original slide for its classroom presentation.</figcaption></figure>'

def topics():
    for t in TOPICS:
        p=topic_url(t); refs=[SLIDE_MAP[(s,n)] for s,n,_ in t['slides']]; first=refs[0]
        table='<div class="table-scroll" tabindex="0" role="region" aria-label="'+e(t['title'])+' comparison table"><table class="framework-table"><thead><tr>'+''.join('<th scope="col">'+e(h)+'</th>' for h in t['table']['headers'])+'</tr></thead><tbody>'+''.join('<tr>'+''.join(('<th scope="row">' if i==0 else '<td data-label="'+e(t['table']['headers'][i])+'">')+e(c)+('</th>' if i==0 else '</td>') for i,c in enumerate(row))+'</tr>' for row in t['table']['rows'])+'</tbody></table></div>'
        sections=''.join(f'<section class="detail-section"><h3>{e(s["title"])}</h3><p>{e(s["body"])}</p></section>' for s in t['sections'])
        first_image=f'<img loading="lazy" src="{asset(p,"slides/"+first["id"]+".webp")}" width="{first["width"]}" height="{first["height"]}" alt="{e(first["title"])} — original lecture page">'
        original=f'<section id="original" class="reading-section"><span class="eyebrow source-label">Original course material</span><h2>Read the classroom original</h2><p class="muted">Complete pages from the supplied lecture slides. Select a page to read, enlarge or browse its extracted text. Page numbers refer to the PDF’s physical page order.</p><figure class="original-feature">{a(p,slide_url(first),first_image)}<figcaption>Session {first["session"]} · Page {first["page"]} · {e(first["title"])} {a(p,slide_url(first),"Open reader ↗","text-link")}</figcaption></figure><div class="slide-grid topic-slides">'+''.join(slide_thumb(p,s) for s in refs[1:])+'</div></section>'
        external=''
        if t.get('external'): external='<div class="external-source"><h3>Further reading</h3>'+''.join(f'<p>{a(p,r["url"],e(r["title"]),"text-link")} — {e(r["note"])}</p>' for r in t['external'])+'</div>'
        side='<aside class="study-aside"><span class="eyebrow">On this page</span><nav aria-label="On this page">'+''.join(f'<a href="#{id}">{label}</a>' for id,label in [('framework','The framework'),('details','Key distinctions'),('application','How to use it'),('recall','Check your understanding'),('original','Original slides')])+f'</nav><div class="aside-note"><span class="eyebrow">Handwritten archive</span>{note_links(p,t["notes"])}</div><div class="aside-note">{a(p,session_url(t["session"]),f"← Back to session {t['session']}","text-link")}</div></aside>'
        body=f'<div class="wrap">{crumbs(p,[("Courses","/mba/courses/"),("CCS",CCS),("S"+str(t["session"]),session_url(t["session"])),(t["title"],None)])}{head("Session "+str(t["session"])+" / "+t["tag"],t["title"],t["summary"])}<div class="guide-label"><span>ENGLISH STUDY GUIDE</span> Edited explanation based on the course. Original wording and figures appear below.</div><div class="study-layout"><article class="study-body"><section id="framework" class="reading-section"><h2>The framework</h2>{diagram(t)}{table}</section><section id="details" class="reading-section"><h2>Key distinctions</h2>{sections}</section><section id="application" class="reading-section"><h2>How to use it</h2>{bullet(t["steps"],True)}<div class="watchout"><h3>Keep in mind</h3><p>{e(t["limits"])}</p></div></section><section id="recall" class="reading-section recall-box"><span class="eyebrow">Pause &amp; recall</span><h2>{e(t["recall"][0])}</h2><details><summary>Reveal the explanation</summary><p>{e(t["recall"][1])}</p></details></section>{original}{external}</article>{side}</div><section class="section border-top">{top("Continue reading","In the same session")}<div class="topic-grid">'+''.join(topic_card(p,x) for x in TOPICS if x['session']==t['session'] and x!=t)+'</div></section></div>'
        layout(p,t['title'],t['summary'],body)
        index(p,t['title'],'Study guide',' '.join([t['summary'],t['tag'],str(t['table']),str(t['sections']),str(t['steps']),t['limits']]))

def slides():
    p=CCS+'slides/'
    filt='<div class="filter-row"><label for="slide-filter">Filter by session <select id="slide-filter"><option value="">All sessions</option>'+''.join(f'<option value="{s["n"]}">S{s["n"]} · {e(s["title"])}</option>' for s in SITE['sessions'])+f'</select></label><span class="tiny" id="slide-count" role="status">{len(SLIDES)} original pages</span></div>'
    body=f'<div class="wrap">{crumbs(p,[("Courses","/mba/courses/"),("CCS",CCS),("Original slides",None)])}{head("The source collection","Original slides. Always within reach.","The core theory pages from six lectures, available directly on this website. Original wording, diagrams and annotations are retained. Cases and classroom exercises are not the focus of this collection.")}{subnav(p)}<section class="section"><button class="search-inline" data-search><span>Search frameworks and extracted slide text</span><span aria-hidden="true">⌕</span></button>{filt}<div class="slide-grid library-grid">'+''.join('<div data-slide-session="'+str(s['session'])+'">'+slide_thumb(p,s)+'</div>' for s in SLIDES)+'</div></section></div>'
    layout(p,'Original lecture slides',f'{len(SLIDES)} original theory pages from six CCS lectures, readable online.',body)
    for s in SLIDES:
        p=slide_url(s); n=SLIDES.index(s); prev=SLIDES[n-1] if n else None; nxt=SLIDES[n+1] if n+1<len(SLIDES) else None
        related=[t for t in TOPICS if any(sn==s['session'] and pn==s['page'] for sn,pn,_ in t['slides'])]
        pager='<nav class="pager" aria-label="Original slide pages">'+(a(p,slide_url(prev),'← Previous page') if prev else '<span></span>')+a(p,CCS+'slides/','All original slides')+(a(p,slide_url(nxt),'Next page →') if nxt else '<span></span>')+'</nav>'
        path='slides/'+s['id']+'.webp'
        body=f'<div class="wrap">{crumbs(p,[("CCS",CCS),("Original slides",CCS+"slides/"),("S"+str(s["session"])+" · Page "+str(s["page"]),None)])}{head("Original course material / Session "+str(s["session"])+" · Page "+str(s["page"]),s["title"],"An unedited view of the complete original lecture page. The descriptive page title is added for navigation.")}<div class="viewer-tools"><button class="button" data-open-zoom>Enlarge original page ⤢</button>{a(p,"/mba/assets/"+path,"Open image ↗","text-link")}</div><figure class="slide-reader"><img src="{asset(p,path)}" width="{s["width"]}" height="{s["height"]}" alt="{e(s["title"])} — original slide from session {s["session"]}, page {s["page"]}"><figcaption>Source: {e(s["source"])} · Physical PDF page {s["page"]}</figcaption></figure>{pager}<div class="source-lower"><section><span class="eyebrow">Make sense of the source</span><h2>Read the related study guide</h2><div class="source-related">'+''.join(a(p,topic_url(t),e(t['title'])+' ↗','text-link') for t in related)+'</div></section><details class="transcript"><summary>Extracted original text</summary><p class="tiny">Automatic extraction from the original file. Reading order may differ, diagrams may be absent, and hidden text may be included. The image above is the visual source of record.</p><pre>'+e(s['text'] or 'No extractable text. Please read the original image above.')+'</pre></details></div></div>'
        layout(p,s['title']+' — original slide','Read the original CCS lecture page online.',body,extra=zoom_dialog(p,path,s['title']))
        index(p,s['title']+f' — S{s["session"]} p.{s["page"]}','Original slide',s['text'])

def notes():
    p='/mba/notes/'
    pdf='notes/Block1-CCS备考笔记20231024.pdf'
    tiles=''.join(a(p,note_url(n),f'<figure><img loading="lazy" src="{asset(p,f"notes/thumb-{n:02d}.webp")}" width="480" height="680" alt="Original handwritten notebook page {n}"><figcaption><span class="eyebrow">Page {n:02d} / CCS</span><h2>{e(title)}</h2></figcaption></figure>','note-tile') for n,title in enumerate(SITE['notes'],1))
    body=f'<div class="wrap">{crumbs(p,[("My MBA","/mba/"),("Notebook",None)])}{head("Written by hand / October 2023","The pages that started it.","Nine original pages of my CCS revision notes. The handwriting, diagrams and bilingual annotations remain as they were. The English guides sit alongside them, without replacing the originals.")}<div class="viewer-tools">{a(p,"/mba/assets/"+pdf,"Open the complete original PDF ↗","button")}<span class="tiny">9 pages · 37.2 MB · Original file unchanged</span></div><div class="note-grid">{tiles}</div></div>'
    layout(p,'The handwritten notebook','Nine complete original handwritten CCS revision pages.',body,'notes')
    for n,title in enumerate(SITE['notes'],1):
        p=note_url(n); path=f'notes/page-{n:02d}.webp'; related=[t for t in TOPICS if n in t['notes']]
        pager='<nav class="pager" aria-label="Notebook pages">'+(a(p,note_url(n-1),'← Previous page') if n>1 else '<span></span>')+a(p,'/mba/notes/','All notebook pages')+(a(p,note_url(n+1),'Next page →') if n<9 else '<span></span>')+'</nav>'
        body=f'<div class="wrap">{crumbs(p,[("My MBA","/mba/"),("Notebook","/mba/notes/"),(f"Page {n:02d}",None)])}{head(f"Original handwriting / Page {n:02d} of 09",title,"The original page is preserved as written. Related English guides are listed alongside it.")}<div class="viewer-tools"><button class="button" data-open-zoom>Enlarge original page ⤢</button>{a(p,"/mba/assets/"+path,"Open image ↗","text-link")}{a(p,"/mba/assets/"+pdf,"Original PDF ↗","text-link")}</div><div class="viewer"><figure class="scan-frame"><img src="{asset(p,path)}" alt="Complete original handwritten notebook page {n}"></figure><aside class="viewer-aside"><span class="eyebrow">Related study guides</span><div class="source-related">'+''.join(a(p,topic_url(t),e(t['title'])+' ↗','text-link') for t in related)+f'</div></aside></div>{pager}</div>'
        layout(p,f'Notebook page {n:02d}: {title}','Original handwritten CCS notes with related English guides.',body,'notes',zoom_dialog(p,path,f'Original handwritten page {n}'))
        index(p,f'Notebook {n:02d}: {title}','Handwritten page',title)

home(); courses(); ccs(); topics(); slides(); notes()
(ROOT/'mba/assets/search-index.js').write_text('window.MBA_SEARCH = '+json.dumps(SEARCH,ensure_ascii=False).replace('</','<\\/')+';\n',encoding='utf-8')
print(f'Built {COUNT} English pages, {len(TOPICS)} study guides, {len(SLIDES)} original slide readers and {len(SEARCH)} search entries.')
