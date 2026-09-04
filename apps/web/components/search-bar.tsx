import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

interface SearchBarProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <Field>
      <ButtonGroup>
        <Input 
          id="input-button-group" 
          placeholder="Type to search..." 
          value={value}
          onChange={onChange}
        />
        <Button variant="outline">Search</Button>
      </ButtonGroup>
    </Field>
  )
}