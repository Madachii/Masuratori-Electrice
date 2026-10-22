import { Reading } from '@/components/meter/reading';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ERROR_LABEL, LABEL, hex } from '@/lib/format';
import { REGISTERS, type Snapshot } from '@/lib/measurements';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

const COLS = {
  label: 'min-w-[220px] flex-1',
  address: 'w-[80px]',
  raw: 'w-[150px]',
  value: 'w-[140px]',
  state: 'w-[170px]',
};

/** Every register with the raw integer, the scaled value and the validation result. */
export function RegisterTable({ snapshot }: { snapshot: Snapshot }) {
  const [onlyErrors, setOnlyErrors] = React.useState(false);
  const errors = REGISTERS.filter((d) => snapshot[d.id] && !snapshot[d.id]!.valid).length;
  const rows = onlyErrors ? REGISTERS.filter((d) => snapshot[d.id] && !snapshot[d.id]!.valid) : REGISTERS;

  return (
    <View className="gap-3">
      <View className="flex-row gap-2">
        <Button size="sm" variant={onlyErrors ? 'outline' : 'secondary'} onPress={() => setOnlyErrors(false)}>
          <Text>Toate ({REGISTERS.length})</Text>
        </Button>
        <Button size="sm" variant={onlyErrors ? 'secondary' : 'outline'} onPress={() => setOnlyErrors(true)}>
          <Text>Erori ({errors})</Text>
        </Button>
      </View>

      <ScrollView horizontal className="rounded-xl border border-border bg-card" contentContainerClassName="grow">
        <View className="grow">
          <View className="flex-row border-b border-border bg-muted px-4 py-2.5">
            <HeaderCell className={COLS.label}>Mărime</HeaderCell>
            <HeaderCell className={COLS.address}>Adresă</HeaderCell>
            <HeaderCell className={COLS.raw}>Raw</HeaderCell>
            <HeaderCell className={COLS.value}>Valoare</HeaderCell>
            <HeaderCell className={COLS.state}>Validare</HeaderCell>
          </View>
          {rows.map((def, i) => {
            const m = snapshot[def.id];
            return (
              <View
                key={def.id}
                className={cn('flex-row items-center px-4 py-2.5', i < rows.length - 1 && 'border-b border-border')}>
                <View className={COLS.label}>
                  <Text className="text-sm">{LABEL[def.id]}</Text>
                  <Text className="font-mono text-[10px] text-muted-foreground">
                    {def.id} · {def.unit || '—'}
                  </Text>
                </View>
                <Text className={cn('font-mono text-xs text-muted-foreground', COLS.address)}>{hex(def.address)}</Text>
                <Text className={cn('font-mono text-xs', COLS.raw)}>{m ? String(m.raw) : '—'}</Text>
                <Reading m={m} size="sm" className={COLS.value} />
                <View className={cn('flex-row items-center gap-2', COLS.state)}>
                  <View className={cn('size-2 rounded-full', !m ? 'bg-muted-foreground' : m.valid ? 'bg-ok' : 'bg-destructive')} />
                  <Text className={cn('text-xs', m && !m.valid ? 'text-destructive' : 'text-muted-foreground')}>
                    {!m ? 'necitit' : m.valid ? 'valid' : ERROR_LABEL[m.error!]}
                  </Text>
                </View>
              </View>
            );
          })}
          {rows.length === 0 ? (
            <Text className="px-4 py-6 text-sm text-muted-foreground">Nicio eroare în ultima citire.</Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function HeaderCell({ className, children }: { className: string; children: string }) {
  return (
    <Text className={cn('font-display text-[11px] uppercase tracking-[1.5px] text-muted-foreground', className)}>
      {children}
    </Text>
  );
}
