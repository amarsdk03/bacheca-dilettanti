"use client";

import {CalendarDays, ChevronDown} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Field, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger} from "@/components/ui/popover";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group";
import {monthLabel} from "../chart-presentation";
import {
	type HomeAggregation,
	type HomeRange,
	type MonthlyHomeChart,
	recentHomeRange,
	resolveHomeRange
} from "../period";

export function HomePeriodControls({ chart, range, aggregation, onRange, onAggregation }: {
  chart: MonthlyHomeChart | null; range: HomeRange | null; aggregation: HomeAggregation;
  onRange(value: HomeRange): void; onAggregation(value: HomeAggregation): void;
}) {
  const effective = chart ? resolveHomeRange(chart, range) : null;
  return <div className="home-period-controls" aria-label="Filtri della serie temporale">
    <Popover>
      <PopoverTrigger render={<Button variant="outline" disabled={!chart} className="home-period-trigger" />}>
        <CalendarDays data-icon="inline-start" aria-hidden="true" />
        {effective ? `${monthLabel(effective.from)} – ${monthLabel(effective.to)}` : "Ultimi 12 mesi"}
        <ChevronDown data-icon="inline-end" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" className="home-period-popover">
        <PopoverHeader><PopoverTitle>Periodo del grafico</PopoverTitle></PopoverHeader>
        {chart && effective && <>
          <ToggleGroup multiple={false} spacing={1} variant="outline" aria-label="Periodi rapidi"
            value={[3, 6, 12].filter(n => { const r = recentHomeRange(chart, n); return r.from === effective.from && r.to === effective.to; }).map(String)}
            onValueChange={values => { if (values.length) onRange(recentHomeRange(chart, Number(values[0]))); }}>
            {[3, 6, 12].map(n => <ToggleGroupItem key={n} value={String(n)}>{n} mesi</ToggleGroupItem>)}
          </ToggleGroup>
          <FieldGroup className="home-period-fields">
            {(["from", "to"] as const).map(edge => <Field key={edge}>
              <FieldLabel htmlFor={`home-period-${edge}`}>{edge === "from" ? "Dal mese" : "Al mese"}</FieldLabel>
              <Select value={effective[edge]} onValueChange={value => { if (value) onRange({ ...effective, [edge]: value }); }}
                items={chart.series.map(row => ({ value: row.month, label: monthLabel(row.month) }))}>
                <SelectTrigger id={`home-period-${edge}`}><SelectValue /></SelectTrigger>
                <SelectContent alignItemWithTrigger={false}><SelectGroup>
                  {chart.series.map(row => <SelectItem key={row.month} value={row.month}
                    disabled={edge === "from" ? row.month > effective.to : row.month < effective.from}>{monthLabel(row.month)}</SelectItem>)}
                </SelectGroup></SelectContent>
              </Select>
            </Field>)}
          </FieldGroup>
          <p className="home-muted">Sono disponibili gli ultimi dodici mesi. Il mese corrente è parziale.</p>
        </>}
      </PopoverContent>
    </Popover>
    <ToggleGroup className="home-aggregation" multiple={false} spacing={0} value={[aggregation]} disabled={!chart}
      aria-label="Aggregazione del grafico" onValueChange={values => { if (values.length) onAggregation(values[0] as HomeAggregation); }}>
      <ToggleGroupItem value="monthly">Mensile</ToggleGroupItem>
      <ToggleGroupItem value="quarterly">Trimestrale</ToggleGroupItem>
      <ToggleGroupItem value="yearly">Annuale</ToggleGroupItem>
    </ToggleGroup>
  </div>;
}
