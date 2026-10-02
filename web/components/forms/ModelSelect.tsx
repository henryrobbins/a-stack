'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MODELS } from '@/lib/models';

interface ModelSelectProps {
  value: string;
  onChange: (model: string) => void;
  name?: string;
  id?: string;
}

function ModelSelect({ value, onChange, name, id }: ModelSelectProps) {
  return (
    <Select value={value} onValueChange={onChange} name={name}>
      <SelectTrigger id={id} aria-label="Model" className="font-mono text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {MODELS.map((model) => (
          <SelectItem
            key={model.id}
            value={model.id}
            className="font-mono text-xs"
          >
            {model.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default ModelSelect;
