import { unzipSync } from "fflate";
import { SaxesParser } from "saxes";

export function extractSpreadsheetText(data: Buffer) {
  const entries = unzipSync(new Uint8Array(data));
  const totalUncompressedBytes = Object.values(entries).reduce((total, entry) => total + entry.byteLength, 0);
  if (totalUncompressedBytes > 25 * 1024 * 1024) throw new Error("The spreadsheet expands beyond the 25 MB indexing limit.");
  const decode = (value: Uint8Array) => new TextDecoder().decode(value);
  const sharedStrings = entries["xl/sharedStrings.xml"] ? parseSharedStrings(decode(entries["xl/sharedStrings.xml"])) : [];
  const worksheets = Object.entries(entries).filter(([path]) => /^xl\/worksheets\/[^/]+\.xml$/i.test(path)).slice(0, 50);
  const rows: string[] = [];
  for (const [path, contents] of worksheets) {
    rows.push(`Sheet: ${path.replace(/^.*\//, "").replace(/\.xml$/i, "")}`);
    rows.push(...parseWorksheetRows(decode(contents), sharedStrings));
  }
  return rows.join("\n").replace(/\u0000/g, "").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function parseSharedStrings(xml: string) {
  const values: string[] = [];
  let current = "";
  let insideString = false;
  const parser = new SaxesParser();
  parser.on("opentag", (tag) => { if (tag.name === "si") { insideString = true; current = ""; } });
  parser.on("text", (text) => { if (insideString) current += text; });
  parser.on("closetag", (tag) => { if (tag.name === "si") { values.push(current); insideString = false; } });
  parser.write(xml).close();
  return values;
}

function parseWorksheetRows(xml: string, sharedStrings: string[]) {
  const rows: string[] = [];
  let row: string[] = [];
  let cellType = "";
  let cellValue = "";
  let captureValue = false;
  const parser = new SaxesParser();
  parser.on("opentag", (tag) => {
    if (tag.name === "row") row = [];
    if (tag.name === "c") { cellType = String(tag.attributes.t || ""); cellValue = ""; }
    if (tag.name === "v" || tag.name === "t") captureValue = true;
  });
  parser.on("text", (text) => { if (captureValue) cellValue += text; });
  parser.on("closetag", (tag) => {
    if (tag.name === "v" || tag.name === "t") captureValue = false;
    if (tag.name === "c") row.push(cellType === "s" ? sharedStrings[Number(cellValue)] || "" : cellValue);
    if (tag.name === "row") { const values = row.map((value) => value.trim()).filter(Boolean); if (values.length) rows.push(values.join(" | ")); }
  });
  parser.write(xml).close();
  return rows;
}
