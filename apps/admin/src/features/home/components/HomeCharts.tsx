"use client";
import {useId, type ReactNode} from "react";
import {ArrowDown, ArrowUp, TrendingUpIcon, ChartNoAxesCombinedIcon, Minus} from "lucide-react";
import {Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis} from "recharts";
import {ChartContainer, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Progress} from "@/components/ui/progress";
import {Button} from "@/components/ui/button";
import {Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {EmptyState} from "@/features/dashboard/components/ContentStates";
import {type AvailableHomeChart, type ChartRow, distributionRows, monthLabel, primaryRows} from "../chart-presentation";
import {homeCount} from "../presentation";
import {homePeriod, type HomeAggregation, type HomeRange, type PeriodRow} from "../period";
import {splitHomeRows} from "../split-presentation";

const config = {count: {label: "Totale", color: "var(--chart-1)"}};
const formatCount = (value: unknown) => typeof value === "number" ? homeCount(value) : String(value ?? "");

export function ChartDataTable({title, rows, categories = []}: {
	title: string;
	rows: ChartRow[];
	categories?: ChartRow[]
}) {
	return <details className="admin-home-chart-data">
		<summary>Mostra dati: {title}</summary>
		<Table className={categories.length ? "admin-home-chart-wide-table" : undefined}
		       aria-label={`Dati: ${title}`}><TableCaption>{title}</TableCaption><TableHeader><TableRow><TableHead
			scope="col">Periodo / Categoria</TableHead>{categories.map(c =>
			<TableHead key={c.key} scope="col">{c.label}</TableHead>)}<TableHead scope="col">Totale</TableHead></TableRow></TableHeader>
			<TableBody>{rows.map(row => <TableRow
				key={row.key}><TableCell>{row.label}{"partial" in row && row.partial ? " · Parziale" : ""}</TableCell>{categories.map(c =>
				<TableCell
					key={c.key}>{homeCount((row as ChartRow & Record<string, number>)[`category_${c.key}`] ?? 0)}</TableCell>)}<TableCell>{homeCount(row.count)}</TableCell>
			</TableRow>)}</TableBody></Table>
	</details>;
}

export function PrimaryChart({rows, pending, categories = []}: {
	rows: (ChartRow | PeriodRow)[];
	pending: boolean;
	categories?: ChartRow[]
}) {
	const gradient = `home-area-${useId().replace(/:/g, "")}`;
	const data = rows.map(row => ({
		key: row.key, count: row.count,
		label: row.label + ("partial" in row && row.partial ? " *" : ""),
		...Object.fromEntries(categories.map(c => [`category_${c.key}`, (row as ChartRow & Record<string, number>)[`category_${c.key}`] ?? 0])),
	}));
	const axes = <><CartesianGrid stroke="var(--admin-chart-grid)" strokeDasharray="3 3"/>
		<XAxis dataKey="label" tick={{fill: "var(--muted-foreground)"}} tickLine={false} axisLine={false}
		       minTickGap={30} tickMargin={14}/>
		<YAxis allowDecimals={false} tick={{fill: "var(--muted-foreground)"}} tickLine={false} axisLine={false}
		       width={52} tickMargin={10} tickFormatter={homeCount} domain={[0, "auto"]}/></>;
	const chartConfig = categories.length ? Object.fromEntries(categories.map(c => [`category_${c.key}`, {
		label: c.label,
		color: c.fill
	}])) : config;
	const tooltip = <ChartTooltip isAnimationActive={false}
	                              content={<ChartTooltipContent className="admin-home-chart-tooltip"
	                                                            formatter={categories.length ? (value, name) =>
		                                                            <span>{name}: {formatCount(value)}</span> : formatCount}/>}/>;
	return <ChartContainer config={chartConfig} className="admin-home-primary-chart"
	                       aria-label={pending ? "Annunci per anzianità dalla creazione" : "Andamento nel periodo selezionato"}>
		{pending || data.length === 1 ?
			<BarChart accessibilityLayer data={data} margin={{top: 12, right: 12, bottom: 8, left: 0}}>{axes}
				{tooltip}
				{categories.length ? categories.map(c => <Bar key={c.key} dataKey={`category_${c.key}`} name={c.label}
				                                              fill={c.fill} stackId="categories" maxBarSize={72}
				                                              isAnimationActive={false}/>) :
					<Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={72}
					     isAnimationActive={false}/>}
			</BarChart> : <AreaChart accessibilityLayer data={data} margin={{top: 12, right: 16, bottom: 8, left: 0}}>
				<defs>
					<linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.24}/>
						<stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.015}/>
					</linearGradient>
				</defs>
				{axes}{tooltip}
				{categories.length ? categories.map(c => <Area key={c.key} type="monotone" dataKey={`category_${c.key}`}
				                                               name={c.label} stroke={c.fill} fill={c.fill}
				                                               fillOpacity={0.45} stackId="categories"
				                                               isAnimationActive={false}/>) :
					<Area type="monotone" dataKey="count" stroke="var(--chart-1)" strokeWidth={2}
					      fill={`url(#${gradient})`} fillOpacity={1}
					      dot={{r: 3.5, fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 1.5}}
					      activeDot={{r: 5, stroke: "var(--card)", strokeWidth: 2}} isAnimationActive={false}/>}
			</AreaChart>}
	</ChartContainer>;
}

