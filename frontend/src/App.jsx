import React, { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CalendarPlus, AlertTriangle, CheckCircle2, WandSparkles, LogOut, Clock3, Trash2, RefreshCw, ShieldCheck, Zap, ChevronRight } from 'lucide-react'
import { request, getToken } from './api'

const today = () => new Date().toISOString().slice(0,10)
const emptyForm = { title:'', description:'', date:today(), start:'09:00', duration_minutes:60, priority:3, is_fixed:false, resource:'personal', window_start:'08:00', window_end:'20:00' }
function toLocalISO(date, time){ return `${date}T${time}:00` }
function App(){
  const [token,setToken] = useState(getToken())
  const [user,setUser] = useState(localStorage.getItem('tanglefix_name') || '')
  const [authMode,setAuthMode] = useState('login')
  const [auth,setAuth] = useState({email:'',password:'',full_name:''})
  const [events,setEvents] = useState([])
  const [form,setForm] = useState(emptyForm)
  const [solutions,setSolutions] = useState([])
  const [activeSolution,setActiveSolution] = useState(0)
  const [conflicts,setConflicts] = useState([])
  const [error,setError] = useState('')
  const [notice,setNotice] = useState('')
  const [loading,setLoading] = useState(false)
  const [selectedDate,setSelectedDate] = useState(today())
  const [tab,setTab] = useState('overview')

  async function load(){
    try {
      const [ev,cf] = await Promise.all([request('/api/events'),request('/api/scheduling/conflicts')])
      setEvents(ev); setConflicts(cf.conflicts || [])
    } catch(e){ setError(e.message) }
  }
  useEffect(()=>{ if(token) load() },[token])
  async function authenticate(e){
    e.preventDefault(); setError('')
    try{
      const path = authMode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const result = await request(path,{method:'POST',body:JSON.stringify(auth)})
      localStorage.setItem('tanglefix_token',result.access_token)
      localStorage.setItem('tanglefix_name',result.full_name)
      setToken(result.access_token); setUser(result.full_name); setNotice('Welcome to TangleFix.')
    }catch(e){setError(e.message)}
  }
  function logout(){localStorage.clear();setToken(null);setEvents([]);setSolutions([])}
  async function addEvent(e){
    e.preventDefault(); setError(''); setNotice('')
    const start = toLocalISO(form.date,form.start)
    const endDate = new Date(new Date(start).getTime()+Number(form.duration_minutes)*60000)
    const end = `${endDate.getFullYear()}-${String(endDate.getMonth()+1).padStart(2,'0')}-${String(endDate.getDate()).padStart(2,'0')}T${String(endDate.getHours()).padStart(2,'0')}:${String(endDate.getMinutes()).padStart(2,'0')}:00`
    const payload = {title:form.title,description:form.description,start_at:start,end_at:end,duration_minutes:Number(form.duration_minutes),priority:Number(form.priority),is_fixed:form.is_fixed,resource:form.resource,window_start:form.is_fixed?null:toLocalISO(form.date,form.window_start),window_end:form.is_fixed?null:toLocalISO(form.date,form.window_end)}
    try{await request('/api/events',{method:'POST',body:JSON.stringify(payload)});setForm({...emptyForm,date:selectedDate});setNotice('Event added.');await load()}
    catch(e){setError(e.message)}
  }
  async function deleteEvent(id){
    try{await request(`/api/events/${id}`,{method:'DELETE'});setNotice('Event deleted.');await load()}
    catch(e){setError(e.message)}
  }
  async function optimize(){
    setLoading(true);setError('');setNotice('')
    try{const result=await request('/api/scheduling/optimize',{method:'POST',body:JSON.stringify({date:selectedDate,max_alternatives:3,slot_minutes:15})});setSolutions(result.alternatives||[]);setActiveSolution(0);setNotice(result.message)}
    catch(e){setError(e.message)}finally{setLoading(false)}
  }
  const dayEvents = useMemo(()=>events.filter(e=>e.start_at.slice(0,10)===selectedDate).sort((a,b)=>a.start_at.localeCompare(b.start_at)),[events,selectedDate])
  const active = solutions[activeSolution]
  const fmt = value => new Date(value).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})
  if(!token) return <main className="auth-shell"><div className="auth-card"><div className="brand"><div className="brand-icon"><CalendarDays/></div><div><h1>TangleFix</h1><p>PLAN SMARTER. LIVE BETTER.</p></div></div><h2>{authMode==='login'?'Welcome back':'Create your workspace'}</h2><p className="muted">A deterministic engine for conflict-free schedules.</p><form onSubmit={authenticate} className="stack">{authMode==='register'&&<label>Full name<input required value={auth.full_name} onChange={e=>setAuth({...auth,full_name:e.target.value})}/></label>}<label>Email<input type="email" required value={auth.email} onChange={e=>setAuth({...auth,email:e.target.value})}/></label><label>Password<input type="password" minLength="8" required value={auth.password} onChange={e=>setAuth({...auth,password:e.target.value})}/></label><button className="primary wide">{authMode==='login'?'Sign in':'Create account'}</button></form><button className="link-btn" onClick={()=>setAuthMode(authMode==='login'?'register':'login')}>{authMode==='login'?'New here? Create an account':'Already registered? Sign in'}</button>{error&&<div className="alert error">{error}</div>}</div></main>
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><div className="brand-icon"><CalendarDays/></div><div><h1>TangleFix</h1><p>SMART SCHEDULING</p></div></div><div className="side-label">WORKSPACE</div><button className={tab==='overview'?'nav active':'nav'} onClick={()=>setTab('overview')}><CalendarDays size={18}/> Overview</button><button className={tab==='events'?'nav active':'nav'} onClick={()=>setTab('events')}><CalendarPlus size={18}/> My events</button><button className={tab==='optimizer'?'nav active':'nav'} onClick={()=>setTab('optimizer')}><WandSparkles size={18}/> Optimizer</button><div className="sidebar-bottom"><div className="user-chip"><div className="avatar">{(user||'U').slice(0,1).toUpperCase()}</div><div><b>{user||'User'}</b><small>Personal workspace</small></div></div><button className="nav" onClick={logout}><LogOut size={18}/> Sign out</button></div></aside>
  <main className="main"><header className="topbar"><div><span className="eyebrow">YOUR SCHEDULE, UNDER CONTROL</span><h2>{tab==='overview'?'Overview':tab==='events'?'My events':'Schedule optimizer'}</h2></div><div className="top-actions"><span className="secure"><ShieldCheck size={15}/> Private workspace</span><input aria-label="Selected date" type="date" value={selectedDate} onChange={e=>{setSelectedDate(e.target.value);setSolutions([])}}/></div></header>
  {error&&<div className="alert error">{error}<button onClick={()=>setError('')}>×</button></div>}{notice&&<div className="alert success">{notice}<button onClick={()=>setNotice('')}>×</button></div>}
  <section className="stats"><Stat icon={<CalendarDays/>} label="Total events" value={events.length}/><Stat icon={<AlertTriangle/>} label="Conflicts" value={conflicts.length} danger={conflicts.length>0}/><Stat icon={<CheckCircle2/>} label="Today's events" value={dayEvents.length}/><Stat icon={<Zap/>} label="Alternatives" value={solutions.length}/></section>
  <div className="content-grid"><section className="panel calendar-panel"><div className="panel-head"><div><h3>{tab==='optimizer'?'Optimization results':'Schedule timeline'}</h3><p>{selectedDate} · {dayEvents.length} event(s)</p></div><button className="ghost" onClick={load}><RefreshCw size={16}/> Refresh</button></div>
  {tab==='optimizer'&&solutions.length>0&&<div className="solution-tabs">{solutions.map((s,i)=><button className={activeSolution===i?'solution-tab selected':'solution-tab'} onClick={()=>setActiveSolution(i)} key={i}>Option {i+1}<small>Score {s.cost}</small></button>)}</div>}
  {tab==='optimizer'&&active?<><div className="result-banner"><CheckCircle2/><div><b>Feasible schedule found</b><small>Ranked by minimum weighted schedule changes.</small></div></div>{active.events.map(ev=><div className="event-row" key={ev.event_id}><div className="time">{fmt(ev.start_at)}<small>{fmt(ev.end_at)}</small></div><div className="event-info"><b>{ev.title}</b><small>{ev.resource} · Priority {ev.priority}/5</small></div><span className={ev.moved?'pill moved':'pill kept'}>{ev.moved?'Moved':'Kept'}</span></div>)}</>:dayEvents.length===0?<div className="empty"><CalendarDays size={34}/><b>No events for this date</b><span>Add an event to start organizing your time.</span></div>:dayEvents.map(ev=><div className="event-row" key={ev.id}><div className="time">{fmt(ev.start_at)}<small>{fmt(ev.end_at)}</small></div><div className="event-info"><b>{ev.title}</b><small>{ev.resource} · Priority {ev.priority}/5 {ev.is_fixed?'· Fixed':''}</small></div><button className="icon-btn" title="Delete event" onClick={()=>deleteEvent(ev.id)}><Trash2 size={16}/></button></div>)}
  {conflicts.length>0&&tab!=='optimizer'&&<div className="conflict-box"><div className="conflict-title"><AlertTriangle size={17}/> Detected conflicts</div>{conflicts.slice(0,5).map((c,i)=><p key={i}>{c.title_a} <b>overlaps</b> {c.title_b} <span>({c.resource})</span></p>)}</div>}
  </section>
  <section className="panel form-panel"><div className="panel-head"><div><h3>Add an event</h3><p>Define timing, priority and flexibility.</p></div><CalendarPlus/></div><form className="stack" onSubmit={addEvent}><label>Event title<input required maxLength="180" placeholder="e.g. Database lecture" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>Description<textarea rows="2" placeholder="Optional details" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><div className="two-col"><label>Date<input type="date" required value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label><label>Preferred start<input type="time" required value={form.start} onChange={e=>setForm({...form,start:e.target.value})}/></label></div><div className="two-col"><label>Duration (minutes)<input type="number" min="5" max="1440" step="5" value={form.duration_minutes} onChange={e=>setForm({...form,duration_minutes:e.target.value})}/></label><label>Priority<select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}><option value="1">1 · Low</option><option value="2">2 · Normal</option><option value="3">3 · Medium</option><option value="4">4 · High</option><option value="5">5 · Critical</option></select></label></div><label>Resource / calendar<input value={form.resource} onChange={e=>setForm({...form,resource:e.target.value})} placeholder="personal / Room A / Team 1"/></label><label className="check"><input type="checkbox" checked={form.is_fixed} onChange={e=>setForm({...form,is_fixed:e.target.checked})}/> Fixed event (cannot be moved)</label>{!form.is_fixed&&<div className="two-col"><label>Available from<input type="time" value={form.window_start} onChange={e=>setForm({...form,window_start:e.target.value})}/></label><label>Available until<input type="time" value={form.window_end} onChange={e=>setForm({...form,window_end:e.target.value})}/></label></div>}<button className="primary wide"><CalendarPlus size={17}/> Add to schedule</button></form><div className="tip"><Zap size={16}/><span><b>Scheduling tip</b><br/>Fixed events stay put. Flexible events can move inside their availability window.</span></div></section></div>
  <footer>© 2026 TangleFix · Deterministic algorithms, transparent decisions.</footer></main></div>
}
function Stat({icon,label,value,danger}){return <div className="stat-card"><div className="stat-icon">{icon}</div><div><strong className={danger?'danger-text':''}>{value}</strong><span>{label}</span></div></div>}
export default App
