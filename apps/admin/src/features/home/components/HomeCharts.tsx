"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/features/dashboard/components/ContentStates";
import { displayDate } from "../../annunci/presentation";
import { chartLimitations, distributionRows, primaryRows, type AvailableHomeChart, type ChartRow } from "../chart-presentation";
import { homeCount } from "../presentation";

const config = { count: { label: "Totale", color: "var(--chart-1)" } };
const formatCount = (value: unknown) => typeof value === "number" ? homeCount(value) : String(value ?? "");
export function ChartDataTable({ title, rows }: { title: string; rows: ChartRow[] }) {
  return <details className="admin-home-chart-data"><summary>Mostra dati: {title}</summary>
    <Table><TableCaption>{title}</TableCaption><TableHeader><TableRow><TableHead scope="col">Periodo / Categoria</TableHead><TableHead scope="col">Totale</TableHead></TableRow></TableHeader>
      <TableBody>{rows.map(row => <TableRow key={row.key}><TableCell>{row.label}</TableCell><TableCell>{homeCount(row.count)}</TableCell></TableRow>)}</TableBody></Table>
  </details>;
}
export function PrimaryChart({ rows, pending }: { rows: ChartRow[]; pending: boolean }) {
  const axes = <><CartesianGrid vertical={false} stroke="var(--admin-chart-grid)" /><XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} /><YAxis allowDecimals={false} width={55} tickFormatter={homeCount} stroke="var(--muted-foreground)" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} /></>;
  return <ChartContainer config={config} className="admin-home-primary-chart" aria-label={pending ? "Annunci per anzianità dalla creazione" : "Andamento degli ultimi dodici mesi"}>
    {pending ? <BarChart accessibilityLayer data={rows}>{axes}<ChartTooltip isAnimationActive={false} content={<ChartTooltipContent className="admin-home-chart-tooltip" formatter={formatCount} />} /><Bar dataKey="count" fill="var(--chart-1)" fillOpacity={0.85} isAnimationActive={false} /></BarChart> :
      <AreaChart accessibilityLayer data={rows}>{axes}<ChartTooltip isAnimationActive={false} content={<ChartTooltipContent className="admin-home-chart-tooltip" formatter={formatCount} />} /><Area type="linear" dataKey="count" stroke="var(--chart-1)" strokeWidth={2} fill="var(--chart-1)" fillOpacity={0.14} isAnimationActive={false} /></AreaChart>}
  </ChartContainer>;
}
export function DistributionChart({ rows }: { rows: ChartRow[] }) {
  return <><ChartContainer config={config} className="admin-home-distribution-chart" aria-label="Distribuzione attuale">
    <PieChart accessibilityLayer><ChartTooltip isAnimationActive={false} content={<ChartTooltipContent className="admin-home-chart-tooltip" nameKey="label" formatter={(value, _name, item) => `${item.payload.label}: ${formatCount(value)}`} />} />
      <Pie data={rows.filter(row => row.count > 0)} dataKey="count" nameKey="label" outerRadius="100%" stroke="var(--card)" strokeWidth={1} isAnimationActive={false} /></PieChart>
  </ChartContainer><ul className="admin-home-chart-legend" aria-label="Legenda distribuzione">{rows.map(row => <li key={row.key}>
    <span className="admin-home-chart-swatch" style={{ backgroundColor: row.fill }} aria-hidden="true" /><span>{row.label}: {homeCount(row.count)}</span></li>)}</ul></>;
}
export default function HomeCharts({ chart }: { chart: AvailableHomeChart }) {
  const primary = primaryRows(chart), distribution = distributionRows(chart), pending = chart.metric === "pending";
  const primaryTitle = pending ? "Anzianità dalla creazione" : chart.metric === "users" ? "Registrazioni negli ultimi 12 mesi" : "Annunci creati negli ultimi 12 mesi";
  const distributionTitle = chart.metric === "users" ? "Profili registrati" : chart.metric === "announcements" ? "Stato attuale degli annunci" : "Tipologie da approvare";
  return <div className="admin-home-block"><div className="admin-home-chart-notes">
    <p>Dati al {displayDate(chart.asOf)} · Europe/Rome. Popolazione: {homeCount(chart.population)}.</p>
    {!pending && <p>Periodo: {displayDate(chart.period.from)} – {displayDate(chart.period.to)}. Il mese corrente è parziale.</p>}
    <p>Le card e i grafici sono aggiornati separatamente e possono riferirsi a istanti diversi.</p>
  </div>
    {pending && chart.population === 0 ? <Card><CardContent><EmptyState title="Nessun annuncio da approvare" description="La coda attuale è vuota." /></CardContent></Card> : <div className="admin-home-chart-grid">
      <Card className="admin-home-chart-card" role="region" aria-label={primaryTitle}><CardHeader><CardTitle><h3>{primaryTitle}</h3></CardTitle></CardHeader><CardContent className="admin-home-chart-body">
        <PrimaryChart rows={primary} pending={pending} />
        {!pending && primary.every(row => row.count === 0) && <p>Nessun evento nel periodo rappresentato.</p>}
        <ChartDataTable title={primaryTitle} rows={primary} /></CardContent></Card>
      <Card className="admin-home-chart-card" role="region" aria-label={distributionTitle}><CardHeader><CardTitle><h3>{distributionTitle}</h3></CardTitle></CardHeader><CardContent className="admin-home-chart-body">
        <p>Totale {chart.metric === "users" ? "profili" : "annunci"}: {homeCount(chart.distributionTotal)}.</p>
        {chart.distributionTotal === 0 ? <EmptyState title="Nessun dato nella distribuzione" description="Non ci sono categorie da rappresentare." /> : <DistributionChart rows={distribution} />}
        <ChartDataTable title={distributionTitle} rows={distribution} /></CardContent></Card>
    </div>}
    <div className="admin-home-chart-notes"><p>Date mancanti o non valide: {homeCount(chart.excludedDates.missingOrNonFinite)}. Date future: {homeCount(chart.excludedDates.future)}.
      {pending ? " Incluse nella fascia Data non disponibile." : " Escluse dalla serie mensile; la distribuzione resta inclusiva."}</p>
      {chart.limitations.map(key => <p key={key}>{chartLimitations[key]}</p>)}</div>
  </div>;
}
