// ============================================================
// MelodYUp Pitch-First Chord Detector
// FFT peak picking -> MIDI notes -> chord naming (no templates)
// ============================================================

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

function hzToMidi(hz) {
  return Math.round(12 * Math.log2(hz / 440) + 69)
}

function hzToPitchClass(hz) {
  return ((hzToMidi(hz) % 12) + 12) % 12
}

function suppressHarmonics(peaks, tolerance = 0.04) {
  const kept = []
  for (const p of peaks) {
    let isHarmonic = false
    for (const strong of kept) {
      for (const ratio of [2, 3, 4, 0.5, 1.5]) {
        if (Math.abs(p.hz - strong.hz * ratio) / (strong.hz * ratio) < tolerance) {
          isHarmonic = true; break
        }
      }
      if (isHarmonic) break
    }
    if (!isHarmonic) kept.push(p)
  }
  return kept
}

function buildChromaFromPeaks(peaks) {
  const chroma = new Float32Array(12)
  for (const p of peaks) {
    if (p.hz < 50 || p.hz > 4000) continue
    const pc = hzToPitchClass(p.hz)
    chroma[pc] += p.amplitude
    chroma[(pc+1)%12] += p.amplitude * 0.15
    chroma[(pc+11)%12] += p.amplitude * 0.15
  }
  let norm = 0
  for (let i=0;i<12;i++) norm += chroma[i]*chroma[i]
  norm = Math.sqrt(norm)||1
  for (let i=0;i<12;i++) chroma[i] /= norm
  return chroma
}

function nameChordFromPCs(activePCs) {
  if (activePCs.length === 0) return null
  if (activePCs.length === 1) return NOTE_NAMES[activePCs[0]]
  const pcs = [...activePCs].sort((a,b)=>a-b)
  let bestName = null, bestScore = -1
  for (const root of pcs) {
    const intervals = pcs.map(pc => (pc - root + 12) % 12).sort((a,b)=>a-b)
    const ivSet = new Set(intervals)
    const has = iv => ivSet.has(iv)
    let score = 3, name = NOTE_NAMES[root]
    if (has(7)) {
      score += 2
      if (has(4)) {
        score += 2
        if (has(10))      { name += '7';    score += 1 }
        else if (has(11)) { name += 'maj7'; score += 1 }
        else if (has(9))  { name += '6';   score += 0.5 }
        else if (has(2))  { name += 'add9';score += 0.5 }
      } else if (has(3)) {
        name += 'm'; score += 2
        if (has(10))      { name += '7';    score += 1 }
        else if (has(11)) { name += 'maj7'; score += 1 }
        else if (has(9))  { name += '6';   score += 0.5 }
        else if (has(2))  { name += 'add9';score += 0.5 }
      } else if (has(5)) { name += 'sus4'; score += 1 }
        else if (has(2)) { name += 'sus2'; score += 1 }
    } else if (has(6) && has(3)) {
      name += has(9) ? 'dim7' : 'dim'; score += 1.5
    } else if (has(4) && !has(7)) { score += 1 }
      else if (has(3) && !has(7)) { name += 'm'; score += 1 }
    const chordPCs = new Set(intervals)
    score -= [...ivSet].filter(iv => !chordPCs.has(iv)).length * 0.5
    if (score > bestScore) { bestScore = score; bestName = name }
  }
  return bestName
}

const KS_MAJ = [6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88]
const KS_MIN = [6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17]

function pearson(a, b) {
  const n=a.length, ma=a.reduce((s,v)=>s+v,0)/n, mb=b.reduce((s,v)=>s+v,0)/n
  let num=0,da=0,db=0
  for(let i=0;i<n;i++){const x=a[i]-ma,y=b[i]-mb;num+=x*y;da+=x*x;db+=y*y}
  return num/(Math.sqrt(da*db)||1)
}

export function detectKey(globalChroma) {
  const ch = Array.from(globalChroma)
  let best=-Infinity, bestKey='C', bestScale='major'
  for(let i=0;i<12;i++){
    const rot=[...ch.slice(i),...ch.slice(0,i)]
    const mj=pearson(rot,KS_MAJ), mn=pearson(rot,KS_MIN)
    if(mj>best){best=mj;bestKey=NOTE_NAMES[i];bestScale='major'}
    if(mn>best){best=mn;bestKey=NOTE_NAMES[i];bestScale='minor'}
  }
  return {key:bestKey,scale:bestScale}
}

function medianSmooth(chords, win=3) {
  const half=Math.floor(win/2)
  return chords.map((_,i)=>{
    const w=chords.slice(Math.max(0,i-half),Math.min(chords.length,i+half+1)).filter(Boolean)
    if(!w.length) return chords[i]
    const cnt={}
    for(const c of w) cnt[c]=(cnt[c]||0)+1
    return Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0][0]
  })
}

