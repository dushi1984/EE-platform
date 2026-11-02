import type { ReactNode } from "react";

/** Minimal, dependency-free markdown renderer for lesson content. */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const k = `${keyPrefix}-${i++}`;
    if (tok.startsWith("`")) out.push(<code key={k} className="inline">{tok.slice(1, -1)}</code>);
    else if (tok.startsWith("**")) out.push(<strong key={k}>{tok.slice(2, -2)}</strong>);
    else out.push(<em key={k}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++]);
      i++;
      blocks.push(
        <pre key={key++}>
          <code>{buf.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    if (/^#{1,3}\s/.test(line)) {
      const level = line.match(/^#+/)![0].length;
      const text = line.replace(/^#+\s*/, "");
      const k = key++;
      if (level === 1) blocks.push(<h2 key={k}>{inline(text, `h${k}`)}</h2>);
      else if (level === 2) blocks.push(<h2 key={k}>{inline(text, `h${k}`)}</h2>);
      else blocks.push(<h3 key={k}>{inline(text, `h${k}`)}</h3>);
      i++;
      continue;
    }

    if (line.startsWith("|")) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++]);
      const cells = (r: string) =>
        r
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim());
      const header = cells(rows[0]);
      const body = rows.slice(1).filter((r) => !/^\|\s*-/.test(r));
      const k = key++;
      blocks.push(
        <table key={k}>
          <thead>
            <tr>
              {header.map((h, hi) => (
                <th key={hi}>{inline(h, `th${k}-${hi}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((r, ri) => (
              <tr key={ri}>
                {cells(r).map((c, ci) => (
                  <td key={ci}>{inline(c, `td${k}-${ri}-${ci}`)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>,
      );
      continue;
    }

    if (line.startsWith("> ")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) buf.push(lines[i++].slice(2));
      const k = key++;
      blocks.push(<blockquote key={k}>{inline(buf.join(" "), `bq${k}`)}</blockquote>);
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) items.push(lines[i++].replace(/^[-*]\s/, ""));
      const k = key++;
      blocks.push(
        <ul key={k}>
          {items.map((it, ii) => (
            <li key={ii}>{inline(it, `li${k}-${ii}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) items.push(lines[i++].replace(/^\d+\.\s/, ""));
      const k = key++;
      blocks.push(
        <ol key={k}>
          {items.map((it, ii) => (
            <li key={ii}>{inline(it, `ol${k}-${ii}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !/^(#{1,3}\s|```|>\s|[-*]\s|\d+\.\s|\|)/.test(lines[i])) buf.push(lines[i++]);
    const k = key++;
    blocks.push(<p key={k}>{inline(buf.join(" "), `p${k}`)}</p>);
  }

  return <div className="prose-lesson">{blocks}</div>;
}
