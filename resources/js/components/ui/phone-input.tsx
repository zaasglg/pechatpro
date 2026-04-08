import { IMaskInput, type IMaskInputProps } from 'react-imask';
import { cn } from '@/lib/utils';
import { inputStyles } from '@/components/ui/input';

type PhoneInputProps = Omit<IMaskInputProps<HTMLInputElement>, 'mask'>;
const MaskedPhoneInput = IMaskInput as React.ComponentType<
    PhoneInputProps & { mask: string }
>;

function PhoneInput({ className, ...props }: PhoneInputProps) {
    return (
        <MaskedPhoneInput
            {...props}
            mask="+{7} 000 000 00 00"
            type="tel"
            inputMode="tel"
            data-slot="input"
            className={cn(inputStyles, className)}
        />
    );
}

export { PhoneInput };