export function DistributionChart({rows}: { rows: ChartRow[] }) {
	const total = rows.reduce((sum, row) => sum + row.count, 0);
	return <ul className="home-distribution" aria-label="Distribuzione attuale">{rows.map(row => {
		const percent = total ? row.count / total * 100 : 0;
		return <li key={row.key}>
			<span className="home-distribution-label"><span className="admin-home-chart-swatch"
			                                                style={{backgroundColor: row.fill}}
			                                                aria-hidden="true"/>{row.label}</span>
			<span className="home-distribution-count">{homeCount(row.count)}</span>
			<span
				className="home-muted">{new Intl.NumberFormat("it-IT", {maximumFractionDigits: 1}).format(percent)}%</span>
			<Progress value={percent} aria-label={row.label}
			          aria-valuetext={`${homeCount(row.count)} su ${homeCount(total)}`}
			          indicatorStyle={{backgroundColor: row.fill}}/>
		</li>;
	})}</ul>;
}

function Sparkline({rows, tone = "blue"}: {
	rows: { month: string; count: number }[];
	tone?: "blue" | "positive" | "negative" | "neutral"
}) {
	const gradient = `home-spark-${useId().replace(/:/g, "")}`;
	return <ChartContainer config={config} className="home-sparkline" data-tone={tone} aria-hidden="true">
		<AreaChart data={rows} accessibilityLayer={false} margin={{top: 8, right: 3, left: 3, bottom: 0}}>
			<defs>
				<linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="var(--spark-color)" stopOpacity={0.24}/>
					<stop offset="100%" stopColor="var(--spark-color)" stopOpacity={0}/>
				</linearGradient>
			</defs>
			<Area dataKey="count" type="monotone" stroke="var(--spark-color)" strokeWidth={1.5}
			      fill={`url(#${gradient})`} fillOpacity={1} isAnimationActive={false} dot={rows.length === 1}/>
		</AreaChart>
	</ChartContainer>;
}

