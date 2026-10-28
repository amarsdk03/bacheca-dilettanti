"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/features/dashboard/components/ContentStates";
import { displayDate } from "../../annunci/presentation";
import { chartLimitations, distributionRows, primaryRows, type AvailableHomeChart, type ChartRow } from "../chart-presentation";
import { homeCount } from "../presentation";

const config = { count: { label: "Totale", color: "var(--chart-1)" } };
const formatCount = (value: unknown) => typeof value === "number" ? homeCount(value) : String(value ?? "");
export function ChartDataTable({ title, rows }: { title: string; rows: ChartRow[] }) {
  return <details><summary className="cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-ring">Mostra dati: {title}</summary>
    <Table><TableCaption>{title}</TableCaption><TableHeader><TableRow><TableHead scope="col">Periodo / Categoria</TableHead><TableHead scope="col">Totale</TableHead></TableRow></TableHeader>
      <TableBody>{rows.map(row => <TableRow key={row.key}><TableCell>{row.label}</TableCell><TableCell>{homeCount(row.count)}</TableCell></TableRow>)}</TableBody></Table>
  </details>;
}
export function PrimaryChart({ rows, pending }: { rows: ChartRow[]; pending: boolean }) {
  const axes = <><CartesianGrid vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} /><YAxis allowDecimals={false} width={55} tickFormatter={homeCount} /></>;
  return <ChartContainer config={config} className="h-72 w-full aspect-auto" aria-label={pending ? "Annunci per anzianità dalla creazione" : "Andamento degli ultimi dodici mesi"}>
    {pending ? <BarChart accessibilityLayer data={rows}>{axes}<ChartTooltip content={<ChartTooltipContent formatter={formatCount} />} /><Bar dataKey="count" fill="var(--chart-1)" isAnimationActive={false} /></BarChart> :
      <AreaChart accessibilityLayer data={rows}>{axes}<ChartTooltip content={<ChartTooltipContent formatter={formatCount} />} /><Area type="linear" dataKey="count" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.2} isAnimationActive={false} /></AreaChart>}
  </ChartContainer>;
}
export function DistributionChart({ rows }: { rows: ChartRow[] }) {
  return <><ChartContainer config={config} className="h-72 w-full aspect-auto" aria-label="Distribuzione attuale">
    <PieChart accessibilityLayer><ChartTooltip content={<ChartTooltipContent nameKey="label" formatter={(value, _name, item) => `${item.payload.label}: ${formatCount(value)}`} />} />
      <Pie data={rows.filter(row => row.count > 0)} dataKey="count" nameKey="label" isAnimationActive={false} /></PieChart>
  </ChartContainer><ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Legenda distribuzione">{rows.map(row => <li key={row.key} className="flex items-center gap-2 text-sm">
    <span className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: row.fill }} aria-hidden="true" />{row.label}: {homeCount(row.count)}</li>)}</ul></>;
}
export default function HomeCharts({ chart }: { chart: AvailableHomeChart }) {
  const primary = primaryRows(chart), distribution = distributionRows(chart), pending = chart.metric === "pending";
  const primaryTitle = pending ? "Anzianità dalla creazione" : chart.metric === "users" ? "Registrazioni negli ultimi 12 mesi" : "Annunci creati negli ultimi 12 mesi";
  const distributionTitle = chart.metric === "users" ? "Profili registrati" : chart.metric === "announcements" ? "Stato attuale degli annunci" : "Tipologie da approvare";
  return <div className="flex min-w-0 flex-col gap-5"><div className="text-sm text-muted-foreground">
    <p>Dati al {displayDate(chart.asOf)} · Europe/Rome. Popolazione: {homeCount(chart.population)}.</p>
    {!pending && <p>Periodo: {displayDate(chart.period.from)} – {displayDate(chart.period.to)}. Il mese corrente è parziale.</p>}
    <p>Le card e i grafici sono aggiornati separatamente e possono riferirsi a istanti diversi.</p>
  </div>
    {pending && chart.population === 0 ? <EmptyState title="Nessun annuncio da approvare" description="La coda attuale è vuota." /> : <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2">
      <section className="flex min-w-0 flex-col gap-3" aria-label={primaryTitle}><h3 className="font-semibold">{primaryTitle}</h3>
        <PrimaryChart rows={primary} pending={pending} />
        {!pending && primary.every(row => row.count === 0) && <p>Nessun evento nel periodo rappresentato.</p>}
        <ChartDataTable title={primaryTitle} rows={primary} /></section>
      <section className="flex min-w-0 flex-col gap-3" aria-label={distributionTitle}><h3 className="font-semibold">{distributionTitle}</h3>
        <p className="text-sm">Totale {chart.metric === "users" ? "profili" : "annunci"}: {homeCount(chart.distributionTotal)}.</p>
        {chart.distributionTotal === 0 ? <EmptyState title="Nessun dato nella distribuzione" description="Non ci sono categorie da rappresentare." /> : <DistributionChart rows={distribution} />}
        <ChartDataTable title={distributionTitle} rows={distribution} /></section>
    </div>}
    <div className="flex flex-col gap-2 text-sm text-muted-foreground"><p>Date mancanti o non valide: {homeCount(chart.excludedDates.missingOrNonFinite)}. Date future: {homeCount(chart.excludedDates.future)}.
      {pending ? " Incluse nella fascia Data non disponibile." : " Escluse dalla serie mensile; la distribuzione resta inclusiva."}</p>
      {chart.limitations.map(key => <p key={key}>{chartLimitations[key]}</p>)}</div>
  </div>;
}
