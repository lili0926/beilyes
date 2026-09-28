import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { buildReferencePitchContour, perceptualPitchBand } from './listen/pitchDisplay.js';
import { buildReferencePitchGraphGeometry, normalizeReferencePitchFrames,
  referencePitchPlayhead } from './listen/referencePitchGraph.js';

function ReferencePitchView({ frames, source, durationMs, getPosition }) {
  const contour = useMemo(() => buildReferencePitchContour(normalizeReferencePitchFrames(frames), source), [frames, source]);
  const band = useMemo(() => perceptualPitchBand(contour), [contour]);
  const [page, setPage] = useState(0);
  const graph = useMemo(() => buildReferencePitchGraphGeometry(contour, page, durationMs, [], band), [contour, page, durationMs, band]);
  const cursor = useRef(null);
  const dot = useRef(null);
  useEffect(() => {
    let frame;
    const tick = () => {
      if (document.hidden) return;
      const position = getPosition();
      const wanted = Math.floor(position / 20000) * 20000;
      if (wanted !== Math.floor(page / 20000) * 20000) setPage(wanted);
      const current = referencePitchPlayhead(graph, position);
      if (cursor.current) {
        cursor.current.setAttribute('x1', current.cursorX);
        cursor.current.setAttribute('x2', current.cursorX);
      }
      if (dot.current) {
        const point = current.currentPoint;
        dot.current.style.display = point ? '' : 'none';
        if (point) {
          dot.current.setAttribute('cx', point.x);
          dot.current.setAttribute('cy', point.y);
          dot.current.classList.toggle('is-bridge', current.visualBridge);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    const visibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', visibility);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', visibility); };
  }, [getPosition, graph, page]);
  const label = source === 'separated_vocal_pyin' ? '分离人声音高参考' : source === 'synthetic_demo' ? '合成演示曲线' : '混音参考（不是人声主旋律）';
  return <section className="card reference-card">
    <h2>歌曲音高</h2><p>{label} · {Math.floor(graph.start / 1000)}–{Math.floor(graph.end / 1000)} 秒 · 音轴 {graph.rangeLabel}</p>
    <svg className="reference-graph" viewBox="0 0 300 154" role="img" aria-label={label}>
      {graph.rows.map(row => <g key={row.midi}><line x1="31" x2="293" y1={row.y} y2={row.y} className="grid-line" /><text x="2" y={row.y + 3} fontSize="7">{row.label}</text></g>)}
      {graph.ridgeRuns.map((run, index) => <path key={index} d={run.path} className={`ridge ${run.bridge ? 'is-bridge' : ''}`} />)}
      {graph.isolatedPoints.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="1.6" className="isolated-pitch"><title>孤立检测点：保留实际高度，不强连成旋律</title></circle>)}
      {graph.overflowMarkers.map((marker, index) => <path key={index} className="overflow" d={marker.direction === 'high' ? `M ${marker.x} 10 l -3 5 h 6 Z` : `M ${marker.x} 142 l -3 -5 h 6 Z`}><title>音高超出当前音轴，未压成平线</title></path>)}
      <line ref={cursor} x1="31" x2="31" y1="10" y2="142" className="cursor" />
      <circle ref={dot} r="3" className="current-dot" style={{ display: 'none' }} />
    </svg>
    {!graph.hasFrames && <p>此窗口没有可靠音高，保留空白。</p>}
    <small>虚线与淡色空心点仅表示短缺口的视觉过渡，不是实测音高；长缺口不补线。</small>
  </section>;
}

export default memo(ReferencePitchView);
