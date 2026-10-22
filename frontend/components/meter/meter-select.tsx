import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { METERS, type Meter } from '@/lib/meters';
import { cn } from '@/lib/utils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function MeterSelect({
  value,
  onChange,
  className,
}: {
  value: Meter;
  onChange: (meter: Meter) => void;
  className?: string;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Select
      value={{ value: value.id, label: value.name }}
      onValueChange={(option) => {
        const meter = METERS.find((m) => m.id === option?.value);
        if (meter) onChange(meter);
      }}>
      <SelectTrigger className={cn('h-11 sm:h-10', className)}>
        <SelectValue placeholder="Alege contorul" className="text-base" />
      </SelectTrigger>
      <SelectContent
        insets={{ top: insets.top, bottom: insets.bottom, left: 16, right: 16 }}
        className="w-[260px] web:max-h-96">
        <SelectGroup>
          <SelectLabel>Contoare</SelectLabel>
          {METERS.map((m) => (
            <SelectItem key={m.id} value={m.id} label={m.name} />
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