export default function HomeCharts({chart, range = null, aggregation = "monthly", action, split = false, onSplit}: {
	chart: AvailableHomeChart;
	range?: HomeRange | null;
	aggregation?: HomeAggregation;
	action?: ReactNode;
	split?: boolean;
	onSplit?(): void;
}) {
	const period = "series" in chart ? homePeriod(chart, range, aggregation) : null;
	const primary = period?.rows ?? primaryRows(chart), distribution = distributionRows(chart),
		pending = chart.metric === "pending";
	const canSplit = chart.breakdown !== undefined;
	const separated = split && canSplit;
	const splitData = splitHomeRows(chart, primary, aggregation, range);
	const categories = separated ? splitData.categories : [];
	const rows = separated ? splitData.rows : primary;
	const primaryTitle = pending ? "Anzianità dalla creazione" : chart.metric === "users" ? "Registrazioni nel periodo" : "Annunci creati nel periodo";
	const distributionTitle = chart.metric === "users" ? "Profili registrati" : chart.metric === "announcements" ? "Stato attuale degli annunci" : "Tipologie da approvare";
	const change = period?.change,
		tone = change ? change.difference > 0 ? "positive" : change.difference < 0 ? "negative" : "neutral" : "neutral";
	const Trend = tone === "positive" ? ArrowUp : tone === "negative" ? ArrowDown : Minus;
	return <div className="admin-home-block">
		{pending && chart.population === 0 ?
			<Card><CardContent><EmptyState title="Nessun annuncio da approvare" description="La coda attuale è vuota."/></CardContent></Card> : <>
				<Card className="admin-home-chart-card home-main-chart" role="region" aria-label={primaryTitle}>
					<CardHeader>
						<div className="admin-home-toolbar"><CardTitle><h3>{primaryTitle}</h3></CardTitle>
							<div className="home-chart-tools">
								<span className="home-chart-key">
									<span
										className="admin-home-chart-swatch"
										aria-hidden="true"
									/>
										{pending ? "Annunci" : chart.metric === "users" ? "Registrazioni" : "Annunci creati"}
									</span>
									<span className="ms-2 flex gap-1">
										{action}
										<Button
											variant="outline" size="sm" aria-label="Separa grafico per categoria"
											aria-pressed={separated} disabled={!canSplit} onClick={onSplit}>
											{separated ?
											<ChartNoAxesCombinedIcon data-icon="inline-start" aria-hidden="true"/> :
											<TrendingUpIcon data-icon="inline-start" aria-hidden="true"/>}
											{separated ? "Separata" : "Totale"}
										</Button>
									</span>
							</div>
						</div>
						<CardDescription>{period ? `${monthLabel(period.range.from)} – ${monthLabel(period.range.to)}${period.partial ? " (* = Periodo parziale)" : ""}` : "Coda attuale · Tempo trascorso dalla creazione"}</CardDescription>
					</CardHeader>
					<CardContent className="admin-home-chart-body"><PrimaryChart rows={rows} pending={pending}
					                                                             categories={categories}/>
						{separated &&
                            <ul className="home-chart-legend" aria-label="Legenda categorie">{categories.map(c => <li
								key={c.key}><span className="admin-home-chart-swatch" style={{backgroundColor: c.fill}}
							                      aria-hidden="true"/>{c.label}</li>)}</ul>}
						{!canSplit &&
                            <p className="home-muted">La vista separata richiede l’aggiornamento degli aggregati.</p>}
						{separated && chart.metric === "users" &&
                            <p className="home-muted">Ogni utente è classificato secondo la tipologia principale attuale
                                del profilo.</p>}
						{!pending && primary.every(row => row.count === 0) &&
                            <p className="home-muted">Nessun evento nel periodo rappresentato.</p>}
						<ChartDataTable title={primaryTitle} rows={rows} categories={categories}/>
					</CardContent>
				</Card>
				<div className="home-insights" data-temporal={!!period}>
					<Card className="home-breakdown" role="region" aria-label={distributionTitle}><CardHeader>
						<CardTitle><h3>{distributionTitle}</h3></CardTitle>
						<CardDescription>Situazione attuale ·
							Totale {chart.metric === "users" ? "profili" : "annunci"}: {homeCount(chart.distributionTotal)}.</CardDescription>
					</CardHeader><CardContent className="admin-home-chart-body">
						{chart.distributionTotal === 0 ? <EmptyState title="Nessun dato nella distribuzione"
						                                             description="Non ci sono categorie da rappresentare."/> :
							<DistributionChart rows={distribution}/>}
						<ChartDataTable title={distributionTitle} rows={distribution}/>
					</CardContent></Card>
					{period && <>
                        <Card className="home-insight"><CardHeader><CardTitle>
                            <h3>{chart.metric === "users" ? "Nuove registrazioni" : "Nuovi annunci"}</h3>
                        </CardTitle><CardDescription>Nel periodo selezionato
                            ({period.monthly.length} {period.monthly.length === 1 ? "mese" : "mesi"})</CardDescription></CardHeader>
                            <CardContent><p className="home-insight-value">{homeCount(period.total)}</p><Sparkline
                                rows={period.monthly}/>
                            </CardContent>
                        </Card>
                        <Card className="home-insight"><CardHeader><CardTitle><h3>Variazione mensile</h3>
                        </CardTitle><CardDescription>Ultimi due mesi completi selezionati</CardDescription></CardHeader>
                            <CardContent>{change ? <>
								<p className="home-insight-value home-trend" data-tone={tone}><Trend
									aria-hidden="true"/>{new Intl.NumberFormat("it-IT", {maximumFractionDigits: 1}).format(Math.abs(change.percent))}%
								</p>
								<p className="home-trend"
								   data-tone={tone}>{change.difference > 0 ? "+" : ""}{homeCount(change.difference)} {chart.metric === "users" ? "registrazioni" : "annunci"}</p>
								<Sparkline rows={[period.previous!, period.latest!]} tone={tone}/>
								<p className="home-muted">{monthLabel(period.latest!.month)} rispetto
									a {monthLabel(period.previous!.month)}</p>
							</> : <><p className="home-insight-unavailable">Non confrontabile</p><p
								className="home-muted">Servono due mesi completi e un valore precedente maggiore di
								zero.</p></>}
                            </CardContent>
                        </Card>
                    </>}
				</div>
			</>}
	</div>;
}
