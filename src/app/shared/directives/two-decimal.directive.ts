import { Directive, ElementRef, HostListener, inject } from '@angular/core';
import { NgControl } from '@angular/forms';

/**
 * Directive that limits numeric input to a maximum of 2 decimal places.
 * Useful for interest rate fields where values like 5.25% are valid but 5.2567% is not.
 *
 * Usage: <input type="number" appTwoDecimal formControlName="interestRate">
 */
@Directive({
  selector: '[appTwoDecimal]',
  standalone: true
})
export class TwoDecimalDirective {
  private el = inject(ElementRef);
  private ngControl = inject(NgControl, { optional: true });

  // Regex to match valid numbers with up to 2 decimal places
  private regex = /^-?\d*\.?\d{0,2}$/;

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Allow control keys
    if (
      event.key === 'Backspace' ||
      event.key === 'Delete' ||
      event.key === 'Tab' ||
      event.key === 'Escape' ||
      event.key === 'Enter' ||
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight' ||
      event.key === 'ArrowUp' ||
      event.key === 'ArrowDown' ||
      event.key === 'Home' ||
      event.key === 'End' ||
      (event.key === 'a' && (event.ctrlKey || event.metaKey)) ||
      (event.key === 'c' && (event.ctrlKey || event.metaKey)) ||
      (event.key === 'v' && (event.ctrlKey || event.metaKey)) ||
      (event.key === 'x' && (event.ctrlKey || event.metaKey))
    ) {
      return;
    }

    const input = this.el.nativeElement as HTMLInputElement;
    const currentValue = input.value;
    const cursorPos = input.selectionStart ?? currentValue.length;
    const selectionEnd = input.selectionEnd ?? cursorPos;

    // Build the prospective new value
    const beforeCursor = currentValue.substring(0, cursorPos);
    const afterCursor = currentValue.substring(selectionEnd);
    const newValue = beforeCursor + event.key + afterCursor;

    // Check if new value would be valid
    if (!this.regex.test(newValue) && newValue !== '-' && newValue !== '.') {
      event.preventDefault();
    }
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    const pastedText = event.clipboardData?.getData('text') ?? '';
    const input = this.el.nativeElement as HTMLInputElement;
    const currentValue = input.value;
    const cursorPos = input.selectionStart ?? currentValue.length;
    const selectionEnd = input.selectionEnd ?? cursorPos;

    // Build the prospective new value
    const beforeCursor = currentValue.substring(0, cursorPos);
    const afterCursor = currentValue.substring(selectionEnd);
    const newValue = beforeCursor + pastedText + afterCursor;

    // If the pasted content would result in an invalid value, prevent it
    if (!this.regex.test(newValue)) {
      event.preventDefault();

      // Try to clean and paste a valid value
      const cleaned = this.cleanValue(pastedText);
      if (cleaned && this.regex.test(beforeCursor + cleaned + afterCursor)) {
        // Use execCommand for better compatibility with form controls
        document.execCommand('insertText', false, cleaned);
      }
    }
  }

  @HostListener('blur')
  onBlur(): void {
    const input = this.el.nativeElement as HTMLInputElement;
    const value = input.value;

    if (value === '' || value === '-') {
      return;
    }

    // Parse and format to max 2 decimal places
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      // Round to 2 decimal places and use toFixed to avoid floating-point artifacts
      const rounded = Math.round(numValue * 100) / 100;
      const formatted = rounded.toFixed(2);

      if (formatted !== value) {
        input.value = formatted;
        // Update the form control if available
        this.ngControl?.control?.setValue(parseFloat(formatted), { emitEvent: true });
      }
    }
  }

  /**
   * Clean a string to be a valid 2-decimal number
   */
  private cleanValue(value: string): string {
    // Remove any non-numeric characters except . and -
    let cleaned = value.replace(/[^\d.-]/g, '');

    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }

    // Limit decimal places to 2
    if (parts.length === 2 && parts[1].length > 2) {
      cleaned = parts[0] + '.' + parts[1].substring(0, 2);
    }

    return cleaned;
  }
}