export async function analyzeAudio(file, onProgress) {
  onProgress('Decoding audio…', 8)
  const arrayBuffer = await file.arrayBuffer()
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  const ctx = new AudioCtx()
  const rawBuffer = await ctx.decodeAudioData(arrayBuffer)
  await ctx.close()

  const TARGET_SR = 22050
  const offCtx = new OfflineAudioContext(1, Math.ceil(rawBuffer.duration*TARGET_SR), TARGET_SR)
  const src = offCtx.createBufferSource()
  src.buffer = rawBuffer; src.connect(offCtx.destination); src.start(0)
  onProgress('Resampling…', 14)
  const resampled = await offCtx.startRendering()
  const raw = resampled.getChannelData(0)
  const sr = resampled.sampleRate
  const dur = resampled.duration

  onProgress('Detecting BPM…', 20)
  const HOP=512
  const env=[]
  for(let i=0;i<raw.length-HOP;i+=HOP){
    let e=0; for(let j=0;j<HOP;j++) e+=raw[i+j]*raw[i+j]
    env.push(Math.sqrt(e/HOP))
  }
  const flux=env.map((v,i)=>i>0?Math.max(0,v-env[i-1]):0)
  const eSR=sr/HOP
  const minLag=Math.round(eSR*60/200), maxLag=Math.round(eSR*60/55)
  let bestC=-1, bestLag=Math.round(eSR*60/120)
  for(let lag=minLag;lag<=maxLag;lag++){
    let c=0; for(let i=0;i<flux.length-lag;i++) c+=flux[i]*flux[i+lag]
    if(c>bestC){bestC=c;bestLag=lag}
  }
  let bpm=Math.round(eSR*60/bestLag)
  if(bpm<60) bpm*=2
  if(bpm>200) bpm=Math.round(bpm/2)
  bpm=Math.max(60,Math.min(200,bpm))

  const beatDur=60/bpm
  const totalBeats=Math.ceil(dur/beatDur)

  onProgress('Detecting pitches…', 28)
  const actualFFT=8192
  const binHz=sr/actualFFT
  const fftBuf=new Float32Array(actualFFT)
  const globalChroma=new Float32Array(12)
  const beatData=[]

  for(let b=0;b<totalBeats;b++){
    if(b%8===0){
      onProgress(`Detecting pitches ${b+1}/${totalBeats}…`, 28+Math.round(50*b/totalBeats))
      await new Promise(r=>setTimeout(r,0))
    }
    const startSample=Math.max(0, Math.round((b-0.5)*beatDur*sr))
    const N=Math.min(actualFFT, raw.length-startSample)
    fftBuf.fill(0)
    for(let n=0;n<N;n++){
      const hann=0.5-0.5*Math.cos(2*Math.PI*n/N)
      fftBuf[n]=raw[startSample+n]*hann
    }
    // Goertzel per MIDI note E2(40) to C6(84)
    const peaks=[]
    for(let midi=40;midi<=84;midi++){
      const freq=440*Math.pow(2,(midi-69)/12)
      if(freq>sr/2*0.9) continue
      const k=freq/binHz
      const omega=2*Math.PI*k/actualFFT
      const coeff=2*Math.cos(omega)
      let s1=0,s2=0
      const step=4; let cnt=0
      for(let n=0;n<N;n+=step){s1=coeff*s1-s2+fftBuf[n];s2=s1;cnt++}
      const mag=Math.sqrt(s1*s1+s2*s2-coeff*s1*s2)/(cnt||1)
      peaks.push({hz:freq,amplitude:mag})
    }
    peaks.sort((a,b)=>b.amplitude-a.amplitude)
    const clean=suppressHarmonics(peaks.slice(0,16),0.04)
    const chroma=buildChromaFromPeaks(clean)
    beatData.push({chroma,peaks:clean})
    for(let i=0;i<12;i++) globalChroma[i]+=chroma[i]
  }

  onProgress('Detecting key…', 80)
  const {key,scale}=detectKey(Array.from(globalChroma))

  onProgress('Naming chords…', 85)
  const rawChords=beatData.map(({chroma})=>{
    const maxC=Math.max(...chroma)
    const threshold=maxC*0.35
    const activePCs=[]
    for(let i=0;i<12;i++) if(chroma[i]>=threshold) activePCs.push(i)
    return nameChordFromPCs(activePCs)
  })

  onProgress('Smoothing…', 92)
  const smoothed=medianSmooth(medianSmooth(rawChords,5),3)

  onProgress('Finalizing…', 97)
  const chords=[]
  let prev=null
  for(let b=0;b<totalBeats;b++){
    const chord=smoothed[b]||null
    chords.push({
      beat:b,
      chord,
      chordDisplay: chord!==prev ? chord : null,
      time:+(b*beatDur).toFixed(3),
    })
    prev=chord
  }
  return {chords,bpm,key,scale,totalDuration:+dur.toFixed(2),totalBeats}
}
